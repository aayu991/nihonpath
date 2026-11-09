begin;
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 display_name text not null check (char_length(display_name) between 1 and 60),
 preferred_language text not null default 'en' check(preferred_language in ('en','ja')),
 learning_goal text not null default 'jlpt' check(learning_goal in ('jlpt','business','conversation','study','work','travel')),
 jlpt_target text not null default 'n5' check(jlpt_target in ('n5','n4','n3','n2','n1')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
-- Membership is maintained only by the project owner via SQL, never user metadata.
create table private.admin_users(user_id uuid primary key references auth.users(id) on delete cascade);
create function public.is_admin() returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from private.admin_users where user_id=(select auth.uid()))$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon,authenticated;
create function private.touch_updated_at() returns trigger language plpgsql set search_path='' as $$begin new.updated_at=now();return new;end$$;
create function private.create_profile() returns trigger language plpgsql security definer set search_path='' as $$begin
 insert into public.profiles(id,display_name,preferred_language,learning_goal,jlpt_target) values(new.id,left(coalesce(nullif(trim(new.raw_user_meta_data->>'display_name'),''),'Learner'),60),case when new.raw_user_meta_data->>'preferred_language'='ja' then 'ja' else 'en' end,case when new.raw_user_meta_data->>'learning_goal' in ('jlpt','business','conversation','study','work','travel') then new.raw_user_meta_data->>'learning_goal' else 'jlpt' end,case when new.raw_user_meta_data->>'jlpt_target' in ('n5','n4','n3','n2','n1') then new.raw_user_meta_data->>'jlpt_target' else 'n5' end);
 return new;end$$;
create trigger create_user_profile after insert on auth.users for each row execute function private.create_profile();
create table public.courses(id uuid primary key default gen_random_uuid(),slug text unique not null check(slug in ('n5','n4','n3','n2','n1')),title text not null,published boolean not null default false,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table public.lessons(id uuid primary key default gen_random_uuid(),course_id uuid not null references public.courses(id) on delete cascade,slug text not null,title text not null,body jsonb not null default '{}',position integer not null check(position>=0),published boolean not null default false,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(course_id,slug),unique(course_id,position));
create table public.lesson_progress(user_id uuid not null references auth.users(id) on delete cascade,lesson_id uuid not null references public.lessons(id) on delete cascade,completed_at timestamptz,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),primary key(user_id,lesson_id));
create table public.flashcard_decks(id uuid primary key default gen_random_uuid(),course_id uuid not null references public.courses(id) on delete cascade,title text not null,published boolean not null default false,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table public.flashcards(id uuid primary key default gen_random_uuid(),deck_id uuid not null references public.flashcard_decks(id) on delete cascade,term text not null,reading text not null,translations jsonb not null check(jsonb_typeof(translations)='object'),example text not null,example_translation text not null,position integer not null check(position>=0),created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(deck_id,position));
create table public.flashcard_reviews(id uuid primary key,user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,flashcard_id uuid not null references public.flashcards(id) on delete cascade,rating text not null check(rating in ('known','again')),created_at timestamptz not null default now());
create table public.question_banks(id uuid primary key default gen_random_uuid(),course_id uuid not null references public.courses(id) on delete cascade,title text not null,published boolean not null default false,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table public.questions(id uuid primary key default gen_random_uuid(),bank_id uuid not null references public.question_banks(id) on delete cascade,prompt text not null,position integer not null check(position>=0),created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(bank_id,position));
create table public.question_options(id uuid primary key default gen_random_uuid(),question_id uuid not null references public.questions(id) on delete cascade,text text not null,position integer not null check(position between 0 and 3),created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(question_id,position),unique(question_id,id));
create table private.answer_keys(question_id uuid primary key references public.questions(id) on delete cascade,option_id uuid not null,explanation text not null,japanese_explanation text not null,translation text not null,foreign key(question_id,option_id) references public.question_options(question_id,id) on delete cascade);
create table public.quiz_attempts(id uuid primary key,user_id uuid not null references auth.users(id) on delete cascade,bank_id uuid not null references public.question_banks(id) on delete restrict,score integer not null,total integer not null check(total>0),created_at timestamptz not null default now(),check(score between 0 and total),unique(id,user_id));
create table public.quiz_answers(attempt_id uuid not null,user_id uuid not null,question_id uuid not null references public.questions(id) on delete restrict,option_id uuid not null,correct boolean not null,created_at timestamptz not null default now(),primary key(attempt_id,question_id),foreign key(attempt_id,user_id) references public.quiz_attempts(id,user_id) on delete cascade,foreign key(question_id,option_id) references public.question_options(question_id,id) on delete restrict);
create index lessons_course on public.lessons(course_id);
create index progress_lesson on public.lesson_progress(lesson_id);
create index decks_course on public.flashcard_decks(course_id);
create index cards_deck on public.flashcards(deck_id);
create index reviews_owner_time on public.flashcard_reviews(user_id,created_at desc);
create index reviews_card on public.flashcard_reviews(flashcard_id);
create index banks_course on public.question_banks(course_id);
create index questions_bank on public.questions(bank_id);
create index attempts_owner_time on public.quiz_attempts(user_id,created_at desc);
create index attempts_bank on public.quiz_attempts(bank_id);
create index answers_user on public.quiz_answers(user_id);
create index answers_option on public.quiz_answers(option_id);
create index answers_question_option on public.quiz_answers(question_id,option_id);

do $$declare t text;begin
 foreach t in array array['profiles','courses','lessons','lesson_progress','flashcard_decks','flashcards','question_banks','questions','question_options'] loop execute format('create trigger touch_updated before update on public.%I for each row execute function private.touch_updated_at()',t);end loop;
 foreach t in array array['profiles','courses','lessons','lesson_progress','flashcard_decks','flashcards','flashcard_reviews','question_banks','questions','question_options','quiz_attempts','quiz_answers'] loop
 execute format('alter table public.%I enable row level security',t);execute format('revoke all on public.%I from anon,authenticated',t);end loop;
end$$;
grant usage on schema public to anon,authenticated;
grant select on public.courses,public.lessons,public.flashcard_decks,public.flashcards,public.question_banks,public.questions,public.question_options to anon,authenticated;
grant select on public.profiles,public.lesson_progress,public.flashcard_reviews,public.quiz_attempts,public.quiz_answers to authenticated;
grant update(display_name,preferred_language,learning_goal,jlpt_target) on public.profiles to authenticated;
grant insert,update on public.lesson_progress to authenticated;
grant insert on public.flashcard_reviews to authenticated;
-- Content writes require BOTH an authenticated admin membership and an RLS policy.
grant insert,update,delete on public.courses,public.lessons,public.flashcard_decks,public.flashcards,public.question_banks,public.questions,public.question_options to authenticated;
create policy profiles_read on public.profiles for select to authenticated using(id=(select auth.uid()));
create policy profiles_edit on public.profiles for update to authenticated using(id=(select auth.uid())) with check(id=(select auth.uid()));
create policy course_public on public.courses for select using(published or (select public.is_admin()));
create policy lesson_public on public.lessons for select using((published and exists(select 1 from public.courses c where c.id=course_id and c.published)) or (select public.is_admin()));
create policy deck_public on public.flashcard_decks for select using((published and exists(select 1 from public.courses c where c.id=course_id and c.published)) or (select public.is_admin()));
create policy card_public on public.flashcards for select using(exists(select 1 from public.flashcard_decks d where d.id=deck_id and d.published) or (select public.is_admin()));
create policy bank_public on public.question_banks for select using((published and exists(select 1 from public.courses c where c.id=course_id and c.published)) or (select public.is_admin()));
create policy question_public on public.questions for select using(exists(select 1 from public.question_banks b where b.id=bank_id and b.published) or (select public.is_admin()));
create policy option_public on public.question_options for select using(exists(select 1 from public.questions q where q.id=question_id) or (select public.is_admin()));
create policy progress_read on public.lesson_progress for select to authenticated using(user_id=(select auth.uid()));
create policy progress_insert on public.lesson_progress for insert to authenticated with check(user_id=(select auth.uid()) and exists(select 1 from public.lessons l where l.id=lesson_id and l.published));
create policy progress_update on public.lesson_progress for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()) and exists(select 1 from public.lessons l where l.id=lesson_id and l.published));
create policy reviews_read on public.flashcard_reviews for select to authenticated using(user_id=(select auth.uid()));
create policy reviews_insert on public.flashcard_reviews for insert to authenticated with check(user_id=(select auth.uid()) and exists(select 1 from public.flashcards f where f.id=flashcard_id));
create policy attempts_read on public.quiz_attempts for select to authenticated using(user_id=(select auth.uid()));
create policy answers_read on public.quiz_answers for select to authenticated using(user_id=(select auth.uid()));
do $$declare t text;begin foreach t in array array['courses','lessons','flashcard_decks','flashcards','question_banks','questions','question_options'] loop execute format('create policy admin_write on public.%I for all to authenticated using((select public.is_admin())) with check((select public.is_admin()))',t);end loop;end$$;
-- Idempotent inserts under the caller's RLS; a collision owned by someone else fails.
create function public.record_review(p_id uuid,p_card uuid,p_rating text) returns uuid language plpgsql security invoker set search_path='' as $$declare owner_id uuid:=auth.uid();existing public.flashcard_reviews;begin
 if owner_id is null then raise exception 'Authentication required';end if;
 insert into public.flashcard_reviews(id,user_id,flashcard_id,rating) values(p_id,owner_id,p_card,p_rating) on conflict(id) do nothing;
 select * into existing from public.flashcard_reviews where id=p_id and user_id=owner_id;
 if not found or existing.flashcard_id<>p_card or existing.rating<>p_rating then raise exception 'Review conflict';end if;
 return p_id;end$$;
revoke all on function public.record_review(uuid,uuid,text) from public;
grant execute on function public.record_review(uuid,uuid,text) to authenticated;
-- Score on the database, not from a client-supplied score or correct flag.
create function public.submit_quiz(p_id uuid,p_bank uuid,p_answers jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare owner_id uuid:=auth.uid();n integer;s integer;result jsonb;existing public.quiz_attempts;
begin
 if owner_id is null then raise exception 'Authentication required';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_id::text,0));
 select * into existing from public.quiz_attempts where id=p_id;
 if found and (existing.user_id<>owner_id or existing.bank_id<>p_bank) then raise exception 'Attempt conflict';end if;
 if not exists(select 1 from public.question_banks b join public.courses c on c.id=b.course_id where b.id=p_bank and b.published and c.published) then raise exception 'Quiz unavailable';end if;
 select count(*) into n from public.questions where bank_id=p_bank;
 if n=0 or jsonb_typeof(p_answers)<>'array' or jsonb_array_length(p_answers)<>n then raise exception 'Answer every question';end if;
 if (select count(distinct a->>'questionId') from jsonb_array_elements(p_answers) a)<>n then raise exception 'Duplicate questions';end if;
 if (select count(*) from jsonb_array_elements(p_answers) a join public.questions q on q.id=(a->>'questionId')::uuid and q.bank_id=p_bank join public.question_options o on o.id=(a->>'optionId')::uuid and o.question_id=q.id join private.answer_keys k on k.question_id=q.id)<>n then raise exception 'Invalid answers';end if;
 if existing.id is null then
 select count(*) into s from jsonb_array_elements(p_answers) a join private.answer_keys k on k.question_id=(a->>'questionId')::uuid and k.option_id=(a->>'optionId')::uuid;
 insert into public.quiz_attempts(id,user_id,bank_id,score,total) values(p_id,owner_id,p_bank,s,n);
 insert into public.quiz_answers(attempt_id,user_id,question_id,option_id,correct) select p_id,owner_id,(a->>'questionId')::uuid,(a->>'optionId')::uuid,k.option_id=(a->>'optionId')::uuid from jsonb_array_elements(p_answers) a join private.answer_keys k on k.question_id=(a->>'questionId')::uuid;
 else
 if exists(select 1 from jsonb_array_elements(p_answers) a join public.quiz_answers qa on qa.attempt_id=p_id and qa.question_id=(a->>'questionId')::uuid where qa.option_id<>(a->>'optionId')::uuid) then raise exception 'Attempt already submitted';end if;
 s:=existing.score;
 end if;
 select jsonb_agg(jsonb_build_object('questionId',qa.question_id,'selectedOptionId',qa.option_id,'correctOptionId',k.option_id,'correct',qa.correct,'explanation',k.explanation,'japaneseExplanation',k.japanese_explanation,'translation',k.translation) order by q.position) into result from public.quiz_answers qa join private.answer_keys k on k.question_id=qa.question_id join public.questions q on q.id=qa.question_id where qa.attempt_id=p_id and qa.user_id=owner_id;
 return jsonb_build_object('attemptId',p_id,'score',s,'total',n,'answers',result,'saved',true);
end$$;
revoke all on function public.submit_quiz(uuid,uuid,jsonb) from public;
grant execute on function public.submit_quiz(uuid,uuid,jsonb) to authenticated;
revoke all on all functions in schema private from public,anon,authenticated;
commit;