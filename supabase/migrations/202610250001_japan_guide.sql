-- Additive guide architecture; reuse official_resources and visa_checklist_* contracts.
alter table public.official_resources drop constraint official_resources_category_check;
alter table public.official_resources add constraint official_resources_category_check check(category in ('jft','ssw','guide'));
alter table public.official_resources drop constraint official_resources_url_check;
alter table public.official_resources add constraint official_resources_url_check check(url ~ '^https://(www\.)?(jpf\.go\.jp|ssw\.go\.jp|prometric-jp\.com|moj\.go\.jp|mhlw\.go\.jp|mofa\.go\.jp|studyinjapan\.go\.jp|japan\.travel|jnto\.go\.jp|npa\.go\.jp|jma\.go\.jp)/');
alter table public.official_resources add column jurisdiction text not null default '',add column publication_date date,
 add column verified_at date,add column verified_by uuid references auth.users(id) on delete set null;
create table public.guide_categories(id uuid primary key default gen_random_uuid(),slug text unique not null,title text not null,title_ja text not null,icon text not null default 'BookOpen',position integer not null default 0,
 review_status text not null default 'draft' check(review_status in ('draft','in_review','approved')),published boolean not null default false check(not published or review_status='approved'),updated_at timestamptz not null default now());
create table public.guide_articles(id uuid primary key default gen_random_uuid(),slug text unique not null,category_id uuid not null references public.guide_categories(id),title text not null,summary text not null,content jsonb not null,format text not null default 'guide' check(format in ('guide','lesson')),
 audiences text[] not null,stages text[] not null,risk text not null check(risk in ('general','administrative','legal','safety')),
 deck_id uuid references public.flashcard_decks(id),bank_id uuid references public.question_banks(id),lesson_ids uuid[] not null default '{}',ai_scenario_id uuid references public.ai_scenarios(id),
 version integer not null default 1,review_status text not null default 'draft' check(review_status in ('draft','in_review','approved')),
 published boolean not null default false check(not published or review_status='approved'),outdated boolean not null default false,last_reviewed_at timestamptz,updated_at timestamptz not null default now(),
 check(cardinality(audiences)>0 and audiences<@array['tourist','student','ssw','professional','resident']),check(cardinality(stages)>0 and stages<@array['before','arriving','settling']),check(jsonb_typeof(content)='object'));
create table public.guide_translations(id uuid primary key default gen_random_uuid(),article_id uuid not null references public.guide_articles(id) on delete cascade,locale text not null check(locale in ('ja','ne','hi')),title text not null,summary text not null,content jsonb not null,article_version integer not null default 0,
 review_status text not null default 'draft' check(review_status in ('draft','in_review','approved')),updated_at timestamptz not null default now(),unique(article_id,locale));
create table public.guide_source_links(article_id uuid not null references public.guide_articles(id) on delete cascade,source_id uuid not null references public.official_resources(id),primary key(article_id,source_id));
create table public.article_reviews(id uuid primary key default gen_random_uuid(),article_id uuid not null references public.guide_articles(id) on delete cascade,article_version integer not null,kind text not null check(kind in ('source','content','outdated')),reviewer_id uuid references auth.users(id) on delete set null,notes text not null check(char_length(notes)>=10),created_at timestamptz not null default now());
create table public.article_revisions(id uuid primary key default gen_random_uuid(),article_id uuid not null references public.guide_articles(id) on delete cascade,entity_kind text not null,entity_id uuid not null,snapshot jsonb not null,editor_id uuid references auth.users(id) on delete set null,created_at timestamptz not null default now());
create table public.article_feedback(id uuid primary key default gen_random_uuid(),article_id uuid not null references public.guide_articles(id) on delete cascade,user_id uuid not null references auth.users(id) on delete cascade,kind text not null check(kind in ('helpful','unclear','outdated')),notes text not null default '' check(char_length(notes)<=1000),created_at timestamptz not null default now(),unique(article_id,user_id));
alter table public.visa_checklist_templates add column title_ja text not null default '',add column guide_category_id uuid references public.guide_categories(id),add column audiences text[] not null default '{}',add column stages text[] not null default '{}',add column source_id uuid references public.official_resources(id),add column review_status text not null default 'draft' check(review_status in ('draft','in_review','approved'));
update public.visa_checklist_templates set review_status='approved' where published;
alter table public.visa_checklist_items add column title_ja text not null default '',add column note text not null default '',add column note_ja text not null default '',
 add column kind text not null default 'suggestion' check(kind in ('suggestion','law','municipal','workplace','culture')),
 add column circumstance text not null default 'all' check(circumstance in ('all','renting','banking')),add column audiences text[] not null default '{}',add column guide_id uuid references public.guide_articles(id),add column version integer not null default 1,add column updated_at timestamptz not null default now();
create table public.user_checklists(user_id uuid primary key references auth.users(id) on delete cascade,audiences text[] not null,stage text not null check(stage in ('before','arriving','settling')),renting boolean not null default false,banking boolean not null default false,updated_at timestamptz not null default now(),check(cardinality(audiences) between 1 and 5 and audiences<@array['tourist','student','ssw','professional','resident']));
create table public.user_checklist_progress(user_id uuid not null references auth.users(id) on delete cascade,item_id uuid not null references public.visa_checklist_items(id) on delete restrict,completed boolean not null default false,notes text not null default '' check(char_length(notes)<=2000),due_date date,item_version integer not null,updated_at timestamptz not null default now(),primary key(user_id,item_id));
create index guide_articles_category on public.guide_articles(category_id);
create index guide_sources_resource on public.guide_source_links(source_id);
create index guide_revisions_article on public.article_revisions(article_id,created_at desc);
create index guide_reviews_article on public.article_reviews(article_id,article_version);
create index guide_progress_item on public.user_checklist_progress(item_id);

create function private.guide_source_ready(p_id uuid) returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from public.official_resources where id=p_id and category='guide' and published and review_status='approved' and jurisdiction<>'' and verified_by is not null and verified_at between current_date-365 and current_date and (publication_date is null or publication_date<=current_date))$$;
create function private.guide_visible(p_id uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.guide_articles a join public.guide_categories c on c.id=a.category_id where a.id=p_id and a.published and a.review_status='approved' and not a.outdated and c.published
 and exists(select 1 from public.guide_source_links l where l.article_id=a.id)
 and not exists(select 1 from public.guide_source_links l where l.article_id=a.id and not private.guide_source_ready(l.source_id))
 and exists(select 1 from public.guide_translations t where t.article_id=a.id and t.locale='ja' and t.review_status='approved' and t.article_version=a.version))
$$;
create function private.guide_template_visible(p_id uuid) returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from public.visa_checklist_templates t join public.guide_categories c on c.id=t.guide_category_id where t.id=p_id and t.published and t.review_status='approved' and c.published and private.guide_source_ready(t.source_id))$$;
do $$declare t text;begin foreach t in array array['guide_categories','guide_articles','guide_translations','guide_source_links','article_reviews','article_revisions','article_feedback','user_checklists','user_checklist_progress'] loop
 execute format('alter table public.%I enable row level security',t);execute format('revoke all on public.%I from anon,authenticated',t);
end loop;end$$;
grant select on public.guide_categories,public.guide_articles,public.guide_translations,public.guide_source_links to anon,authenticated;
grant select on public.article_reviews,public.article_revisions,public.article_feedback,public.user_checklists,public.user_checklist_progress to authenticated;
create policy category_read on public.guide_categories for select using(published or public.is_admin());
create policy guide_read on public.guide_articles for select using(private.guide_visible(id) or public.is_admin());
create policy translation_read on public.guide_translations for select using((review_status='approved' and private.guide_visible(article_id)) or public.is_admin());
create policy links_read on public.guide_source_links for select using(private.guide_visible(article_id) or public.is_admin());
create policy review_admin on public.article_reviews for select to authenticated using(public.is_admin());
create policy revisions_admin on public.article_revisions for select to authenticated using(public.is_admin());
create policy feedback_read on public.article_feedback for select to authenticated using(user_id=(select auth.uid()) or public.is_admin());
create policy checklist_owner on public.user_checklists for select to authenticated using(user_id=(select auth.uid()));
create policy checklist_progress_owner on public.user_checklist_progress for select to authenticated using(user_id=(select auth.uid()));
-- Strengthen guide additions without changing visibility of pre-existing non-guide templates.
drop policy checklist_public on public.visa_checklist_templates;
create policy checklist_public on public.visa_checklist_templates for select using(public.is_admin() or (guide_category_id is not null and private.guide_template_visible(id)) or (guide_category_id is null and published and (program_id is null or exists(select 1 from public.learning_programs p where p.id=program_id and p.published))));
drop policy checklist_item_public on public.visa_checklist_items;
create policy checklist_item_public on public.visa_checklist_items for select using(public.is_admin() or exists(select 1 from public.visa_checklist_templates t where t.id=template_id and t.published and (t.guide_category_id is null or private.guide_template_visible(t.id))));

create function public.guide_catalog() returns jsonb language sql stable security definer set search_path='' as $$select jsonb_build_object(
 'categories',coalesce((select jsonb_agg(to_jsonb(c) order by position) from public.guide_categories c where published),'[]'::jsonb),
 'articles',coalesce((select jsonb_agg(to_jsonb(a)||jsonb_build_object('source_ids',(select jsonb_agg(source_id) from public.guide_source_links where article_id=a.id))) from public.guide_articles a where private.guide_visible(a.id)),'[]'::jsonb),
 'translations',coalesce((select jsonb_agg(to_jsonb(t)) from public.guide_translations t where t.review_status='approved' and private.guide_visible(t.article_id) and t.article_version=(select version from public.guide_articles where id=t.article_id)),'[]'::jsonb),
 'sources',coalesce((select jsonb_agg(jsonb_build_object('id',s.id,'title',s.title,'url',s.url,'jurisdiction',s.jurisdiction,'publication_date',s.publication_date,'reviewed_at',s.reviewed_at,'verified_at',s.verified_at,'review_status',s.review_status,'published',s.published)) from public.official_resources s where private.guide_source_ready(s.id) and (exists(select 1 from public.guide_source_links l where l.source_id=s.id and private.guide_visible(l.article_id)) or exists(select 1 from public.visa_checklist_templates t where t.source_id=s.id and private.guide_template_visible(t.id)))),'[]'::jsonb),
 'templates',coalesce((select jsonb_agg(to_jsonb(t)) from public.visa_checklist_templates t where private.guide_template_visible(t.id)),'[]'::jsonb),
 'items',coalesce((select jsonb_agg(to_jsonb(i) order by position) from public.visa_checklist_items i where private.guide_template_visible(i.template_id)),'[]'::jsonb))$$;

create function public.set_guide_preferences(p_data jsonb) returns void language plpgsql security definer set search_path='' as $$declare goals text[];begin
 if auth.uid() is null or octet_length(p_data::text)>2000 or jsonb_typeof(p_data->'audiences')<>'array' or p_data->>'stage' not in ('before','arriving','settling') or jsonb_typeof(p_data->'renting')<>'boolean' or jsonb_typeof(p_data->'banking')<>'boolean' then raise exception 'Invalid preferences';end if;
 select array_agg(distinct value) into goals from jsonb_array_elements_text(p_data->'audiences');
 if cardinality(goals) not between 1 and 5 or not goals<@array['tourist','student','ssw','professional','resident'] then raise exception 'Invalid audience';end if;
 insert into public.user_checklists values(auth.uid(),goals,p_data->>'stage',(p_data->>'renting')::boolean,(p_data->>'banking')::boolean,now()) on conflict(user_id) do update set audiences=excluded.audiences,stage=excluded.stage,renting=excluded.renting,banking=excluded.banking,updated_at=now();
end$$;
create function public.save_guide_item(p_item uuid,p_completed boolean,p_notes text,p_due date,p_expected timestamptz default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare v integer;previous timestamptz;result public.user_checklist_progress;begin
 if auth.uid() is null or p_completed is null or p_notes is null or char_length(p_notes)>2000 then raise exception 'Invalid progress';end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text||p_item::text,800));
 select i.version into v from public.visa_checklist_items i where i.id=p_item and private.guide_template_visible(i.template_id);
 if not found then raise exception 'Published checklist item required';end if;
 select updated_at into previous from public.user_checklist_progress where user_id=auth.uid() and item_id=p_item;
 if previous is distinct from p_expected then raise exception 'Stale version';end if;
 insert into public.user_checklist_progress values(auth.uid(),p_item,p_completed,p_notes,p_due,v,clock_timestamp()) on conflict(user_id,item_id) do update set completed=excluded.completed,notes=excluded.notes,due_date=excluded.due_date,item_version=excluded.item_version,updated_at=excluded.updated_at returning * into result;
 return to_jsonb(result);
end$$;
create function public.submit_guide_feedback(p_article uuid,p_kind text,p_notes text) returns void language plpgsql security definer set search_path='' as $$begin
 if auth.uid() is null or not private.guide_visible(p_article) or p_kind not in ('helpful','unclear','outdated') or p_notes is null or char_length(p_notes)>1000 then raise exception 'Invalid feedback';end if;
 insert into public.article_feedback(article_id,user_id,kind,notes) values(p_article,auth.uid(),p_kind,p_notes) on conflict(article_id,user_id) do update set kind=excluded.kind,notes=excluded.notes,created_at=now();
end$$;

create function private.guide_table(p_kind text) returns text language sql immutable set search_path='' as $$select case p_kind when 'category' then 'guide_categories' when 'article' then 'guide_articles' when 'translation' then 'guide_translations' when 'source' then 'official_resources' when 'template' then 'visa_checklist_templates' when 'item' then 'visa_checklist_items' end$$;
create function public.admin_guide_save(p_kind text,p_id uuid,p_data jsonb,p_expected timestamptz default null) returns uuid language plpgsql security definer set search_path='' as $$
declare tbl text:=private.guide_table(p_kind);result uuid:=coalesce(p_id,gen_random_uuid());cols text;previous timestamptz;source_id uuid;begin
 if not public.is_admin() then raise exception 'Administrator required';end if;
 if tbl is null or jsonb_typeof(p_data)<>'object' or octet_length(p_data::text)>100000 then raise exception 'Invalid document';end if;
 if p_id is not null then execute format('select updated_at from public.%I where id=$1 for update',tbl) into previous using p_id;if previous is null or previous is distinct from p_expected then raise exception 'Stale version';end if;end if;
 if p_kind='source' and p_id is not null and not exists(select 1 from public.official_resources where id=p_id and category='guide') then raise exception 'Guide source required';end if;
 cols:=case p_kind when 'category' then 'slug,title,title_ja,icon,position' when 'article' then 'slug,category_id,title,summary,content,format,audiences,stages,risk,deck_id,bank_id,lesson_ids,ai_scenario_id' when 'translation' then 'article_id,locale,title,summary,content' when 'source' then 'title,url,summary,summary_ja,jurisdiction,publication_date,verified_at' when 'template' then 'title,title_ja,guide_category_id,audiences,stages,source_id' when 'item' then 'template_id,title,title_ja,note,note_ja,kind,circumstance,audiences,position,guide_id' end;
 if p_id is null then
  if p_kind='source' then p_data:=p_data||jsonb_build_object('category','guide','reviewed_at',current_date);cols:=cols||',category,reviewed_at';end if;
  if p_kind='template' then p_data:=p_data||jsonb_build_object('informational_notice','Personal planning only; completion is not legal verification.');cols:=cols||',informational_notice';end if;
  execute format('insert into public.%I(id,%s) select $1,%s from jsonb_populate_record(null::public.%I,$2)',tbl,cols,cols,tbl) using result,p_data;
 else
  execute format('update public.%I t set (%s)=(select %s from jsonb_populate_record(null::public.%I,$2))%s where id=$1',tbl,cols,cols,tbl,case when p_kind='item' then '' when p_kind='translation' then ',review_status=''draft''' else ',review_status=''draft'',published=false' end) using result,p_data;
 end if;
 if p_kind='article' then
  delete from public.guide_source_links where article_id=result;
  for source_id in select value::uuid from jsonb_array_elements_text(p_data->'source_ids') loop
   if not exists(select 1 from public.official_resources where id=source_id and category='guide') then raise exception 'Guide source required';end if;
   insert into public.guide_source_links values(result,source_id) on conflict do nothing;
  end loop;
 end if;
 return result;
end$$;
create function public.admin_guide_transition(p_kind text,p_id uuid,p_action text,p_expected timestamptz,p_notes text) returns void language plpgsql security definer set search_path='' as $$
declare tbl text:=private.guide_table(p_kind);doc jsonb;state text;pub boolean;begin
 if not public.is_admin() or tbl is null or p_kind='item' then raise exception 'Administrator required';end if;
 execute format('select to_jsonb(t) from public.%I t where id=$1 and updated_at=$2 for update',tbl) into doc using p_id,p_expected;
 if doc is null then raise exception 'Stale version';end if;
 if p_kind='source' and doc->>'category'<>'guide' then raise exception 'Guide source required';end if;
 state:=doc->>'review_status';pub:=coalesce((doc->>'published')::boolean,false);
 case p_action
 when 'request_review' then if (state<>'draft' and not(p_kind='translation' and state='approved' and (doc->>'article_version')::int<>(select version from public.guide_articles where id=(doc->>'article_id')::uuid))) or pub then raise exception 'Draft required';end if;state:='in_review';
 when 'review_sources' then
  if p_kind<>'article' or state<>'in_review' or coalesce(char_length(p_notes),0)<10 or not exists(select 1 from public.guide_source_links where article_id=p_id) or exists(select 1 from public.guide_source_links where article_id=p_id and not private.guide_source_ready(source_id)) then raise exception 'Verified published sources and review notes required';end if;
  insert into public.article_reviews(article_id,article_version,kind,reviewer_id,notes) values(p_id,(doc->>'version')::int,'source',auth.uid(),p_notes);
 when 'approve' then
  if state<>'in_review' or coalesce(char_length(p_notes),0)<10 then raise exception 'Human review and notes required';end if;
  if p_kind='source' then
   if doc->>'category'<>'guide' or char_length(doc->>'jurisdiction')<2 or (doc->>'verified_at') is null or (doc->>'verified_at')::date not between current_date-365 and current_date or ((doc->>'publication_date') is not null and (doc->>'publication_date')::date>current_date) then raise exception 'Source verification required';end if;
   update public.official_resources set verified_by=auth.uid(),reviewed_at=current_date where id=p_id;
  end if;
  if p_kind='article' then
   if doc->>'risk'<>'general' and not exists(select 1 from public.article_reviews where article_id=p_id and article_version=(doc->>'version')::int and kind='source') then raise exception 'Source review required';end if;
   insert into public.article_reviews(article_id,article_version,kind,reviewer_id,notes) values(p_id,(doc->>'version')::int,'content',auth.uid(),p_notes);
   update public.guide_articles set last_reviewed_at=now(),outdated=false where id=p_id;
  end if;
  state:='approved';
  if p_kind='translation' then update public.guide_translations set article_version=(select version from public.guide_articles where id=(doc->>'article_id')::uuid) where id=p_id;end if;
 when 'publish' then
  if state<>'approved' then raise exception 'Approval required';end if;
  if p_kind='article' then
   if not exists(select 1 from public.guide_categories where id=(doc->>'category_id')::uuid and published) or not exists(select 1 from public.guide_source_links where article_id=p_id) or exists(select 1 from public.guide_source_links where article_id=p_id and not private.guide_source_ready(source_id)) or not exists(select 1 from public.guide_translations where article_id=p_id and locale='ja' and review_status='approved' and article_version=(doc->>'version')::int) then raise exception 'Published category, verified sources and reviewed Japanese translation required';end if;
   if (doc->>'deck_id') is not null and not exists(select 1 from public.flashcard_decks where id=(doc->>'deck_id')::uuid and published) then raise exception 'Published deck required';end if;
   if (doc->>'bank_id') is not null and not exists(select 1 from public.question_banks where id=(doc->>'bank_id')::uuid and published) then raise exception 'Published bank required';end if;
   if exists(select 1 from jsonb_array_elements_text(doc->'lesson_ids') v where not private.content_visible('lesson',v::uuid)) then raise exception 'Published lessons required';end if;
   if (doc->>'ai_scenario_id') is not null and not exists(select 1 from public.ai_scenarios where id=(doc->>'ai_scenario_id')::uuid and published) then raise exception 'Published roleplay required';end if;
  end if;
  if p_kind='source' and not exists(select 1 from public.official_resources where id=p_id and verified_by is not null and verified_at between current_date-365 and current_date) then raise exception 'Source verification required';end if;
  if p_kind='template' then
   if not exists(select 1 from public.guide_categories where id=(doc->>'guide_category_id')::uuid and published) or not private.guide_source_ready((doc->>'source_id')::uuid) or not exists(select 1 from public.visa_checklist_items where template_id=p_id) then raise exception 'Published category, verified source and items required';end if;
   update public.visa_checklist_templates set source_url=(select url from public.official_resources where id=(doc->>'source_id')::uuid),reviewed_at=now() where id=p_id;
  end if;
  if p_kind='translation' then raise exception 'Translations follow parent publication';end if;pub:=true;
 when 'unpublish' then pub:=false;
 when 'outdated' then if p_kind<>'article' or coalesce(char_length(p_notes),0)<10 then raise exception 'Article and notes required';end if;pub:=false;state:='draft';update public.guide_articles set outdated=true,version=version+1,last_reviewed_at=null where id=p_id;insert into public.article_reviews(article_id,article_version,kind,reviewer_id,notes) values(p_id,(doc->>'version')::int,'outdated',auth.uid(),p_notes);
 else raise exception 'Invalid action';end case;
 execute format('update public.%I set review_status=$1%s where id=$3',tbl,case when p_kind='translation' then ',updated_at=clock_timestamp()' else ',published=$2,updated_at=clock_timestamp()' end) using state,pub,p_id;
end$$;

-- Any edit invalidates review. History is append-only and administrator-readable.
create function private.guide_article_change() returns trigger language plpgsql security definer set search_path='' as $$begin
 if (to_jsonb(new)-array['published','review_status','outdated','last_reviewed_at','updated_at','version']) is distinct from (to_jsonb(old)-array['published','review_status','outdated','last_reviewed_at','updated_at','version']) then
  insert into public.article_revisions(article_id,entity_kind,entity_id,snapshot,editor_id) values(old.id,'article',old.id,to_jsonb(old)||jsonb_build_object('source_ids',(select jsonb_agg(source_id) from public.guide_source_links where article_id=old.id)),auth.uid());
  new.version:=old.version+1;new.published:=false;new.review_status:='draft';new.last_reviewed_at:=null;
 end if;new.updated_at:=clock_timestamp();return new;end$$;
create trigger guide_article_change before update on public.guide_articles for each row execute function private.guide_article_change();
create function private.guide_translation_change() returns trigger language plpgsql security definer set search_path='' as $$begin
 if tg_op='UPDATE' and (to_jsonb(new)-array['review_status','updated_at','article_version']) is distinct from (to_jsonb(old)-array['review_status','updated_at','article_version']) then
  insert into public.article_revisions(article_id,entity_kind,entity_id,snapshot,editor_id) values(old.article_id,'translation',old.id,to_jsonb(old),auth.uid());
  new.review_status:='draft';
  update public.guide_articles set version=version+1,published=false,review_status='draft',last_reviewed_at=null where id=new.article_id;
 end if;new.updated_at:=clock_timestamp();return new;end$$;
create trigger guide_translation_change before update on public.guide_translations for each row execute function private.guide_translation_change();
create function private.guide_item_change() returns trigger language plpgsql security definer set search_path='' as $$begin
 if tg_op='UPDATE' and (to_jsonb(new)-array['version','updated_at']) is distinct from (to_jsonb(old)-array['version','updated_at']) then new.version:=old.version+1;end if;
 update public.visa_checklist_templates set published=false,review_status='draft' where id=new.template_id and guide_category_id is not null;
 new.updated_at:=clock_timestamp();return new;end$$;
create trigger guide_item_change before insert or update on public.visa_checklist_items for each row execute function private.guide_item_change();
-- Source-link-only edits must also invalidate a guide's current review version.
create function private.guide_link_change() returns trigger language plpgsql security definer set search_path='' as $$begin
 if not exists(select 1 from public.guide_articles where id=case when tg_op='DELETE' then old.article_id else new.article_id end) then return null;end if;
 insert into public.article_revisions(article_id,entity_kind,entity_id,snapshot,editor_id) values(case when tg_op='DELETE' then old.article_id else new.article_id end,'source_link',case when tg_op='DELETE' then old.source_id else new.source_id end,jsonb_build_object('operation',tg_op,'old',case when tg_op='INSERT' then null else to_jsonb(old) end,'new',case when tg_op='DELETE' then null else to_jsonb(new) end),auth.uid());
 update public.guide_articles set version=version+1,published=false,review_status='draft',last_reviewed_at=null where id=case when tg_op='DELETE' then old.article_id else new.article_id end;
 return null;end$$;
create trigger guide_link_change after insert or update or delete on public.guide_source_links for each row execute function private.guide_link_change();
create function private.guide_source_change() returns trigger language plpgsql security definer set search_path='' as $$begin
 if new.category='guide' then
  if (to_jsonb(new)-array['published','review_status','verified_by','updated_at','reviewed_at']) is distinct from (to_jsonb(old)-array['published','review_status','verified_by','updated_at','reviewed_at']) then
   new.verified_by:=null;new.published:=false;new.review_status:='draft';
   insert into public.article_revisions(article_id,entity_kind,entity_id,snapshot,editor_id) select article_id,'source',old.id,to_jsonb(old),auth.uid() from public.guide_source_links where source_id=old.id;
   update public.guide_articles set version=version+1,published=false,review_status='draft',last_reviewed_at=null where id in (select article_id from public.guide_source_links where source_id=old.id);
   update public.visa_checklist_templates set published=false,review_status='draft' where source_id=old.id and guide_category_id is not null;
  end if;
  if new.published and (new.verified_by is null or new.verified_at is null or new.verified_at not between current_date-365 and current_date or new.jurisdiction='') then raise exception 'Guide source verification required';end if;
 end if;return new;end$$;
create trigger guide_source_change before update on public.official_resources for each row execute function private.guide_source_change();
create trigger guide_category_touch before update on public.guide_categories for each row execute function private.touch_updated_at();
revoke all on function private.guide_source_ready(uuid),private.guide_visible(uuid),private.guide_template_visible(uuid),private.guide_table(text),private.guide_article_change(),private.guide_translation_change(),private.guide_item_change(),private.guide_link_change(),private.guide_source_change() from public,anon,authenticated;
-- Policies need these read-only predicates, which expose only booleans about public content.
grant execute on function private.guide_visible(uuid),private.guide_template_visible(uuid) to anon,authenticated;
revoke all on function public.guide_catalog(),public.set_guide_preferences(jsonb),public.save_guide_item(uuid,boolean,text,date,timestamptz),public.submit_guide_feedback(uuid,text,text),public.admin_guide_save(text,uuid,jsonb,timestamptz),public.admin_guide_transition(text,uuid,text,timestamptz,text) from public;
grant execute on function public.guide_catalog() to anon,authenticated;
grant execute on function public.set_guide_preferences(jsonb),public.save_guide_item(uuid,boolean,text,date,timestamptz),public.submit_guide_feedback(uuid,text,text),public.admin_guide_save(text,uuid,jsonb,timestamptz),public.admin_guide_transition(text,uuid,text,timestamptz,text) to authenticated;
