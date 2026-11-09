begin;
alter table public.exam_templates add column updated_at timestamptz not null default clock_timestamp();
create trigger cms_exam_updated before update on public.exam_templates for each row execute function private.touch_updated_at();
-- Reuse official-source and guide publication checks without granting platform roles.
do $$declare original text;definition text;begin
 foreach original in array array['admin_guide_save','admin_guide_transition'] loop
 select pg_get_functiondef(p.oid) into definition from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname=original;
 definition:=replace(definition,'public.'||original||'(','private.cms_'||original||'(');
 definition:=regexp_replace(definition,'if not public.is_admin\(\) then raise exception ''[^'']*'';end if;','','gi');
 definition:=replace(definition,'if not public.is_admin() or tbl is null','if tbl is null');
 definition:=replace(definition,'auth.uid()','coalesce(nullif(current_setting(''nihonpath.cms_reviewer'',true),'''')::uuid,auth.uid())');
 definition:=replace(definition,'coalesce(p_id,gen_random_uuid())','coalesce(p_id,nullif(current_setting(''nihonpath.cms_target'',true),'''')::uuid,gen_random_uuid())');
 if definition like '%if not public.is_admin()%' then raise exception 'Guide adapter guard not normalized';end if;
 execute definition;
 end loop;
end$$;
alter function private.cms_table(text) rename to cms_catalog_table;
create function private.cms_table(p_kind text) returns text language sql immutable set search_path='' as $$select case p_kind when 'guide_article' then 'guide_articles' when 'guide_category' then 'guide_categories' when 'guide_source' then 'official_resources' when 'exam' then 'exam_templates' else private.cms_catalog_table(p_kind) end$$;
alter function private.cms_live(text,uuid) rename to cms_live_core;
create function private.cms_live(p_kind text,p_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$declare doc jsonb;begin
 doc:=private.cms_live_core(p_kind,p_id);
 if p_kind='guide_article' and doc is not null then
  doc:=doc||jsonb_build_object('source_ids',coalesce((select jsonb_agg(source_id) from public.guide_source_links where article_id=p_id),'[]'),'translations',coalesce((select jsonb_agg(jsonb_build_object('locale',locale,'title',title,'summary',summary,'content',content)) from public.guide_translations where article_id=p_id and review_status='approved'),'[]'));
 elsif p_kind='exam' then doc:=doc||coalesce((select metadata from private.content_publications where entity_kind=p_kind and entity_id=p_id),'{}');end if;
 return doc;
end$$;
create or replace function public.cms_catalog(p_kind text,p_query text default '',p_state text default '',p_offset integer default 0) returns jsonb language plpgsql security definer set search_path='' as $$declare tbl text:=private.cms_table(p_kind);result jsonb;begin
 if not private.cms_can('read') or tbl is null then raise exception 'CMS access required';end if;
 if char_length(p_query)>100 or p_offset not between 0 and 100000 then raise exception 'Invalid search';end if;
 execute format($q$with rows as (select id,coalesce(to_jsonb(t)->>'title',to_jsonb(t)->>'term',to_jsonb(t)->>'character',to_jsonb(t)->>'kind') title,case when coalesce((to_jsonb(t)->>'published')::boolean,false) then 'published' else coalesce(to_jsonb(t)->>'review_status','draft') end state,updated_at from public.%I t where ($1<>'guide_source' or to_jsonb(t)->>'category'='guide') and not exists(select 1 from private.content_workspaces w where w.entity_kind=$1 and w.entity_id=t.id) union all select entity_id,coalesce(document->>'title',document->>'term',document->>'character',document->>'kind'),state,updated_at from private.content_workspaces where entity_kind=$1) select coalesce(jsonb_agg(to_jsonb(r)),'[]') from (select * from rows where title ilike '%%'||$2||'%%' and ($3='' or state=$3) order by updated_at desc,id limit 40 offset $4) r$q$,tbl) into result using p_kind,p_query,p_state,p_offset;
 return result;
end$$;
alter function private.cms_project(text,uuid,uuid) rename to cms_project_media;
create function private.cms_project(p_kind text,p_id uuid,p_actor uuid) returns void language plpgsql security definer set search_path='' as $$declare w private.content_workspaces;live jsonb;result uuid;stamp timestamptz;k text;action text;tr jsonb;tr_id uuid;source_bank public.question_banks;section_id uuid;bank uuid;item record;item_id uuid;opt record;option_id uuid;question_count integer:=0;asset uuid;begin
 if p_kind not in ('guide_article','guide_category','guide_source','exam') then perform private.cms_project_media(p_kind,p_id,p_actor);return;end if;
 select * into strict w from private.content_workspaces where entity_kind=p_kind and entity_id=p_id for update;
 if w.state<>'approved' or w.reviewer_id is null or w.reviewer_id=w.author_id then raise exception 'Independent approval required';end if;
 perform private.cms_validate(p_kind,w.document);live:=private.cms_live(p_kind,p_id);
 if (live->>'updated_at')::timestamptz is distinct from w.base_updated_at then raise exception 'Live content changed';end if;
 if p_kind='exam' then
  if exists(select 1 from public.exam_attempts where template_id=p_id) then raise exception 'Attempted exam: duplicate as a new version';end if;
  if w.document->>'mode' not in ('quick','section') or w.document->>'level' not in ('n5','n4','n3','n2','n1') then raise exception 'Only supported reviewed practice exam modes are available';end if;
  select * into strict source_bank from public.question_banks where id=(w.document->>'source_bank_id')::uuid and published and review_status='approved' and not exam_only;
  if source_bank.subject not in ('grammar','vocabulary','kanji') then raise exception 'Reading/listening assembly requires the separately reviewed examination studio';end if;
  if not exists(select 1 from public.courses where id=source_bank.course_id and slug=w.document->>'level' and published) then raise exception 'Level and source course must match';end if;
  if (w.document->>'duration_seconds')::int not between 60 and 7200 then raise exception 'Invalid duration';end if;
  bank:=gen_random_uuid();insert into public.question_banks(id,course_id,title,subject,exam_only) values(bank,source_bank.course_id,w.document->>'title',source_bank.subject,true);
  for item in select q.*,k.option_id correct_option,k.explanation,k.japanese_explanation,k.translation from public.questions q join private.answer_keys k on k.question_id=q.id where q.bank_id=source_bank.id and (jsonb_array_length(coalesce(w.document->'question_ids','[]'))=0 or q.id::text in(select jsonb_array_elements_text(w.document->'question_ids'))) order by q.position loop
   item_id:=gen_random_uuid();
   insert into public.questions(id,bank_id,prompt,position,exam_status,exam_metadata) values(item_id,bank,item.prompt,question_count,'published',jsonb_build_object('level',w.document->>'level','subject',source_bank.subject,'type',case source_bank.subject when 'grammar' then 'grammar_completion' when 'kanji' then 'kanji_reading' when 'reading' then 'passage_reading' else 'vocabulary_meaning' end,'difficulty','medium','source','Reviewed CMS bank snapshot','source_question_id',item.id));
   for opt in select * from public.question_options where question_id=item.id order by position loop
    option_id:=gen_random_uuid();insert into public.question_options(id,question_id,text,position) values(option_id,item_id,opt.text,opt.position);
    if opt.id=item.correct_option then insert into private.answer_keys values(item_id,option_id,item.explanation,item.japanese_explanation,item.translation);end if;
   end loop;
   -- Child guards reset status while options are inserted; restore validated snapshot state.
   update public.questions set exam_status='in_review' where id=item_id;
   update public.questions set exam_status='approved' where id=item_id;
   update public.questions set exam_status='published' where id=item_id;
   question_count:=question_count+1;
  end loop;
  if question_count not between 1 and 100 or (jsonb_array_length(coalesce(w.document->'question_ids','[]'))>0 and question_count<>jsonb_array_length(w.document->'question_ids')) then raise exception 'Select 1 to 100 distinct approved questions';end if;
  insert into public.exam_templates(id,title,level,mode,published) values(p_id,w.document->>'title',w.document->>'level',w.document->>'mode',false) on conflict(id) do update set title=excluded.title,level=excluded.level,mode=excluded.mode,published=false;
  delete from public.exam_sections where template_id=p_id;
  insert into public.exam_sections(template_id,bank_id,title,question_count,duration_seconds) values(p_id,bank,w.document->>'title',question_count,(w.document->>'duration_seconds')::int);
  update public.exam_templates set published=true where id=p_id;
 else
  k:=replace(p_kind,'guide_','');if k='source' and live is not null and live->>'category'<>'guide' then raise exception 'Guide source required';end if;
  perform set_config('nihonpath.cms_reviewer',w.reviewer_id::text,true);
  perform set_config('nihonpath.cms_target',p_id::text,true);
  result:=private.cms_admin_guide_save(k,case when live is null then null else p_id end,w.document,(live->>'updated_at')::timestamptz);if result<>p_id then raise exception 'Projection ID mismatch';end if;
  if k='article' then
   if not exists(select 1 from jsonb_array_elements(w.document->'translations') t where t->>'locale'='ja') then raise exception 'Reviewed Japanese translation required';end if;
   -- Build all translation edits before approving their shared article version.
   for tr in select value from jsonb_array_elements(w.document->'translations') loop
    select id,updated_at into tr_id,stamp from public.guide_translations where article_id=p_id and locale=tr->>'locale';
    perform set_config('nihonpath.cms_target',coalesce(tr_id,gen_random_uuid())::text,true);
    perform private.cms_admin_guide_save('translation',tr_id,tr||jsonb_build_object('article_id',p_id),stamp);
   end loop;
   for tr_id in select id from public.guide_translations where article_id=p_id and locale in(select value->>'locale' from jsonb_array_elements(w.document->'translations')) loop
    select updated_at into stamp from public.guide_translations where id=tr_id;perform private.cms_admin_guide_transition('translation',tr_id,'request_review',stamp,w.review_notes);
    select updated_at into stamp from public.guide_translations where id=tr_id;perform private.cms_admin_guide_transition('translation',tr_id,'approve',stamp,w.review_notes);
   end loop;
  end if;
  execute format('select updated_at from public.%I where id=$1',private.cms_table(p_kind)) into stamp using p_id;perform private.cms_admin_guide_transition(k,p_id,'request_review',stamp,w.review_notes);
  if k='article' and w.document->>'risk'<>'general' then
   if w.review_notes not like '[sources-reviewed]%' then raise exception 'Explicit independent source-review attestation required';end if;
   select updated_at into stamp from public.guide_articles where id=p_id;perform private.cms_admin_guide_transition(k,p_id,'review_sources',stamp,w.review_notes);
  end if;
  execute format('select updated_at from public.%I where id=$1',private.cms_table(p_kind)) into stamp using p_id;perform private.cms_admin_guide_transition(k,p_id,'approve',stamp,w.review_notes);
  execute format('select updated_at from public.%I where id=$1',private.cms_table(p_kind)) into stamp using p_id;perform private.cms_admin_guide_transition(k,p_id,'publish',stamp,w.review_notes);
 end if;
 if p_kind='guide_article' then
  delete from private.media_links where entity_kind=p_kind and entity_id=p_id;
  if nullif(w.document->'seo'->>'image','') is not null and not exists(select 1 from private.media_assets where id=(w.document->'seo'->>'image')::uuid and status='approved' and mime_type like 'image/%') then raise exception 'Approved image media required';end if;
  for asset in select distinct value::uuid from jsonb_array_elements_text(coalesce(w.document->'media_ids','[]')||case when nullif(w.document->'seo'->>'image','') is null then '[]'::jsonb else jsonb_build_array(w.document->'seo'->>'image') end) loop
   perform 1 from private.media_assets where id=asset and status='approved' for key share;if not found then raise exception 'Approved media required';end if;
   insert into private.media_links values(asset,p_kind,p_id);
  end loop;
 end if;
 live:=private.cms_live(p_kind,p_id);
 update private.content_workspaces set state='published',version=version+1,base_updated_at=(live->>'updated_at')::timestamptz,published_at=clock_timestamp(),published_by=p_actor,scheduled_at=null,scheduled_by=null,updated_at=clock_timestamp() where entity_kind=p_kind and entity_id=p_id;
 insert into private.content_publications(entity_kind,entity_id,seo,metadata,publisher_id) values(p_kind,p_id,coalesce(w.document->'seo','{}'),case when p_kind='exam' then w.document else '{}' end,p_actor) on conflict(entity_kind,entity_id) do update set seo=excluded.seo,metadata=excluded.metadata,publisher_id=excluded.publisher_id,published_at=clock_timestamp();
 insert into private.admin_audit_logs(actor_id,action,entity_kind,entity_id) values(p_actor,'publish',p_kind,p_id);
end$$;
create function public.cms_guide_references() returns jsonb language plpgsql security definer set search_path='' as $$begin
 if not private.cms_can('read') then raise exception 'CMS access required';end if;
 return jsonb_build_object('categories',coalesce((select jsonb_agg(jsonb_build_object('id',id,'title',title)) from public.guide_categories),'[]'),'sources',coalesce((select jsonb_agg(jsonb_build_object('id',id,'title',title,'verified_at',verified_at,'published',published)) from public.official_resources where category='guide'),'[]'),'banks',coalesce((select jsonb_agg(jsonb_build_object('id',id,'title',title,'course_id',course_id,'published',published)) from public.question_banks where not exam_only),'[]'));
end$$;
revoke all on function public.cms_guide_references() from public;
grant execute on function public.cms_guide_references() to authenticated;
alter function public.cms_references() rename to cms_references_core;
alter function public.cms_references_core() set schema private;
create function public.cms_references() returns jsonb language sql security definer set search_path='' as $$select private.cms_references_core()||public.cms_guide_references()$$;
revoke all on function public.cms_references() from public;
grant execute on function public.cms_references() to authenticated;
create function public.cms_translation_overview(p_lesson uuid) returns jsonb language plpgsql security definer set search_path='' as $$begin
 if not private.cms_can('read') then raise exception 'CMS access required';end if;
 return (select jsonb_agg(jsonb_build_object('locale',l,'id',coalesce(w.entity_id,t.id),'status',coalesce(w.state,case when t.published then 'published' else t.review_status end,'not_started'),'published',coalesce(t.published,false))) from unnest(array['en','ja','ne','hi']) l left join lateral(select * from public.content_translations where lesson_id=p_lesson and locale=l limit 1) t on true left join lateral(select * from private.content_workspaces where entity_kind='translation' and document->>'target_kind'='lesson' and document->>'target_id'=p_lesson::text and document->>'locale'=l order by updated_at desc limit 1) w on true);
end$$;
revoke all on function public.cms_translation_overview(uuid) from public;
grant execute on function public.cms_translation_overview(uuid) to authenticated;
do $$declare f record;begin for f in select p.oid::regprocedure signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='private' and p.proname like 'cms_%' loop execute format('revoke all on function %s from public,anon,authenticated',f.signature);end loop;end$$;
commit;
