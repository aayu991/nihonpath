begin;
create table public.kanji_entries(id uuid primary key default gen_random_uuid(),course_id uuid not null references public.courses(id),character text not null check(char_length(character)=1),onyomi text not null,kunyomi text not null,meaning text not null,example_words text not null,lesson_id uuid references public.lessons(id),published boolean not null default false,review_status text not null default 'draft' check(review_status in ('draft','in_review','approved')),updated_at timestamptz not null default clock_timestamp(),unique(course_id,character));
alter table public.kanji_entries enable row level security;
revoke all on public.kanji_entries from public,anon,authenticated;
grant select on public.kanji_entries to anon,authenticated;
create policy kanji_published on public.kanji_entries for select using(published and exists(select 1 from public.courses c where c.id=course_id and c.published));
create trigger kanji_review_guard before insert or update on public.kanji_entries for each row execute function private.guard_content_review();
create index kanji_course on public.kanji_entries(course_id);
create table private.content_publications(entity_kind text not null,entity_id uuid not null,seo jsonb not null default '{}',metadata jsonb not null default '{}',published_at timestamptz not null default now(),publisher_id uuid references auth.users(id) on delete set null,primary key(entity_kind,entity_id));
create table private.cms_vocabulary_decks(vocabulary_id uuid primary key references public.vocabulary(id),deck_id uuid not null references public.flashcard_decks(id));
alter table private.content_publications enable row level security;
alter table private.cms_vocabulary_decks enable row level security;
revoke all on private.content_publications,private.cms_vocabulary_decks from public,anon,authenticated;
alter function private.cms_table(text) rename to cms_core_table;
create function private.cms_table(p_kind text) returns text language sql immutable set search_path='' as $$select case when p_kind='kanji' then 'kanji_entries' else private.cms_core_table(p_kind) end$$;
alter function private.cms_project(text,uuid,uuid) rename to cms_project_core;
create function private.cms_project(p_kind text,p_id uuid,p_actor uuid) returns void language plpgsql security definer set search_path='' as $$declare w private.content_workspaces;live jsonb;deck uuid;old_deck uuid;feature text;begin
 select * into strict w from private.content_workspaces where entity_kind=p_kind and entity_id=p_id for update;
 if w.state<>'approved' or w.reviewer_id is null or w.reviewer_id=w.author_id then raise exception 'Independent approval required';end if;
 if p_kind='kanji' then
  perform private.cms_validate(p_kind,w.document);live:=private.cms_live(p_kind,p_id);
  if coalesce(w.document->>'character','') !~ '^[一-龯]$' or coalesce(length(trim(w.document->>'meaning')),0)=0 then raise exception 'Kanji character and meaning required';end if;
  if w.document->>'lesson_id' is not null and not exists(select 1 from public.lessons where id=(w.document->>'lesson_id')::uuid and course_id=(w.document->>'course_id')::uuid and private.content_visible('lesson',id)) then raise exception 'Related lesson must be published in the same course';end if;
  if (live->>'updated_at')::timestamptz is distinct from w.base_updated_at then raise exception 'Live content changed';end if;
  insert into public.kanji_entries(id,course_id,character,onyomi,kunyomi,meaning,example_words,lesson_id) select p_id,r.course_id,r.character,r.onyomi,r.kunyomi,r.meaning,r.example_words,r.lesson_id from jsonb_populate_record(null::public.kanji_entries,w.document) r on conflict(id) do update set course_id=excluded.course_id,character=excluded.character,onyomi=excluded.onyomi,kunyomi=excluded.kunyomi,meaning=excluded.meaning,example_words=excluded.example_words,lesson_id=excluded.lesson_id;
  if not private.content_visible('course',(w.document->>'course_id')::uuid) then raise exception 'Published course required';end if;
  update public.kanji_entries set review_status='approved',published=true where id=p_id;
  update private.content_workspaces set state='published',version=version+1,base_updated_at=(select updated_at from public.kanji_entries where id=p_id),published_at=clock_timestamp(),published_by=p_actor,scheduled_at=null,scheduled_by=null,updated_at=clock_timestamp() where entity_kind=p_kind and entity_id=p_id;
  insert into private.admin_audit_logs(actor_id,action,entity_kind,entity_id) values(p_actor,'publish',p_kind,p_id);
 else perform private.cms_project_core(p_kind,p_id,p_actor);end if;
 insert into private.content_publications(entity_kind,entity_id,seo,metadata,publisher_id) values(p_kind,p_id,coalesce(w.document->'seo','{}'),w.document-array['body','content','questions','cards'],p_actor) on conflict(entity_kind,entity_id) do update set seo=excluded.seo,metadata=excluded.metadata,publisher_id=excluded.publisher_id,published_at=clock_timestamp();
 if p_kind='vocabulary' then
  -- A fresh deck preserves historical card reviews; an earlier managed deck is withdrawn.
  select deck_id into old_deck from private.cms_vocabulary_decks where vocabulary_id=p_id;
  if old_deck is not null then update public.flashcard_decks set published=false where id=old_deck;end if;
  deck:=gen_random_uuid();
  insert into public.flashcard_decks(id,course_id,title) values(deck,(w.document->>'course_id')::uuid,'Vocabulary · '||(w.document->>'term'));
  insert into public.flashcards(deck_id,vocabulary_id,term,reading,translations,example,example_translation,category,position) values(deck,p_id,w.document->>'term',w.document->>'reading',jsonb_build_object('en',w.document->>'meaning_en','ja',w.document->>'meaning_ja'),w.document->>'example',w.document->>'example_translation',coalesce(w.document->>'category','General'),0);
  update public.flashcard_decks set review_status='approved',published=true where id=deck;
  insert into private.cms_vocabulary_decks values(p_id,deck) on conflict(vocabulary_id) do update set deck_id=excluded.deck_id;
 end if;
 -- Course requirements are inherited at read/grading time. Never overwrite
 -- independent lesson requirements managed by the existing billing system.
 if p_kind='course' and w.document ? 'premium_feature' then
  feature:=nullif(w.document->>'premium_feature','');
  if feature is not null then insert into public.premium_requirements values('courses',p_id,feature) on conflict(resource_table,resource_id) do update set feature=excluded.feature;else delete from public.premium_requirements where resource_table='courses' and resource_id=p_id;end if;
 end if;
end$$;
create or replace function public.billing_resource_access(p_table text,p_id uuid) returns boolean language sql stable security definer set search_path='' as $$
 select public.is_admin() or not exists(select 1 from public.premium_requirements r where (r.resource_table=p_table and r.resource_id=p_id or r.resource_table='courses' and r.resource_id=case p_table when 'lessons' then (select course_id from public.lessons where id=p_id) when 'flashcard_decks' then (select course_id from public.flashcard_decks where id=p_id) when 'question_banks' then (select course_id from public.question_banks where id=p_id) when 'vocabulary' then (select course_id from public.vocabulary where id=p_id) when 'kanji_entries' then (select course_id from public.kanji_entries where id=p_id) end) and not public.billing_has_feature(r.feature))
$$;
create policy cms_course_access on public.courses as restrictive for select using(public.billing_resource_access('courses',id));
create policy cms_vocab_access on public.vocabulary as restrictive for select using(public.billing_resource_access('vocabulary',id));
create policy cms_kanji_access on public.kanji_entries as restrictive for select using(public.billing_resource_access('kanji_entries',id));
-- Withdraw vocabulary's managed flashcards when its publication is withdrawn.
create function private.cms_vocabulary_withdraw() returns trigger language plpgsql security definer set search_path='' as $$begin
 if old.published and not new.published then update public.flashcard_decks set published=false where id in(select deck_id from private.cms_vocabulary_decks where vocabulary_id=new.id);end if;return new;
end$$;
create trigger cms_vocab_withdraw after update on public.vocabulary for each row execute function private.cms_vocabulary_withdraw();
create function public.cms_public_metadata(p_kind text,p_id uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$begin
 if not (case when p_kind='guide_article' then private.guide_visible(p_id) else private.content_visible(p_kind,p_id) end) then return null;end if;
 return (select seo from private.content_publications where entity_kind=p_kind and entity_id=p_id);
end$$;
create function public.cms_import_vocabulary(p_course uuid,p_rows jsonb,p_preview boolean default true) returns jsonb language plpgsql security definer set search_path='' as $$declare row_data jsonb;duplicate boolean;result jsonb:='[]';idx integer:=0;new_id uuid;begin
 if not private.cms_can('edit') then raise exception 'Editor required';end if;
 if jsonb_typeof(p_rows)<>'array' or jsonb_array_length(p_rows) not between 1 and 200 or octet_length(p_rows::text)>250000 then raise exception 'Invalid import size';end if;
 if not exists(select 1 from public.courses where id=p_course) then raise exception 'Course not found';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_course::text,13002));
 if exists(select 1 from jsonb_array_elements(p_rows) r group by lower(trim(r->>'term')),lower(trim(r->>'reading')) having count(*)>1) then raise exception 'Duplicate rows in file';end if;
 for row_data in select value from jsonb_array_elements(p_rows) loop
  row_data:=row_data||jsonb_build_object('course_id',p_course);
  perform private.cms_validate('vocabulary',row_data);
  if row_data->>'term' !~ '[ぁ-んァ-ヶ一-龯]' or row_data->>'reading' !~ '^[ぁ-ゖァ-ヺー・\s]+$' or coalesce(length(row_data->>'meaning_ja'),0)=0 or coalesce(length(row_data->>'example'),0)=0 or coalesce(length(row_data->>'example_translation'),0)=0 then raise exception 'Invalid Japanese vocabulary row %',idx+1;end if;
  duplicate:=exists(select 1 from public.vocabulary where course_id=p_course and lower(trim(term))=lower(trim(row_data->>'term')) and lower(trim(reading))=lower(trim(row_data->>'reading'))) or exists(select 1 from private.content_workspaces where entity_kind='vocabulary' and document->>'course_id'=p_course::text and lower(trim(document->>'term'))=lower(trim(row_data->>'term')) and lower(trim(document->>'reading'))=lower(trim(row_data->>'reading')));
  new_id:=null;if not p_preview and not duplicate then new_id:=public.cms_save('vocabulary',null,row_data,0,null);end if;
  idx:=idx+1;result:=result||jsonb_build_array(jsonb_build_object('row',idx,'term',row_data->>'term','duplicate',duplicate,'id',new_id));
 end loop;return result;
end$$;
revoke all on function public.cms_public_metadata(text,uuid),public.cms_import_vocabulary(uuid,jsonb,boolean) from public;
grant execute on function public.cms_public_metadata(text,uuid) to anon,authenticated;
grant execute on function public.cms_import_vocabulary(uuid,jsonb,boolean) to authenticated;
do $$declare f record;begin for f in select p.oid::regprocedure signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='private' and p.proname like 'cms_%' loop execute format('revoke all on function %s from public,anon,authenticated',f.signature);end loop;end$$;
commit;
