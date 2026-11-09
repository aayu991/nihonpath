begin;
-- Exam banks deliberately remain unpublished to legacy practice RPCs. Their
-- individually reviewed questions are delivered only through the exam API.
alter table public.question_banks add column exam_only boolean not null default false;
alter table public.question_banks add constraint exam_bank_is_private check(not exam_only or not published);
alter table public.questions add column exam_metadata jsonb not null default '{}';
alter table public.questions add column exam_status text not null default 'draft' check(exam_status in ('draft','in_review','approved','published','archived'));
alter table public.questions add column related_lesson_id uuid references public.lessons(id) on delete restrict;
alter table public.questions add column related_deck_id uuid references public.flashcard_decks(id) on delete restrict;
alter table public.questions add column audio_asset_id uuid references public.audio_assets(id) on delete restrict;
create table public.question_reviews(id uuid primary key default gen_random_uuid(),question_id uuid not null references public.questions(id),reviewer_id uuid not null references auth.users(id),status text not null,notes text not null,created_at timestamptz not null default now());
create table public.exam_templates(id uuid primary key default gen_random_uuid(),title text not null,level text not null check(level in ('n5','n4','n3','n2','n1')),mode text not null check(mode in ('quick','section','full')),published boolean not null default false,examination_id uuid references public.examinations(id),created_at timestamptz not null default now());
create table public.exam_sections(id uuid primary key default gen_random_uuid(),template_id uuid not null references public.exam_templates(id),bank_id uuid not null references public.question_banks(id),title text not null,position integer not null default 0,question_count integer not null check(question_count between 1 and 100),duration_seconds integer not null check(duration_seconds between 60 and 7200),unique(template_id,position));
create table public.exam_attempts(id uuid primary key,user_id uuid not null references auth.users(id),template_id uuid not null references public.exam_templates(id),title text not null,level text not null,mode text not null,status text not null default 'active' check(status in ('active','submitted')),started_at timestamptz not null default clock_timestamp(),expires_at timestamptz not null,submitted_at timestamptz,unique(id,user_id));
create unique index one_active_exam on public.exam_attempts(user_id) where status='active';
create index exam_history_owner on public.exam_attempts(user_id,started_at desc);
create table public.exam_section_attempts(id uuid primary key default gen_random_uuid(),attempt_id uuid not null references public.exam_attempts(id),section_id uuid not null references public.exam_sections(id),title text not null,position integer not null,unique(attempt_id,section_id));
create table public.exam_responses(attempt_id uuid not null references public.exam_attempts(id),question_id uuid not null references public.questions(id),option_id uuid,flagged boolean not null default false,updated_at timestamptz not null default clock_timestamp(),primary key(attempt_id,question_id));
create table public.exam_results(attempt_id uuid primary key references public.exam_attempts(id),result jsonb not null,created_at timestamptz not null default clock_timestamp());
-- Frozen question + key snapshots isolate an attempt from subsequent editorial
-- changes. No role can SELECT these private rows, including authenticated admins.
create table private.exam_items(attempt_id uuid not null references public.exam_attempts(id),question_id uuid not null references public.questions(id),position integer not null,prompt jsonb not null,key jsonb not null,primary key(attempt_id,question_id));
create index exam_question_review_history on public.question_reviews(question_id,created_at);
create index exam_sections_bank on public.exam_sections(bank_id);
create index exam_attempts_template on public.exam_attempts(template_id);
create index exam_responses_question on public.exam_responses(question_id);
create index exam_item_question on private.exam_items(question_id);
create index exam_questions_lesson on public.questions(related_lesson_id) where related_lesson_id is not null;
create index exam_questions_deck on public.questions(related_deck_id) where related_deck_id is not null;
create index exam_questions_audio on public.questions(audio_asset_id) where audio_asset_id is not null;
do $$declare t text;begin
 foreach t in array array['exam_templates','exam_sections','question_reviews','exam_attempts','exam_section_attempts','exam_responses','exam_results'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from anon,authenticated',t);
 end loop;
end$$;
grant select on public.exam_templates,public.exam_sections to anon,authenticated;
create policy templates_public on public.exam_templates for select using(published or public.is_admin());
create policy sections_public on public.exam_sections for select using(exists(select 1 from public.exam_templates t where t.id=template_id and (t.published or public.is_admin())));
grant select on public.exam_attempts,public.exam_section_attempts,public.exam_responses,public.exam_results,public.question_reviews to authenticated;
create policy attempts_owner on public.exam_attempts for select using(user_id=auth.uid());
create policy section_attempt_owner on public.exam_section_attempts for select using(exists(select 1 from public.exam_attempts a where a.id=attempt_id and a.user_id=auth.uid()));
create policy responses_owner on public.exam_responses for select using(exists(select 1 from public.exam_attempts a where a.id=attempt_id and a.user_id=auth.uid()));
create policy results_owner on public.exam_results for select using(exists(select 1 from public.exam_attempts a where a.id=attempt_id and a.user_id=auth.uid() and a.status='submitted'));
create policy reviews_admin on public.question_reviews for select using(public.is_admin());

create function public.exam_catalog() returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',t.id,'title',t.title,'level',t.level,'mode',t.mode,'subject',b.subject,'count',s.question_count,'seconds',s.duration_seconds,'difficultyCounts',(select coalesce(jsonb_object_agg(d.difficulty,d.n),'{}') from (select q.exam_metadata->>'difficulty' difficulty,count(*) n from public.questions q where q.bank_id=s.bank_id and q.exam_status='published' and not exists(select 1 from private.exam_items item join public.exam_attempts previous on previous.id=item.attempt_id where item.question_id=q.id and previous.user_id=auth.uid() and previous.status='submitted') group by q.exam_metadata->>'difficulty') d),'available', t.mode<>'full' and (select count(*) from public.exam_sections where template_id=t.id)=1 and (select count(*) from public.questions q where q.bank_id=s.bank_id and q.exam_status='published' and not exists(select 1 from private.exam_items item join public.exam_attempts previous on previous.id=item.attempt_id where item.question_id=q.id and previous.user_id=auth.uid() and previous.status='submitted'))>=case when t.mode='quick' then 1 else s.question_count end) order by t.level desc,t.title),'[]') from public.exam_templates t join public.exam_sections s on s.template_id=t.id join public.question_banks b on b.id=s.bank_id where t.published and b.exam_only and exists(select 1 from public.courses c where c.id=b.course_id and c.slug=t.level) and private.content_visible('course',b.course_id)
$$;
-- Full multi-section mocks intentionally fail closed until separately validated.
create function public.start_exam(p_id uuid,p_template uuid,p_count integer default null,p_difficulty text default 'mixed') returns uuid language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();t public.exam_templates;s public.exam_sections;a public.exam_attempts;ids uuid[];wanted integer;begin
 if u is null then raise exception 'Authentication required';end if;
 perform pg_advisory_xact_lock(hashtextextended(u::text,47));
 select * into a from public.exam_attempts where id=p_id;
 if found then if a.user_id<>u or a.template_id<>p_template then raise exception 'Attempt conflict';end if;return a.id;end if;
 if exists(select 1 from public.exam_attempts where user_id=u and status='active') then raise exception 'Resume or submit your active exam first';end if;
 select * into t from public.exam_templates where id=p_template and published and mode<>'full';
 if not found or (select count(*) from public.exam_sections where template_id=t.id)<>1 then raise exception 'Exam unavailable';end if;
 select * into s from public.exam_sections where template_id=t.id;
 if not exists(select 1 from public.question_banks where id=s.bank_id and exam_only and exists(select 1 from public.courses c where c.id=course_id and c.slug=t.level) and private.content_visible('course',course_id)) then raise exception 'Exam bank unavailable';end if;
 wanted:=coalesce(p_count,s.question_count);if wanted not between 1 and s.question_count or p_difficulty not in ('mixed','easy','medium','hard') or (t.mode='section' and (wanted<>s.question_count or p_difficulty<>'mixed')) then raise exception 'Invalid exam configuration';end if;
 select array_agg(id) into ids from (select q.id from public.questions q where q.bank_id=s.bank_id and q.exam_status='published' and (p_difficulty='mixed' or q.exam_metadata->>'difficulty'=p_difficulty) and not exists(select 1 from private.exam_items i join public.exam_attempts previous on previous.id=i.attempt_id where i.question_id=q.id and previous.user_id=u and previous.status='submitted') order by random() limit wanted) eligible;
 if coalesce(cardinality(ids),0)<>wanted then raise exception 'Insufficient reviewed questions';end if;
 insert into public.exam_attempts(id,user_id,template_id,title,level,mode,expires_at) values(p_id,u,t.id,t.title,t.level,t.mode,clock_timestamp()+make_interval(secs=>s.duration_seconds));
 insert into public.exam_section_attempts(attempt_id,section_id,title,position) values(p_id,s.id,s.title,0);
 insert into private.exam_items(attempt_id,question_id,position,prompt,key)
 select p_id,q.id,row_number() over(order by array_position(ids,q.id)),jsonb_build_object('id',q.id,'level',q.exam_metadata->>'level','prompt',q.prompt,'subject',q.exam_metadata->>'subject','type',q.exam_metadata->>'type','passage',q.exam_metadata->>'passage','options',(select jsonb_agg(jsonb_build_object('id',o.id,'text',o.text) order by o.position) from public.question_options o where o.question_id=q.id),'lessonId',q.related_lesson_id,'deckId',q.related_deck_id),jsonb_build_object('correctOptionId',k.option_id,'explanation',k.explanation,'japaneseExplanation',k.japanese_explanation,'translation',k.translation) from public.questions q join private.answer_keys k on k.question_id=q.id where q.id=any(ids);
 if (select count(*) from private.exam_items where attempt_id=p_id)<>wanted then raise exception 'Missing answer keys';end if;
 insert into public.exam_responses(attempt_id,question_id) select p_id,unnest(ids);
 return p_id;end$$;

create function public.save_exam_response(p_id uuid,p_question uuid,p_option uuid,p_flagged boolean) returns boolean language plpgsql security definer set search_path='' as $$declare a public.exam_attempts;begin
 select * into a from public.exam_attempts where id=p_id and user_id=auth.uid() for update;
 if not found then raise exception 'Attempt unavailable';end if;
 if a.status<>'active' or clock_timestamp()>=a.expires_at then return false;end if;
 if not exists(select 1 from private.exam_items i where i.attempt_id=p_id and i.question_id=p_question and (p_option is null or exists(select 1 from jsonb_array_elements(i.prompt->'options') o where o->>'id'=p_option::text))) then raise exception 'Invalid option';end if;
 update public.exam_responses set option_id=p_option,flagged=p_flagged,updated_at=clock_timestamp() where attempt_id=p_id and question_id=p_question;return true;end$$;

create function public.submit_exam(p_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$declare a public.exam_attempts;r jsonb;begin
 select * into a from public.exam_attempts where id=p_id and user_id=auth.uid() for update;
 if not found then raise exception 'Attempt unavailable';end if;
 if a.status='submitted' then return (select result from public.exam_results where attempt_id=p_id);end if;
 select jsonb_build_object('total',count(*),'correct',count(*) filter(where response.option_id::text=i.key->>'correctOptionId'),'unanswered',count(*) filter(where response.option_id is null),'seconds',greatest(0,extract(epoch from least(clock_timestamp(),a.expires_at)-a.started_at)::int),'answers',jsonb_agg(i.prompt||i.key||jsonb_build_object('selectedOptionId',response.option_id,'correct',coalesce(response.option_id::text=i.key->>'correctOptionId',false),'flagged',response.flagged) order by i.position)) into r from private.exam_items i join public.exam_responses response on response.attempt_id=i.attempt_id and response.question_id=i.question_id where i.attempt_id=p_id;
 insert into public.exam_results(attempt_id,result) values(p_id,r);
 update public.exam_attempts set status='submitted',submitted_at=clock_timestamp() where id=p_id;
 return r;end$$;

create function public.get_exam(p_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$declare a public.exam_attempts;begin
 select * into a from public.exam_attempts where id=p_id and user_id=auth.uid();if not found then raise exception 'Attempt unavailable';end if;
 if a.status='active' and clock_timestamp()>=a.expires_at then perform public.submit_exam(p_id);select * into a from public.exam_attempts where id=p_id;end if;
 return to_jsonb(a)||jsonb_build_object('serverTime',clock_timestamp(),'questions',(select jsonb_agg(i.prompt||jsonb_build_object('selectedOptionId',response.option_id,'flagged',response.flagged) order by i.position) from private.exam_items i join public.exam_responses response on response.attempt_id=i.attempt_id and response.question_id=i.question_id where i.attempt_id=p_id),'result',(select result from public.exam_results where attempt_id=p_id and a.status='submitted'));end$$;

-- Metadata and answer edits invalidate review even when made directly by an admin.
create function private.exam_question_guard() returns trigger language plpgsql set search_path='' as $$begin
 if tg_op='UPDATE' and (new.prompt is distinct from old.prompt or new.bank_id is distinct from old.bank_id or new.related_lesson_id is distinct from old.related_lesson_id or new.related_deck_id is distinct from old.related_deck_id or new.audio_asset_id is distinct from old.audio_asset_id or new.exam_metadata is distinct from old.exam_metadata) then new.exam_status:='draft';end if;
 if new.exam_status<>old.exam_status and new.exam_status not in ('draft','archived') then
 if not ((old.exam_status='draft' and new.exam_status='in_review') or (old.exam_status='in_review' and new.exam_status='approved') or (old.exam_status='approved' and new.exam_status='published')) then raise exception 'Invalid question review transition';end if;
 if length(trim(new.prompt))<4 or exists(select 1 from public.question_options o where o.question_id=new.id and length(trim(o.text))=0) or (select count(distinct trim(o.text)) from public.question_options o where o.question_id=new.id)<>(select count(*) from public.question_options o where o.question_id=new.id) then raise exception 'Question options validation failed';end if;
 if (new.exam_metadata->>'type' in ('passage_reading','information_retrieval') and coalesce(length(trim(new.exam_metadata->>'passage')),0)=0) or coalesce(new.exam_metadata->>'difficulty','') not in ('easy','medium','hard') or not exists(select 1 from public.question_banks b join public.courses c on c.id=b.course_id where b.id=new.bank_id and c.slug=new.exam_metadata->>'level' and b.subject=new.exam_metadata->>'subject') then raise exception 'Question metadata validation failed';end if;
 if not exists(select 1 from public.question_banks b where b.id=new.bank_id and b.exam_only) or coalesce(new.exam_metadata->>'level','') not in ('n5','n4','n3','n2','n1') or coalesce(new.exam_metadata->>'subject','') not in ('vocabulary','kanji','grammar','reading') or coalesce(new.exam_metadata->>'type','') not in ('kanji_reading','vocabulary_meaning','vocabulary_usage','grammar_completion','sentence_ordering','passage_reading','information_retrieval') or coalesce(length(new.exam_metadata->>'source'),0)<3 or (select count(*) from public.question_options o where o.question_id=new.id) not between 2 and 4 or not exists(select 1 from private.answer_keys k where k.question_id=new.id and length(k.explanation)>=10 and length(k.japanese_explanation)>=5) then raise exception 'Question validation failed';end if;
 end if;return new;end$$;
create trigger exam_question_guard before update on public.questions for each row execute function private.exam_question_guard();
create function private.audit_exam_review() returns trigger language plpgsql security definer set search_path='' as $$begin
 if new.exam_status is distinct from old.exam_status and auth.uid() is not null then
 insert into public.question_reviews(question_id,reviewer_id,status,notes) values(new.id,auth.uid(),new.exam_status,'Question status changed');end if;return new;end$$;
create trigger audit_exam_review after update on public.questions for each row execute function private.audit_exam_review();
create function private.exam_option_guard() returns trigger language plpgsql security definer set search_path='' as $$begin
 update public.questions q set exam_status='draft' where q.id=case when tg_op='DELETE' then old.question_id else new.question_id end and exists(select 1 from public.question_banks b where b.id=q.bank_id and b.exam_only);
 return case when tg_op='DELETE' then old else new end;end$$;
create trigger exam_option_guard after insert or update or delete on public.question_options for each row execute function private.exam_option_guard();
create function public.admin_exam_question(p_id uuid,p_data jsonb,p_action text) returns uuid language plpgsql security definer set search_path='' as $$
declare q public.questions;bid uuid;oid uuid;n integer:=0;course uuid;nextstatus text;begin
 if not public.is_admin() then raise exception 'Administrator required';end if;
 if p_action='save' then
 if coalesce(p_data->>'level','') not in ('n5','n4','n3','n2','n1') or coalesce(p_data->>'subject','') not in ('vocabulary','kanji','grammar','reading') or coalesce(p_data->>'type','') not in ('kanji_reading','vocabulary_meaning','vocabulary_usage','grammar_completion','sentence_ordering','passage_reading','information_retrieval') or coalesce(p_data->>'difficulty','') not in ('easy','medium','hard') or length(coalesce(p_data->>'source',''))<3 or length(coalesce(p_data->>'prompt',''))<4 or coalesce(jsonb_typeof(p_data->'options'),'')<>'array' or jsonb_array_length(p_data->'options') not between 2 and 4 or coalesce((p_data->>'correctIndex')::int,-1) not between 0 and jsonb_array_length(p_data->'options')-1 or length(coalesce(p_data->>'explanation',''))<10 or length(coalesce(p_data->>'japaneseExplanation',''))<5 then raise exception 'Invalid question';end if;
 if exists(select 1 from jsonb_array_elements_text(p_data->'options') o where length(trim(o))=0) or (select count(distinct o) from jsonb_array_elements_text(p_data->'options') o)<>jsonb_array_length(p_data->'options') then raise exception 'Invalid options';end if;
 select id into course from public.courses where slug=p_data->>'level';if course is null then raise exception 'Course unavailable';end if;
 select id into bid from public.question_banks where course_id=course and exam_only and subject=p_data->>'subject' order by created_at limit 1;
 if bid is null then insert into public.question_banks(course_id,title,subject,exam_only) values(course,'Examination studio · '||(p_data->>'subject'),p_data->>'subject',true) returning id into bid;end if;
 if p_id is null then insert into public.questions(bank_id,prompt,position) values(bid,p_data->>'prompt',(select coalesce(max(position),-1)+1 from public.questions where bank_id=bid)) returning * into q;
 else select * into q from public.questions where id=p_id for update;if not found or q.bank_id<>bid then raise exception 'Create a new revision to change level or subject';end if;end if;
 update public.questions set prompt=p_data->>'prompt',exam_metadata=p_data-array['options','correctIndex','explanation','japaneseExplanation','translation'],exam_status='draft',related_lesson_id=(p_data->>'lessonId')::uuid,related_deck_id=(p_data->>'deckId')::uuid where id=q.id;
 delete from private.answer_keys where question_id=q.id;delete from public.question_options where question_id=q.id;
 for oid in select gen_random_uuid() from jsonb_array_elements(p_data->'options') loop
 insert into public.question_options(id,question_id,text,position) values(oid,q.id,p_data->'options'->>n,n);
 if n=(p_data->>'correctIndex')::int then insert into private.answer_keys values(q.id,oid,p_data->>'explanation',p_data->>'japaneseExplanation',coalesce(p_data->>'translation',''));end if;n:=n+1;end loop;
 return q.id;
 end if;
 select * into q from public.questions where id=p_id and exists(select 1 from public.question_banks b where b.id=bank_id and b.exam_only) for update;
 if not found then raise exception 'Question unavailable';end if;
 nextstatus:=case when p_action='review' and q.exam_status='draft' then 'in_review' when p_action='approve' and q.exam_status='in_review' then 'approved' when p_action='publish' and q.exam_status='approved' then 'published' when p_action='archive' then 'archived' end;
 if nextstatus is null or not exists(select 1 from private.answer_keys where question_id=q.id) then raise exception 'Invalid review transition';end if;
 update public.questions set exam_status=nextstatus where id=q.id;
 return q.id;end$$;

create function public.admin_exam_list() returns jsonb language plpgsql security definer set search_path='' as $$begin
 if not public.is_admin() then raise exception 'Administrator required';end if;
 return coalesce((select jsonb_agg(jsonb_build_object('id',q.id,'status',q.exam_status,'data',q.exam_metadata||jsonb_build_object('prompt',q.prompt,'options',(select jsonb_agg(o.text order by o.position) from public.question_options o where o.question_id=q.id),'correctIndex',(select o.position from public.question_options o where o.id=k.option_id),'explanation',k.explanation,'japaneseExplanation',k.japanese_explanation,'translation',k.translation),'reviews',(select coalesce(jsonb_agg(to_jsonb(r) order by r.created_at),'[]') from public.question_reviews r where r.question_id=q.id)) order by q.created_at) from public.questions q join public.question_banks b on b.id=q.bank_id join private.answer_keys k on k.question_id=q.id where b.exam_only),'[]');end$$;

revoke all on function public.exam_catalog(),public.start_exam(uuid,uuid,integer,text),public.save_exam_response(uuid,uuid,uuid,boolean),public.submit_exam(uuid),public.get_exam(uuid),public.admin_exam_question(uuid,jsonb,text),public.admin_exam_list() from public;
grant execute on function public.exam_catalog() to anon,authenticated;
grant execute on function public.start_exam(uuid,uuid,integer,text),public.save_exam_response(uuid,uuid,uuid,boolean),public.submit_exam(uuid),public.get_exam(uuid),public.admin_exam_question(uuid,jsonb,text),public.admin_exam_list() to authenticated;
revoke all on all functions in schema private from public,anon,authenticated;
commit;
