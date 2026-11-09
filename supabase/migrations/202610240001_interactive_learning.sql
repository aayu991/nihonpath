begin;
alter table public.lessons add column subject text not null default 'vocabulary' check(subject in ('vocabulary','kanji','grammar','reading','listening'));
alter table public.flashcards add column category text not null default 'General';
alter table public.question_banks add column subject text not null default 'grammar' check(subject in ('vocabulary','kanji','grammar','reading','listening'));
create index lessons_course_subject on public.lessons(course_id,subject,position);
create table public.course_enrollments(user_id uuid not null references auth.users(id) on delete cascade,course_id uuid not null references public.courses(id) on delete cascade,created_at timestamptz not null default now(),primary key(user_id,course_id));
create table public.flashcard_schedule(user_id uuid not null references auth.users(id) on delete cascade,flashcard_id uuid not null references public.flashcards(id) on delete cascade,streak integer not null default 0 check(streak>=0),interval_days integer not null default 1 check(interval_days between 1 and 30),due_at timestamptz not null,last_reviewed_at timestamptz not null,primary key(user_id,flashcard_id));
create table public.vocabulary(id uuid primary key default gen_random_uuid(),course_id uuid not null references public.courses(id) on delete cascade,term text not null,reading text not null,meaning_en text not null,meaning_ja text not null,example text not null,example_translation text not null,category text not null default 'General',published boolean not null default false,review_status text not null default 'draft' check(review_status in ('draft','in_review','approved')),created_at timestamptz not null default now(),updated_at timestamptz not null default now());
alter table public.flashcards add column vocabulary_id uuid references public.vocabulary(id) on delete set null;
create index flashcards_vocabulary on public.flashcards(vocabulary_id);
create index vocabulary_course on public.vocabulary(course_id);
create index enrollments_course on public.course_enrollments(course_id);
create index schedule_due on public.flashcard_schedule(user_id,due_at);
alter table public.course_enrollments enable row level security;
alter table public.flashcard_schedule enable row level security;
alter table public.vocabulary enable row level security;
grant select,insert on public.course_enrollments to authenticated;
grant select on public.flashcard_schedule to authenticated;
grant select on public.vocabulary to anon,authenticated;
grant insert,update,delete on public.vocabulary to authenticated;
create policy enrollment_read on public.course_enrollments for select to authenticated using(user_id=(select auth.uid()));
create policy enrollment_insert on public.course_enrollments for insert to authenticated with check(user_id=(select auth.uid()) and exists(select 1 from public.courses c where c.id=course_id and c.published));
create policy schedule_read on public.flashcard_schedule for select to authenticated using(user_id=(select auth.uid()) and exists(select 1 from public.flashcards c where c.id=flashcard_id));
create policy vocabulary_read on public.vocabulary for select using((published and exists(select 1 from public.courses c where c.id=course_id and c.published)) or (select public.is_admin()));
create policy vocabulary_admin on public.vocabulary for all to authenticated using((select public.is_admin())) with check((select public.is_admin()));
create trigger a_review_guard before insert or update on public.vocabulary for each row execute function private.guard_content_review();
create trigger review_audit after insert or update on public.vocabulary for each row execute function private.log_content_review();
-- Review dates are derived on INSERT only, so idempotent retries never advance a schedule.
-- Prototype: Again -> tomorrow, streak 0. Known -> 1,2,4,8,16,30 days.
create function private.schedule_review() returns trigger language plpgsql security definer set search_path='' as $$declare s integer;days integer;begin
 insert into public.flashcard_schedule(user_id,flashcard_id,streak,interval_days,due_at,last_reviewed_at) values(new.user_id,new.flashcard_id,case when new.rating='known' then 1 else 0 end,1,new.created_at+interval '1 day',new.created_at)
 on conflict(user_id,flashcard_id) do update set streak=case when new.rating='known' then public.flashcard_schedule.streak+1 else 0 end,interval_days=case when new.rating='known' then least(30,power(2,least(public.flashcard_schedule.streak,5))::integer) else 1 end,due_at=new.created_at+make_interval(days=>case when new.rating='known' then least(30,power(2,least(public.flashcard_schedule.streak,5))::integer) else 1 end),last_reviewed_at=new.created_at;
 return new;end$$;
create trigger schedule_review after insert on public.flashcard_reviews for each row execute function private.schedule_review();
-- Clients use record_review; direct timestamp-controlled inserts cannot backdate a schedule.
revoke insert on public.flashcard_reviews from authenticated;
create or replace function public.record_review(p_id uuid,p_card uuid,p_rating text) returns uuid language plpgsql security definer set search_path='' as $$declare owner_id uuid:=auth.uid();existing public.flashcard_reviews;begin
 if owner_id is null then raise exception 'Authentication required';end if;
 if p_rating not in ('known','again') or p_rating is null then raise exception 'Invalid rating';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_id::text,0));
 if not exists(select 1 from public.flashcards f join public.flashcard_decks d on d.id=f.deck_id where f.id=p_card and d.published and private.content_visible('course',d.course_id)) then raise exception 'Card unavailable';end if;
 insert into public.flashcard_reviews(id,user_id,flashcard_id,rating) values(p_id,owner_id,p_card,p_rating) on conflict(id) do nothing;
 select * into existing from public.flashcard_reviews where id=p_id and user_id=owner_id;
 if not found or existing.flashcard_id<>p_card or existing.rating<>p_rating then raise exception 'Review conflict';end if;
 return p_id;end$$;
-- Stateless guest grading: no score/answer key is accepted from the browser, no writes.
create function public.practice_quiz(p_bank uuid,p_answers jsonb) returns jsonb language plpgsql security definer set search_path='' as $$declare n integer;score integer;answers jsonb;begin
 if not exists(select 1 from public.question_banks b where b.id=p_bank and b.published and private.content_visible('course',b.course_id)) then raise exception 'Quiz unavailable';end if;
 select count(*) into n from public.questions where bank_id=p_bank;
 if n not between 1 and 100 or jsonb_typeof(p_answers)<>'array' or jsonb_array_length(p_answers)<>n then raise exception 'Answer every question';end if;
 if (select count(distinct a->>'questionId') from jsonb_array_elements(p_answers) a)<>n then raise exception 'Duplicate questions';end if;
 if (select count(*) from jsonb_array_elements(p_answers) a join public.questions q on q.id=(a->>'questionId')::uuid and q.bank_id=p_bank join public.question_options o on o.id=(a->>'optionId')::uuid and o.question_id=q.id join private.answer_keys k on k.question_id=q.id)<>n then raise exception 'Invalid answers';end if;
 select count(*) filter(where k.option_id=(a->>'optionId')::uuid),jsonb_agg(jsonb_build_object('questionId',q.id,'selectedOptionId',a->>'optionId','correctOptionId',k.option_id,'correct',k.option_id=(a->>'optionId')::uuid,'explanation',k.explanation,'japaneseExplanation',k.japanese_explanation,'translation',k.translation) order by q.position) into score,answers from jsonb_array_elements(p_answers) a join public.questions q on q.id=(a->>'questionId')::uuid join private.answer_keys k on k.question_id=q.id;
 return jsonb_build_object('attemptId',gen_random_uuid(),'score',score,'total',n,'answers',answers,'saved',false);end$$;
revoke all on function public.practice_quiz(uuid,jsonb) from public;
grant execute on function public.practice_quiz(uuid,jsonb) to anon,authenticated;
revoke all on all functions in schema private from public,anon,authenticated;
commit;
