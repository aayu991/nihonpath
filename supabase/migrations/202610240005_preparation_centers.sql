begin;
-- Reuse programs, courses, vocabulary, cards, private keys and learner records.
alter table public.user_learning_goals drop constraint user_learning_goals_goal_check;
alter table public.user_learning_goals add constraint user_learning_goals_goal_check check(goal in ('jlpt','jft','ssw','workplace','student','future_worker','professional','tourist','teacher','organization_admin'));
create or replace function public.set_learning_goals(p_goals text[]) returns void language plpgsql security definer set search_path='' as $$declare uid uuid:=auth.uid();begin
 if uid is null then raise exception 'Authentication required';end if;
 if p_goals is null or cardinality(p_goals) not between 1 and 10 or exists(select 1 from unnest(p_goals) g where g is null or g not in ('jlpt','jft','ssw','workplace','student','future_worker','professional','tourist','teacher','organization_admin')) or (select count(distinct g) from unnest(p_goals) g)<>cardinality(p_goals) then raise exception 'Invalid goals';end if;
 delete from public.user_learning_goals where user_id=uid;insert into public.user_learning_goals(user_id,goal) select uid,g from unnest(p_goals) g;
 update public.profiles set onboarding_completed_at=coalesce(onboarding_completed_at,now()),updated_at=now() where id=uid;end$$;

create table public.industry_sectors(id uuid primary key default gen_random_uuid(),slug text not null unique check(slug~'^[a-z0-9]+(-[a-z0-9]+)*$'),title text not null,title_ja text not null,summary text not null,summary_ja text not null,course_id uuid not null unique references public.courses(id) on delete restrict,review_status text not null default 'draft' check(review_status in ('draft','in_review','approved')),published boolean not null default false check(not published or review_status='approved'),created_at timestamptz not null default now(),updated_at timestamptz not null default now());
alter table public.vocabulary add column sector_id uuid references public.industry_sectors(id) on delete restrict;
alter table public.vocabulary add column topic text not null default 'General';
alter table public.vocabulary add column difficulty text not null default 'basic' check(difficulty in ('basic','intermediate'));
alter table public.question_banks add column prep_category text;
alter table public.question_banks add column prep_mode text check(prep_mode in ('quick','section','scenario','industry'));
create table public.workplace_scenarios(id uuid primary key default gen_random_uuid(),sector_id uuid not null references public.industry_sectors(id),lesson_id uuid not null unique references public.lessons(id),bank_id uuid not null unique references public.question_banks(id),title text not null,situation text not null,situation_ja text not null,dialogue jsonb not null check(jsonb_typeof(dialogue)='array'),review_status text not null default 'draft' check(review_status in ('draft','in_review','approved')),published boolean not null default false check(not published or review_status='approved'),created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table public.interview_questions(id uuid primary key default gen_random_uuid(),sector_id uuid references public.industry_sectors(id),lesson_id uuid not null unique references public.lessons(id),topic text not null,prompt text not null,suggested_answer text not null,translation text not null,explanation text not null,explanation_ja text not null,review_status text not null default 'draft' check(review_status in ('draft','in_review','approved')),published boolean not null default false check(not published or review_status='approved'),created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table public.official_resources(id uuid primary key default gen_random_uuid(),sector_id uuid references public.industry_sectors(id),category text not null check(category in ('jft','ssw')),title text not null,url text not null check(url~'^https://(www\.)?(jpf\.go\.jp|ssw\.go\.jp|prometric-jp\.com|moj\.go\.jp|mhlw\.go\.jp|mofa\.go\.jp)/'),summary text not null,summary_ja text not null,reviewed_at date not null,review_status text not null default 'draft' check(review_status in ('draft','in_review','approved')),published boolean not null default false check(not published or review_status='approved'),created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create index vocabulary_sector on public.vocabulary(sector_id);
create index scenario_sector on public.workplace_scenarios(sector_id);
create index interview_sector on public.interview_questions(sector_id);
create index resources_sector on public.official_resources(sector_id);
do $$declare t text;begin foreach t in array array['industry_sectors','workplace_scenarios','interview_questions','official_resources'] loop
 execute format('alter table public.%I enable row level security',t);execute format('revoke all on public.%I from anon,authenticated',t);execute format('grant select on public.%I to anon,authenticated',t);
 execute format('create trigger a_review_guard before insert or update on public.%I for each row execute function private.guard_content_review()',t);
 execute format('create trigger review_audit after insert or update on public.%I for each row execute function private.log_content_review()',t);
 end loop;end$$;
create policy sector_read on public.industry_sectors for select using((published and exists(select 1 from public.courses c where c.id=course_id and c.published)) or public.is_admin());
create policy scenario_read on public.workplace_scenarios for select using((published and exists(select 1 from public.industry_sectors s where s.id=sector_id and s.published) and exists(select 1 from public.lessons l where l.id=lesson_id and l.published) and exists(select 1 from public.question_banks b where b.id=bank_id and b.published)) or public.is_admin());
create policy interview_read on public.interview_questions for select using((published and exists(select 1 from public.lessons l where l.id=lesson_id and l.published) and (sector_id is null or exists(select 1 from public.industry_sectors s where s.id=sector_id and s.published))) or public.is_admin());
create policy resource_read on public.official_resources for select using(published or public.is_admin());

-- Whitelist-based editorial API. No direct client INSERT/UPDATE grants.
create function private.prep_table(p_kind text) returns text language sql immutable set search_path='' as $$select case p_kind when 'sector' then 'industry_sectors' when 'scenario' then 'workplace_scenarios' when 'interview' then 'interview_questions' when 'resource' then 'official_resources' end$$;
create function public.admin_prep_save(p_kind text,p_id uuid,p_data jsonb,p_expected timestamptz default null) returns uuid language plpgsql security definer set search_path='' as $$declare tbl text:=private.prep_table(p_kind);result uuid:=coalesce(p_id,gen_random_uuid());cols text;version timestamptz;begin
 if not public.is_admin() then raise exception 'Administrator required';end if;
 if tbl is null or jsonb_typeof(p_data)<>'object' or octet_length(p_data::text)>100000 then raise exception 'Invalid document';end if;
 cols:=case p_kind when 'sector' then 'slug,title,title_ja,summary,summary_ja,course_id' when 'scenario' then 'sector_id,lesson_id,bank_id,title,situation,situation_ja,dialogue' when 'interview' then 'sector_id,lesson_id,topic,prompt,suggested_answer,translation,explanation,explanation_ja' when 'resource' then 'sector_id,category,title,url,summary,summary_ja,reviewed_at' end;
 if p_id is not null then execute format('select updated_at from public.%I where id=$1 for update',tbl) into version using p_id;if version is distinct from p_expected or version is null then raise exception 'Stale version';end if;end if;
 if p_id is null then execute format('insert into public.%I(id,%s) select $1,%s from jsonb_populate_record(null::public.%I,$2)',tbl,cols,cols,tbl) using result,p_data;
 else execute format('update public.%I t set (%s)=(select %s from jsonb_populate_record(null::public.%I,$2)),published=false,review_status=''draft'' where id=$1',tbl,cols,cols,tbl) using result,p_data;end if;return result;end$$;
create function public.admin_prep_review(p_kind text,p_id uuid,p_action text,p_expected timestamptz) returns uuid language plpgsql security definer set search_path='' as $$declare tbl text:=private.prep_table(p_kind);doc jsonb;state text;pub boolean;begin
 if not public.is_admin() or tbl is null then raise exception 'Administrator required';end if;
 execute format('select to_jsonb(t) from public.%I t where id=$1 and updated_at=$2 for update',tbl) into doc using p_id,p_expected;if doc is null then raise exception 'Stale version';end if;
 state:=doc->>'review_status';pub:=(doc->>'published')::boolean;
 case p_action when 'review' then if state<>'draft' or pub then raise exception 'Draft required';end if;state:='in_review';
 when 'approve' then if state<>'in_review' or pub then raise exception 'Review required';end if;state:='approved';
 when 'publish' then if state<>'approved' then raise exception 'Approval required';end if;
 if p_kind='sector' and not private.content_visible('course',(doc->>'course_id')::uuid) then raise exception 'Published course required';end if;
 if p_kind='scenario' and (not private.content_visible('lesson',(doc->>'lesson_id')::uuid) or not exists(select 1 from public.industry_sectors s join public.lessons l on l.course_id=s.course_id join public.question_banks b on b.course_id=s.course_id where s.id=(doc->>'sector_id')::uuid and s.published and l.id=(doc->>'lesson_id')::uuid and b.id=(doc->>'bank_id')::uuid and b.published) or jsonb_array_length(doc->'dialogue')<2) then raise exception 'Published matching lesson, sector and bank required';end if;
 if p_kind='interview' and (not private.content_visible('lesson',(doc->>'lesson_id')::uuid) or length(doc->>'suggested_answer')<10 or length(doc->>'explanation')<10 or length(doc->>'explanation_ja')<5) then raise exception 'Complete interview and published lesson required';end if;
 if p_kind='resource' and ((doc->>'reviewed_at')::date>current_date or length(doc->>'summary')<10) then raise exception 'Review date and summary required';end if;pub:=true;
 when 'unpublish' then pub:=false;else raise exception 'Invalid transition';end case;
 execute format('update public.%I set review_status=$1,published=$2 where id=$3',tbl) using state,pub,p_id;return p_id;end$$;
create function public.admin_prep_audit(p_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$begin if not public.is_admin() then raise exception 'Administrator required';end if;return coalesce((select jsonb_agg(to_jsonb(e) order by e.created_at desc) from private.content_review_events e where e.entity_id=p_id),'[]');end$$;

-- Real learner aggregates from existing owner records. No synthetic demo metrics.
create function public.prep_dashboard() returns jsonb language plpgsql stable security definer set search_path='' as $$declare u uuid:=auth.uid();begin if u is null then raise exception 'Authentication required';end if;return jsonb_build_object(
 'courses',coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'slug',c.slug,'title',c.title,'completed',(select count(*) from public.lesson_progress p join public.lessons l on l.id=p.lesson_id where p.user_id=u and p.completed_at is not null and l.course_id=c.id),'reviews',(select count(*) from public.flashcard_reviews r join public.flashcards f on f.id=r.flashcard_id join public.flashcard_decks d on d.id=f.deck_id where r.user_id=u and d.course_id=c.id),'known',(select count(*) from public.flashcard_schedule s join public.flashcards f on f.id=s.flashcard_id join public.flashcard_decks d on d.id=f.deck_id where s.user_id=u and s.streak>0 and d.course_id=c.id),'due',(select count(*) from public.flashcard_schedule s join public.flashcards f on f.id=s.flashcard_id join public.flashcard_decks d on d.id=f.deck_id where s.user_id=u and s.due_at<=now() and d.course_id=c.id))) from public.courses c join public.learning_programs p on p.id=c.program_id where p.category in ('jft-basic','ssw') and private.content_visible('course',c.id)),'[]'),
 'attempts',coalesce((select jsonb_agg(to_jsonb(a)) from (select a.id,a.score,a.total,a.created_at,b.title,b.prep_category,c.slug from public.quiz_attempts a join public.question_banks b on b.id=a.bank_id join public.courses c on c.id=b.course_id join public.learning_programs p on p.id=c.program_id where a.user_id=u and p.category in ('jft-basic','ssw') order by a.created_at desc limit 20) a),'[]'),
 'weak',coalesce((select jsonb_agg(to_jsonb(w)) from (select b.prep_category category,sum(a.score)::int correct,sum(a.total)::int total from public.quiz_attempts a join public.question_banks b on b.id=a.bank_id where a.user_id=u and b.prep_category is not null group by b.prep_category order by sum(a.score)::numeric/nullif(sum(a.total),0) limit 5) w),'[]'),
 'exams',(select count(*) from public.exam_attempts where user_id=u and status='submitted'));end$$;

-- Private listening upload foundation. No fabricated URLs or automatic approval.
alter table public.audio_assets add column storage_path text;
alter table public.audio_assets add column license_note text;
alter table public.audio_assets add column verified_by uuid references auth.users(id);
alter table public.audio_assets add column verified_at timestamptz;
create function public.admin_verify_prep_audio(p_id uuid,p_seconds integer) returns void language plpgsql security definer set search_path='' as $$begin
 if not public.is_admin() then raise exception 'Administrator required';end if;
 if p_seconds is null or p_seconds not between 1 and 1800 then raise exception 'Invalid duration';end if;
 if to_regclass('storage.objects') is null then raise exception 'Private storage unavailable';end if;
 if not exists(select 1 from storage.objects o join public.audio_assets a on a.storage_path=o.name where a.id=p_id and o.bucket_id='prep-audio') then raise exception 'Stored audio object required';end if;
 update public.audio_assets set status='ready',duration_seconds=p_seconds,verified_by=auth.uid(),verified_at=clock_timestamp() where id=p_id and storage_path is not null and length(license_note)>=10;
 if not found then raise exception 'Licensed upload required';end if;
 insert into private.content_review_events(entity_kind,entity_id,actor_id,review_status,published) values('audio_assets',p_id,auth.uid(),'approved',false);end$$;
do $$begin if to_regclass('storage.buckets') is not null then
 if exists(select 1 from storage.buckets where id='prep-audio' and public) then raise exception 'Existing prep-audio bucket must be private before deployment';end if;
 execute $s$insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('prep-audio','prep-audio',false,10485760,array['audio/mpeg','audio/wav','audio/ogg']) on conflict(id) do nothing$s$;
 execute $s$create policy prep_audio_admin on storage.objects for all to authenticated using(bucket_id='prep-audio' and public.is_admin()) with check(bucket_id='prep-audio' and public.is_admin())$s$;
 end if;end$$;
revoke all on function public.admin_prep_save(text,uuid,jsonb,timestamptz),public.admin_prep_review(text,uuid,text,timestamptz),public.admin_prep_audit(uuid),public.prep_dashboard(),public.admin_verify_prep_audio(uuid,integer) from public;
grant execute on function public.admin_prep_save(text,uuid,jsonb,timestamptz),public.admin_prep_review(text,uuid,text,timestamptz),public.admin_prep_audit(uuid),public.prep_dashboard(),public.admin_verify_prep_audio(uuid,integer) to authenticated;
revoke all on all functions in schema private from public,anon,authenticated;
commit;
