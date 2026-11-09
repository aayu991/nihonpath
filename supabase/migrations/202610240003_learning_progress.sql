begin;
create or replace function public.admin_save_content(p_kind text,p_id uuid,p_data jsonb,p_expected_updated_at timestamptz default null) returns uuid language plpgsql security definer set search_path='' as $$
declare tbl text:=private.content_table(p_kind);cols text[];column_sql text;select_sql text;update_sql text;result uuid;payload jsonb:=p_data;target text;
begin
 if not public.is_admin() then raise exception 'Administrator access required' using errcode='42501';end if;
 if tbl is null or jsonb_typeof(p_data)<>'object' or octet_length(p_data::text)>60000 then raise exception 'Invalid content';end if;
 case p_kind
 when 'program' then cols:=array['slug','title','summary','category'];
 when 'course' then cols:=array['slug','title','program_id'];
 when 'module' then cols:=array['title','course_id','position'];
 when 'lesson' then payload:=jsonb_build_object('subject',coalesce(p_data->>'subject',(select subject from public.lessons where id=p_id),'vocabulary'))||p_data;cols:=array['slug','title','course_id','module_id','position','body','subject'];
 when 'block' then cols:=array['lesson_id','kind','position','content','deck_id','question_bank_id','audio_asset_id'];
 when 'translation' then
 target:=p_data->>'target_kind';if target not in ('program','course','module','lesson','block') or target is null then raise exception 'Invalid translation target';end if;
 payload:=jsonb_build_object(target||'_id',p_data->>'target_id','locale',p_data->>'locale','title',p_data->>'title','content',p_data->'content');
 cols:=array['program_id','course_id','module_id','lesson_id','block_id','locale','title','content'];
 end case;
 select string_agg(format('%I',c),','),string_agg(format('r.%I',c),','),string_agg(format('%I=r.%I',c,c),',') into column_sql,select_sql,update_sql from unnest(cols) c;
 if p_id is null then
 execute format('insert into public.%I(id,%s,review_status,published) select $1,%s,''draft'',false from jsonb_populate_record(null::public.%I,$2) r returning id',tbl,column_sql,select_sql,tbl) into result using gen_random_uuid(),payload;
 else
 if p_expected_updated_at is null then raise exception 'Record version required';end if;
 execute format('update public.%I t set %s,review_status=''draft'',published=false from jsonb_populate_record(null::public.%I,$2) r where t.id=$1 and t.updated_at=$3 returning t.id',tbl,update_sql,tbl) into result using p_id,payload,p_expected_updated_at;
 if result is null then raise exception 'Content changed; reload before editing';end if;
 end if;return result;
end$$;

create function private.validate_study_lesson() returns trigger language plpgsql set search_path='' as $$begin
 if new.published and (new.body ? 'examples' or exists(select 1 from public.courses c where c.id=new.course_id and c.slug in ('n5','n4','n3','n2','n1'))) then
 if not (new.body ? 'examples') or jsonb_typeof(new.body->'examples')<>'array' or jsonb_array_length(new.body->'examples')<(case when new.subject='grammar' then 2 else 1 end) then raise exception 'Meaningful examples required';end if;
 if coalesce(length(new.body->>'explanationEn'),0)<10 or coalesce(new.body->>'explanationJa','')!~'[ぁ-んァ-ヶ一-龯]' or exists(select 1 from jsonb_array_elements(new.body->'examples') e where coalesce(e->>'japanese','')!~'[ぁ-んァ-ヶ一-龯]' or coalesce(length(e->>'english'),0)=0) then raise exception 'Japanese examples and bilingual explanation required';end if;
 end if;return new;end$$;
create trigger z_validate_study_lesson before insert or update on public.lessons for each row execute function private.validate_study_lesson();
-- Reconstruct prototype schedules from existing server-recorded review history.
with last_again as (select user_id,flashcard_id,max(created_at) filter(where rating='again') last_again,max(created_at) last_time from public.flashcard_reviews group by user_id,flashcard_id), history as (select a.*,count(r.id)::integer streak from last_again a left join public.flashcard_reviews r on r.user_id=a.user_id and r.flashcard_id=a.flashcard_id and r.rating='known' and (a.last_again is null or r.created_at>a.last_again) group by a.user_id,a.flashcard_id,a.last_again,a.last_time)
insert into public.flashcard_schedule(user_id,flashcard_id,streak,interval_days,due_at,last_reviewed_at) select user_id,flashcard_id,streak,case when streak=0 then 1 else least(30,power(2,least(streak-1,5))::integer) end,last_time+make_interval(days=>case when streak=0 then 1 else least(30,power(2,least(streak-1,5))::integer) end),last_time from history on conflict do nothing;
-- Keep historical subject statistics even when a bank is later unpublished.
alter table public.quiz_attempts add column subject text not null default 'grammar' check(subject in ('vocabulary','kanji','grammar','reading','listening'));
update public.quiz_attempts a set subject=b.subject from public.question_banks b where b.id=a.bank_id;
create function private.snapshot_quiz_subject() returns trigger language plpgsql security definer set search_path='' as $$begin select subject into new.subject from public.question_banks where id=new.bank_id;return new;end$$;
create trigger snapshot_quiz_subject before insert on public.quiz_attempts for each row execute function private.snapshot_quiz_subject();
create function public.learning_dashboard() returns jsonb language sql stable security invoker set search_path='' as $$select jsonb_build_object(
 'enrollments',coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'title',c.title,'level',c.slug) order by e.created_at desc) from public.course_enrollments e join public.courses c on c.id=e.course_id where e.user_id=auth.uid()),'[]'::jsonb),
 'due',coalesce((select jsonb_agg(to_jsonb(d)) from (select c.slug level,count(*)::integer count from public.flashcard_schedule s join public.flashcards f on f.id=s.flashcard_id join public.flashcard_decks d on d.id=f.deck_id join public.courses c on c.id=d.course_id where s.user_id=auth.uid() and s.due_at<=now() group by c.slug) d),'[]'::jsonb),
 'accuracy',coalesce((select jsonb_agg(to_jsonb(a)) from (select q.subject,sum(q.score)::integer correct,sum(q.total)::integer total,round(100.0*sum(q.score)/nullif(sum(q.total),0))::integer percent from public.quiz_attempts q where q.user_id=auth.uid() group by q.subject) a),'[]'::jsonb),
 'continueLesson',(select jsonb_build_object('id',l.id,'title',l.title,'level',c.slug) from public.lessons l join public.courses c on c.id=l.course_id join public.profiles p on p.id=auth.uid() left join public.lesson_progress lp on lp.lesson_id=l.id and lp.user_id=auth.uid() where c.slug=p.jlpt_target and l.published and lp.completed_at is null order by l.position limit 1)
)$$;
revoke all on function public.learning_dashboard() from public;
grant execute on function public.learning_dashboard() to authenticated;
create or replace function public.submit_quiz(p_id uuid,p_bank uuid,p_answers jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare owner_id uuid:=auth.uid();n integer;s integer;result jsonb;existing public.quiz_attempts;
begin
 if owner_id is null then raise exception 'Authentication required';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_id::text,0));
 select * into existing from public.quiz_attempts where id=p_id;
 if found and (existing.user_id<>owner_id or existing.bank_id<>p_bank) then raise exception 'Attempt conflict';end if;
 if not exists(select 1 from public.question_banks b join public.courses c on c.id=b.course_id where b.id=p_bank and b.published and c.published and private.content_visible('course',c.id)) then raise exception 'Quiz unavailable';end if;
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

revoke all on all functions in schema private from public,anon,authenticated;
commit;
