begin;
-- Enforce preparation relationships even through older administrative entry points.
create function private.prep_relationship_guard() returns trigger language plpgsql security definer set search_path='' as $$begin
 if tg_table_name='vocabulary' and new.sector_id is not null then
 if not exists(select 1 from public.industry_sectors s where s.id=new.sector_id and s.course_id=new.course_id) then raise exception 'Vocabulary sector must match course';end if;
 elsif tg_table_name='workplace_scenarios' then
 if not exists(select 1 from public.industry_sectors s join public.lessons l on l.course_id=s.course_id join public.question_banks b on b.course_id=s.course_id where s.id=new.sector_id and l.id=new.lesson_id and b.id=new.bank_id) then raise exception 'Scenario resources must match sector course';end if;
 elsif tg_table_name='interview_questions' and new.sector_id is not null then
 if not exists(select 1 from public.industry_sectors s join public.lessons l on l.course_id=s.course_id where s.id=new.sector_id and l.id=new.lesson_id) then raise exception 'Interview lesson must match sector course';end if;
 end if;return new;end$$;
create trigger prep_relationship_guard before insert or update on public.vocabulary for each row execute function private.prep_relationship_guard();
create trigger prep_relationship_guard before insert or update on public.workplace_scenarios for each row execute function private.prep_relationship_guard();
create trigger prep_relationship_guard before insert or update on public.interview_questions for each row execute function private.prep_relationship_guard();
create function private.prep_sector_course_guard() returns trigger language plpgsql security definer set search_path='' as $$begin
 if new.course_id is distinct from old.course_id and (exists(select 1 from public.vocabulary where sector_id=old.id) or exists(select 1 from public.workplace_scenarios where sector_id=old.id) or exists(select 1 from public.interview_questions where sector_id=old.id)) then raise exception 'Create a new sector revision to change its populated course';end if;return new;end$$;
create trigger prep_sector_course_guard before update on public.industry_sectors for each row execute function private.prep_sector_course_guard();
create function private.prep_edit_audit() returns trigger language plpgsql security definer set search_path='' as $$begin
 if new.review_status=old.review_status and new.published=old.published and (to_jsonb(new)-'updated_at') is distinct from (to_jsonb(old)-'updated_at') then insert into private.content_review_events(entity_kind,entity_id,actor_id,review_status,published) values(tg_table_name,new.id,auth.uid(),new.review_status,new.published);end if;return new;end$$;
do $$declare tbl text;begin foreach tbl in array array['industry_sectors','workplace_scenarios','interview_questions','official_resources'] loop execute format('create trigger prep_edit_audit after update on public.%I for each row execute function private.prep_edit_audit()',tbl);end loop;end$$;
-- Preserve the existing version/history checks; add optional preparation metadata.
create function public.admin_prep_learning_save(p_kind text,p_id uuid,p_data jsonb,p_expected_updated_at timestamptz default null) returns uuid language plpgsql security definer set search_path='' as $$declare result uuid;item jsonb;idx integer:=0;begin
 if not public.is_admin() then raise exception 'Administrator required';end if;
 result:=public.admin_learning_save(p_kind,p_id,p_data,p_expected_updated_at);
 if p_kind='bank' then
 update public.question_banks set prep_category=case when p_data?'prep_category' then nullif(p_data->>'prep_category','') else prep_category end,prep_mode=case when p_data?'prep_mode' then nullif(p_data->>'prep_mode','') else prep_mode end where id=result;
 elsif p_kind='vocabulary' then
 update public.vocabulary set sector_id=case when p_data?'sector_id' then (p_data->>'sector_id')::uuid else sector_id end,topic=coalesce(p_data->>'topic',topic),difficulty=coalesce(p_data->>'difficulty',difficulty) where id=result;
 if exists(select 1 from public.vocabulary v join public.industry_sectors s on s.id=v.sector_id where v.id=result and s.course_id<>v.course_id) then raise exception 'Vocabulary sector must match course';end if;
 elsif p_kind='deck' then
 for item in select value from jsonb_array_elements(p_data->'cards') loop
 if item->>'vocabulary_id' is not null then
 if not exists(select 1 from public.vocabulary v join public.flashcard_decks d on d.course_id=v.course_id where d.id=result and v.id=(item->>'vocabulary_id')::uuid) then raise exception 'Vocabulary must match deck course';end if;
 update public.flashcards set vocabulary_id=(item->>'vocabulary_id')::uuid where deck_id=result and position=idx;end if;idx:=idx+1;end loop;
 end if;return result;end$$;
revoke all on function public.admin_prep_learning_save(text,uuid,jsonb,timestamptz) from public;
grant execute on function public.admin_prep_learning_save(text,uuid,jsonb,timestamptz) to authenticated;
create or replace function public.admin_learning_preview(p_kind text,p_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$declare doc jsonb;items jsonb;begin
 if not public.is_admin() then raise exception 'Administrator access required' using errcode='42501';end if;
 if p_kind='vocabulary' then select to_jsonb(v) into doc from public.vocabulary v where id=p_id;
 elsif p_kind='deck' then select to_jsonb(d) into doc from public.flashcard_decks d where id=p_id;select coalesce(jsonb_agg(jsonb_build_object('vocabulary_id',vocabulary_id,'term',term,'reading',reading,'meaning_en',translations->>'en','meaning_ja',translations->>'ja','example',example,'example_translation',example_translation,'category',category) order by position),'[]') into items from public.flashcards where deck_id=p_id;doc:=doc||jsonb_build_object('cards',items);
 elsif p_kind='bank' then select to_jsonb(b) into doc from public.question_banks b where id=p_id;select coalesce(jsonb_agg(jsonb_build_object('prompt',q.prompt,'options',(select jsonb_agg(o.text order by o.position) from public.question_options o where o.question_id=q.id),'correctIndex',(select o.position from public.question_options o where o.id=k.option_id),'explanation',k.explanation,'japaneseExplanation',k.japanese_explanation,'translation',k.translation) order by q.position),'[]') into items from public.questions q left join private.answer_keys k on k.question_id=q.id where q.bank_id=p_id;doc:=doc||jsonb_build_object('questions',items);
 else raise exception 'Invalid kind';end if;return doc;end$$;

revoke all on all functions in schema private from public,anon,authenticated;
commit;
