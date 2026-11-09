begin;
-- CMS workspaces/revisions are private staging, not replacements for live content.
create table private.admin_role_assignments(user_id uuid primary key references auth.users(id) on delete cascade,role text not null check(role in ('super_admin','content_admin','content_editor','content_reviewer')),assigned_by uuid references auth.users(id) on delete set null,created_at timestamptz not null default now());
create table private.admin_audit_logs(id bigint generated always as identity primary key,actor_id uuid references auth.users(id) on delete set null,action text not null,entity_kind text,entity_id uuid,details jsonb not null default '{}',created_at timestamptz not null default now());
create table private.content_workspaces(entity_kind text not null,entity_id uuid not null,document jsonb not null,state text not null default 'draft' check(state in ('draft','in_review','approved','published','archived')),version integer not null default 1,author_id uuid references auth.users(id) on delete set null,reviewer_id uuid references auth.users(id) on delete set null,review_notes text,base_updated_at timestamptz,scheduled_at timestamptz,scheduled_by uuid references auth.users(id) on delete set null,published_at timestamptz,published_by uuid references auth.users(id) on delete set null,updated_at timestamptz not null default clock_timestamp(),primary key(entity_kind,entity_id));
create table private.content_revisions(id bigint generated always as identity primary key,entity_kind text not null,entity_id uuid not null,version integer not null,document jsonb not null,actor_id uuid references auth.users(id) on delete set null,created_at timestamptz not null default now(),unique(entity_kind,entity_id,version));
create index cms_review_queue on private.content_workspaces(state,updated_at desc);
create index cms_schedule_queue on private.content_workspaces(scheduled_at) where scheduled_at is not null;
create index cms_activity_recent on private.admin_audit_logs(created_at desc);
create index cms_revision_history on private.content_revisions(entity_kind,entity_id,version desc);
do $$declare t text;begin foreach t in array array['admin_role_assignments','admin_audit_logs','content_workspaces','content_revisions'] loop execute format('alter table private.%I enable row level security',t);execute format('revoke all on private.%I from public,anon,authenticated',t);end loop;end$$;

create function private.cms_role() returns text language sql stable security definer set search_path='' as $$
 select case when exists(select 1 from auth.users u where u.id=auth.uid() and to_jsonb(u)->>'email_confirmed_at' is not null and coalesce(to_jsonb(u)->>'is_anonymous','false')='false') then coalesce((select role from private.admin_role_assignments where user_id=auth.uid()),case when exists(select 1 from private.admin_users where user_id=auth.uid()) then 'super_admin' end) end
$$;
create function private.cms_can(p_permission text) returns boolean language sql stable security definer set search_path='' as $$select coalesce(case p_permission when 'read' then private.cms_role() is not null when 'edit' then private.cms_role() in ('super_admin','content_admin','content_editor') when 'review' then private.cms_role() in ('super_admin','content_admin','content_reviewer') when 'publish' then private.cms_role() in ('super_admin','content_admin') when 'users' then private.cms_role()='super_admin' else false end,false)$$;
create function private.cms_log(p_action text,p_kind text default null,p_id uuid default null,p_details jsonb default '{}') returns void language sql security definer set search_path='' as $$insert into private.admin_audit_logs(actor_id,action,entity_kind,entity_id,details) values(auth.uid(),p_action,p_kind,p_id,p_details)$$;
-- Existing allowlist remains valid; newly assigned Super Admins gain legacy tools.
create or replace function public.is_admin() returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from auth.users u where u.id=auth.uid() and to_jsonb(u)->>'email_confirmed_at' is not null and coalesce(to_jsonb(u)->>'is_anonymous','false')='false' and (exists(select 1 from private.admin_users where user_id=u.id) or exists(select 1 from private.admin_role_assignments a where a.user_id=u.id and a.role='super_admin')))$$;
create function public.cms_session() returns jsonb language sql stable security definer set search_path='' as $$select jsonb_build_object('role',private.cms_role(),'permissions',jsonb_build_object('read',private.cms_can('read'),'edit',private.cms_can('edit'),'review',private.cms_can('review'),'publish',private.cms_can('publish'),'users',private.cms_can('users')))$$;
create function private.cms_bootstrap(p_user uuid) returns void language plpgsql security definer set search_path='' as $$begin
 if exists(select 1 from private.admin_role_assignments where role='super_admin') then raise exception 'Initial administrator already assigned';end if;
 if not exists(select 1 from auth.users u where u.id=p_user and to_jsonb(u)->>'email_confirmed_at' is not null and coalesce(to_jsonb(u)->>'is_anonymous','false')='false') then raise exception 'Existing email-verified user required';end if;
 insert into private.admin_role_assignments(user_id,role) values(p_user,'super_admin');
 insert into private.admin_audit_logs(action,entity_kind,entity_id) values('owner_bootstrap','user',p_user);
end$$;
create function public.cms_assign_role(p_user uuid,p_role text) returns void language plpgsql security definer set search_path='' as $$begin
 if not private.cms_can('users') then raise exception 'Super Admin required' using errcode='42501';end if;
 perform pg_advisory_xact_lock(781302);
 if not private.cms_can('users') then raise exception 'Super Admin permission changed' using errcode='42501';end if;
 if p_user=auth.uid() then raise exception 'Self role changes are not allowed';end if;
 if exists(select 1 from private.admin_users where user_id=p_user) then raise exception 'Legacy allowlist changes require the database owner';end if;
 if p_role is not null and p_role not in ('super_admin','content_admin','content_editor','content_reviewer') then raise exception 'Invalid role';end if;
 if exists(select 1 from private.admin_role_assignments where user_id=p_user and role='super_admin') and p_role is distinct from 'super_admin' and (select count(*) from private.admin_role_assignments a join auth.users u on u.id=a.user_id where a.role='super_admin' and to_jsonb(u)->>'email_confirmed_at' is not null)<=1 and not exists(select 1 from private.admin_users a join auth.users u on u.id=a.user_id where to_jsonb(u)->>'email_confirmed_at' is not null) then raise exception 'Last verified Super Admin cannot be removed';end if;
 if p_role is not null and not exists(select 1 from auth.users u where u.id=p_user and to_jsonb(u)->>'email_confirmed_at' is not null and coalesce(to_jsonb(u)->>'is_anonymous','false')='false') then raise exception 'Email-verified account required';end if;
 if p_role is null then delete from private.admin_role_assignments where user_id=p_user;else insert into private.admin_role_assignments(user_id,role,assigned_by) values(p_user,p_role,auth.uid()) on conflict(user_id) do update set role=excluded.role,assigned_by=excluded.assigned_by;end if;
 perform private.cms_log('role_assignment','user',p_user,jsonb_build_object('role',p_role));
end$$;

-- Private adapters reuse the reviewed legacy validation/projection functions.
-- They cannot be invoked by any API role; only checked CMS RPCs call them.
do $$declare original text;definition text;target text;begin
 foreach original in array array['admin_save_content','admin_review_content','admin_learning_save','admin_learning_review','admin_learning_preview'] loop
 select pg_get_functiondef(p.oid) into definition from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname=original;
 target:='cms_'||original;
 definition:=replace(definition,'public.'||original||'(', 'private.'||target||'(');
 definition:=regexp_replace(definition,'if not public.is_admin\(\) then raise exception ''[^'']*''( using errcode=''42501'')?;end if;','','gi');
 definition:=replace(definition,'using gen_random_uuid(),payload','using nullif(current_setting(''nihonpath.cms_target'',true),'''')::uuid,payload');
 definition:=replace(definition,'coalesce(p_id,gen_random_uuid())','coalesce(p_id,nullif(current_setting(''nihonpath.cms_target'',true),'''')::uuid,gen_random_uuid())');
 if definition like '%if not public.is_admin()%' then raise exception 'CMS adapter authorization not normalized';end if;
 execute definition;
 end loop;
end$$;
create function private.cms_table(p_kind text) returns text language sql immutable set search_path='' as $$select case p_kind when 'vocabulary' then 'vocabulary' when 'bank' then 'question_banks' when 'deck' then 'flashcard_decks' else private.content_table(p_kind) end$$;
create function private.cms_live(p_kind text,p_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$declare doc jsonb;tbl text:=private.cms_table(p_kind);begin
 if tbl is null then raise exception 'Unsupported content kind';end if;
 if p_kind in ('vocabulary','bank','deck') then return private.cms_admin_learning_preview(p_kind,p_id);end if;
 execute format('select to_jsonb(t) from public.%I t where id=$1',tbl) into doc using p_id;
 if p_kind='course' and doc is not null then doc:=doc||jsonb_build_object('premium_feature',(select feature from public.premium_requirements where resource_table='courses' and resource_id=p_id));end if;
 if p_kind='translation' and doc is not null then doc:=doc||jsonb_build_object('target_kind',case when doc->>'lesson_id' is not null then 'lesson' when doc->>'course_id' is not null then 'course' when doc->>'program_id' is not null then 'program' when doc->>'module_id' is not null then 'module' else 'block' end,'target_id',coalesce(doc->>'lesson_id',doc->>'course_id',doc->>'program_id',doc->>'module_id',doc->>'block_id'));end if;
 return doc;
end$$;
create function private.cms_validate(p_kind text,p_doc jsonb) returns void language plpgsql set search_path='' as $$begin
 if private.cms_table(p_kind) is null or jsonb_typeof(p_doc)<>'object' or octet_length(p_doc::text)>200000 then raise exception 'Invalid document';end if;
 if p_kind not in ('block','vocabulary','kanji') and char_length(coalesce(p_doc->>'title','')) not between 1 and 180 then raise exception 'Title required';end if;
 if p_doc::text ~* '<\s*(script|iframe|object|embed|svg)|javascript\s*:|data\s*:text/html|onerror\s*=' then raise exception 'Unsafe content';end if;
 if p_kind in ('program','course','lesson') and coalesce(p_doc->>'slug','') !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then raise exception 'Invalid slug';end if;
 if p_kind='lesson' and (p_doc->>'subject' not in ('vocabulary','kanji','grammar','reading','listening') or jsonb_typeof(p_doc->'body') is distinct from 'object') then raise exception 'Valid lesson body required';end if;
 if p_kind='vocabulary' and (coalesce(p_doc->>'term','')='' or coalesce(p_doc->>'reading','')='' or coalesce(p_doc->>'meaning_en','')='') then raise exception 'Vocabulary fields required';end if;
 if nullif(p_doc->'seo'->>'canonical','') is not null and p_doc->'seo'->>'canonical' !~ '^https://nihonpath\.org(/[^?#]*)?$' then raise exception 'Canonical must use nihonpath.org';end if;
 if p_doc->'seo' ? 'index' and jsonb_typeof(p_doc->'seo'->'index')<>'boolean' then raise exception 'Search visibility must be a boolean';end if;
end$$;
create function public.cms_document(p_kind text,p_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$declare w private.content_workspaces;doc jsonb;begin
 if not private.cms_can('read') then raise exception 'CMS access required' using errcode='42501';end if;
 select * into w from private.content_workspaces where entity_kind=p_kind and entity_id=p_id;
 if found then return (to_jsonb(w)-'scheduled_by')||jsonb_build_object('live_published',p_kind='lesson' and private.content_visible('lesson',p_id));end if;
 doc:=private.cms_live(p_kind,p_id);if doc is null then return null;end if;
 return jsonb_build_object('entity_kind',p_kind,'entity_id',p_id,'version',0,'document',doc,'state',case when (doc->>'published')::boolean then 'published' else 'draft' end,'base_updated_at',doc->>'updated_at');
end$$;
create function public.cms_save(p_kind text,p_id uuid,p_document jsonb,p_version integer,p_base timestamptz default null) returns uuid language plpgsql security definer set search_path='' as $$declare w private.content_workspaces;live jsonb;result uuid:=coalesce(p_id,gen_random_uuid());begin
 if not private.cms_can('edit') then raise exception 'Editing permission required' using errcode='42501';end if;
 perform private.cms_validate(p_kind,p_document);perform pg_advisory_xact_lock(hashtextextended(p_kind||result::text,13));
 select * into w from private.content_workspaces where entity_kind=p_kind and entity_id=result for update;
 if found then
  if w.version<>p_version then raise exception 'Stale revision';end if;
  update private.content_workspaces set document=p_document,state='draft',version=version+1,author_id=auth.uid(),reviewer_id=null,review_notes=null,scheduled_at=null,scheduled_by=null,updated_at=clock_timestamp() where entity_kind=p_kind and entity_id=result returning * into w;
 else
  if p_version<>0 then raise exception 'Stale revision';end if;
  live:=private.cms_live(p_kind,result);
  if live is not null and (live->>'updated_at')::timestamptz is distinct from p_base then raise exception 'Live content changed';end if;
  insert into private.content_workspaces(entity_kind,entity_id,document,author_id,base_updated_at) values(p_kind,result,p_document,auth.uid(),(live->>'updated_at')::timestamptz) returning * into w;
 end if;
 insert into private.content_revisions(entity_kind,entity_id,version,document,actor_id) values(p_kind,result,w.version,p_document,auth.uid());
 perform private.cms_log('save_draft',p_kind,result,jsonb_build_object('version',w.version));return result;
end$$;
create function private.cms_project(p_kind text,p_id uuid,p_actor uuid) returns void language plpgsql security definer set search_path='' as $$declare w private.content_workspaces;live jsonb;result uuid;stamp timestamptz;tbl text:=private.cms_table(p_kind);action text;begin
 select * into strict w from private.content_workspaces where entity_kind=p_kind and entity_id=p_id for update;
 if w.state<>'approved' or w.reviewer_id is null or w.reviewer_id=w.author_id then raise exception 'Independent approval required';end if;
 perform private.cms_validate(p_kind,w.document);live:=private.cms_live(p_kind,p_id);
 if (live->>'updated_at')::timestamptz is distinct from w.base_updated_at then raise exception 'Live content changed; reconcile a new draft';end if;
 perform set_config('nihonpath.cms_target',p_id::text,true);
 if p_kind in ('vocabulary','deck','bank') then result:=private.cms_admin_learning_save(p_kind,case when live is null then null else p_id end,w.document,(live->>'updated_at')::timestamptz);
 else result:=private.cms_admin_save_content(p_kind,case when live is null then null else p_id end,w.document,(live->>'updated_at')::timestamptz);end if;
 if result<>p_id then raise exception 'Projection ID mismatch';end if;
 if p_kind='lesson' then update public.lessons set subject=w.document->>'subject' where id=p_id;end if;
 foreach action in array array['request_review','approve','publish'] loop
  execute format('select updated_at from public.%I where id=$1',tbl) into stamp using result;
  if p_kind in ('vocabulary','deck','bank') then perform private.cms_admin_learning_review(p_kind,result,action,stamp);else perform private.cms_admin_review_content(p_kind,result,action,stamp);end if;
 end loop;
 select private.cms_live(p_kind,p_id) into live;
 update private.content_workspaces set state='published',version=version+1,base_updated_at=(live->>'updated_at')::timestamptz,published_at=clock_timestamp(),published_by=p_actor,scheduled_at=null,scheduled_by=null,updated_at=clock_timestamp() where entity_kind=p_kind and entity_id=p_id;
 insert into private.admin_audit_logs(actor_id,action,entity_kind,entity_id) values(p_actor,'publish',p_kind,p_id);
end$$;
create function public.cms_transition(p_kind text,p_id uuid,p_version integer,p_action text,p_notes text default '',p_when timestamptz default null) returns void language plpgsql security definer set search_path='' as $$declare w private.content_workspaces;tbl text:=private.cms_table(p_kind);live jsonb;begin
 if not private.cms_can('read') or tbl is null then raise exception 'CMS access required' using errcode='42501';end if;
 select * into strict w from private.content_workspaces where entity_kind=p_kind and entity_id=p_id for update;
 if w.version<>p_version then raise exception 'Stale revision';end if;
 case p_action
 when 'submit' then if not private.cms_can('edit') or w.state<>'draft' then raise exception 'Draft and editing permission required';end if;update private.content_workspaces set state='in_review' where entity_kind=p_kind and entity_id=p_id;
 when 'approve' then if not private.cms_can('review') or w.state<>'in_review' or w.author_id=auth.uid() or char_length(trim(p_notes))<10 then raise exception 'Independent reviewer and review notes required';end if;update private.content_workspaces set state='approved',reviewer_id=auth.uid(),review_notes=p_notes where entity_kind=p_kind and entity_id=p_id;
 when 'reject' then if not private.cms_can('review') or w.state<>'in_review' or char_length(trim(p_notes))<10 then raise exception 'Review permission and feedback required';end if;update private.content_workspaces set state='draft',reviewer_id=null,review_notes=p_notes where entity_kind=p_kind and entity_id=p_id;
 when 'publish' then if not private.cms_can('publish') then raise exception 'Publisher required';end if;perform private.cms_project(p_kind,p_id,auth.uid());return;
 when 'schedule' then if not private.cms_can('publish') or w.state<>'approved' or p_when is null or p_when<=now() or p_when>now()+interval '1 year' then raise exception 'Approved content and future schedule required';end if;update private.content_workspaces set scheduled_at=p_when,scheduled_by=auth.uid() where entity_kind=p_kind and entity_id=p_id;
 when 'unpublish','archive' then
  if not private.cms_can('publish') then raise exception 'Publisher required';end if;
  execute format('update public.%I set published=false where id=$1',tbl) using p_id;
  live:=private.cms_live(p_kind,p_id);
  update private.content_workspaces set state=case when p_action='archive' then 'archived' else 'draft' end,base_updated_at=(live->>'updated_at')::timestamptz,scheduled_at=null,scheduled_by=null where entity_kind=p_kind and entity_id=p_id;
 when 'delete' then
  if not private.cms_can('publish') or w.published_at is not null or private.cms_live(p_kind,p_id) is not null then raise exception 'Only never-published drafts may be deleted; archive live content';end if;
  delete from private.content_workspaces where entity_kind=p_kind and entity_id=p_id;perform private.cms_log('delete_draft',p_kind,p_id);return;
 else raise exception 'Invalid transition';end case;
 update private.content_workspaces set version=version+1,updated_at=clock_timestamp() where entity_kind=p_kind and entity_id=p_id;
 perform private.cms_log(p_action,p_kind,p_id,jsonb_build_object('notes',left(p_notes,2000)));
end$$;
create function public.cms_history(p_kind text,p_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$begin
 if not private.cms_can('read') then raise exception 'CMS access required';end if;
 return coalesce((select jsonb_agg(to_jsonb(r) order by version desc) from (select id,version,created_at,actor_id,document from private.content_revisions where entity_kind=p_kind and entity_id=p_id order by version desc limit 30) r),'[]');
end$$;
create function public.cms_restore(p_kind text,p_id uuid,p_revision bigint,p_version integer) returns uuid language plpgsql security definer set search_path='' as $$declare doc jsonb;begin
 if not private.cms_can('edit') then raise exception 'Editor required';end if;
 select document into strict doc from private.content_revisions where id=p_revision and entity_kind=p_kind and entity_id=p_id;
 perform private.cms_log('restore_to_draft',p_kind,p_id,jsonb_build_object('revision',p_revision));
 return public.cms_save(p_kind,p_id,doc,p_version,null);
end$$;
create function public.cms_catalog(p_kind text,p_query text default '',p_state text default '',p_offset integer default 0) returns jsonb language plpgsql security definer set search_path='' as $$declare tbl text:=private.cms_table(p_kind);result jsonb;begin
 if not private.cms_can('read') or tbl is null then raise exception 'CMS access required';end if;
 if char_length(p_query)>100 or p_offset not between 0 and 100000 then raise exception 'Invalid search';end if;
 execute format($q$with rows as (select id,coalesce(to_jsonb(t)->>'title',to_jsonb(t)->>'term',to_jsonb(t)->>'kind') title,case when published then 'published' else review_status end state,updated_at from public.%I t where not exists(select 1 from private.content_workspaces w where w.entity_kind=$1 and w.entity_id=t.id) union all select entity_id,coalesce(document->>'title',document->>'term',document->>'kind'),state,updated_at from private.content_workspaces where entity_kind=$1) select coalesce(jsonb_agg(to_jsonb(r)),'[]') from (select * from rows where title ilike '%%'||$2||'%%' and ($3='' or state=$3) order by updated_at desc,id limit 40 offset $4) r$q$,tbl) into result using p_kind,p_query,p_state,p_offset;
 return result;
end$$;
create function public.cms_dashboard() returns jsonb language plpgsql security definer set search_path='' as $$begin
 if not private.cms_can('read') then raise exception 'CMS access required';end if;
 return jsonb_build_object('stats',jsonb_build_object('learners',(select count(*) from public.profiles),'courses',(select count(*) from public.courses),'lessons',(select count(*) from public.lessons where published),'vocabulary',(select count(*) from public.vocabulary),'questions',(select count(*) from public.questions),'exams',(select count(*) from public.exam_templates),'review',(select count(*) from private.content_workspaces where state='in_review'),'drafts',(select count(*) from private.content_workspaces where state='draft')),'activity',coalesce((select jsonb_agg(to_jsonb(a)) from (select action,entity_kind,entity_id,created_at from private.admin_audit_logs order by id desc limit 12) a),'[]'),'queue',coalesce((select jsonb_agg(to_jsonb(w)) from (select entity_kind,entity_id,document->>'title' title,updated_at from private.content_workspaces where state='in_review' order by updated_at limit 12) w),'[]'));
end$$;
create function public.cms_references() returns jsonb language plpgsql security definer set search_path='' as $$begin
 if not private.cms_can('read') then raise exception 'CMS access required';end if;
 return jsonb_build_object('courses',coalesce((select jsonb_agg(to_jsonb(r)) from (select id,title,slug,program_id from public.courses order by title limit 500) r),'[]'),'modules',coalesce((select jsonb_agg(to_jsonb(r)) from (select id,title,course_id,position from public.course_modules order by title limit 500) r),'[]'),'programs',coalesce((select jsonb_agg(to_jsonb(r)) from (select id,title,slug from public.learning_programs order by title limit 100) r),'[]'));
end$$;
create function public.cms_run_scheduled() returns jsonb language plpgsql security definer set search_path='' as $$declare w private.content_workspaces;n integer:=0;failed integer:=0;begin
 for w in select * from private.content_workspaces where state='approved' and scheduled_at<=now() order by scheduled_at limit 20 for update skip locked loop
  begin
   if not exists(select 1 from private.admin_role_assignments where user_id=w.scheduled_by and role in ('super_admin','content_admin')) and not exists(select 1 from private.admin_users where user_id=w.scheduled_by) then raise exception 'Publisher permission revoked';end if;
   perform private.cms_project(w.entity_kind,w.entity_id,w.scheduled_by);n:=n+1;
  exception when others then
   update private.content_workspaces set scheduled_at=null,scheduled_by=null,version=version+1 where entity_kind=w.entity_kind and entity_id=w.entity_id;
   perform private.cms_log('schedule_failed',w.entity_kind,w.entity_id);failed:=failed+1;
  end;
 end loop;return jsonb_build_object('published',n,'failed',failed);
end$$;
create function public.cms_users(p_query text default '',p_offset integer default 0) returns jsonb language plpgsql security definer set search_path='' as $$begin
 if not private.cms_can('users') then raise exception 'Super Admin required';end if;
 if char_length(p_query)>100 or p_offset not between 0 and 100000 then raise exception 'Invalid search';end if;
 perform private.cms_log('user_directory_read');
 return coalesce((select jsonb_agg(to_jsonb(r)) from (select u.id,to_jsonb(u)->>'email' email,p.display_name,u.created_at,to_jsonb(u)->>'email_confirmed_at' email_confirmed_at,to_jsonb(u)->>'banned_until' banned_until,coalesce(nullif(to_jsonb(u)->>'banned_until','')::timestamptz>now(),false) suspended,coalesce(a.role,case when exists(select 1 from private.admin_users where user_id=u.id) then 'super_admin' end) role,exists(select 1 from private.admin_users where user_id=u.id) legacy_admin,(select count(*) from public.course_enrollments e where e.user_id=u.id) enrollments,(select count(*) from public.support_requests s where s.user_id=u.id) support_requests from auth.users u left join public.profiles p on p.id=u.id left join private.admin_role_assignments a on a.user_id=u.id where coalesce(p.display_name,'') ilike '%'||p_query||'%' or coalesce(to_jsonb(u)->>'email','') ilike '%'||p_query||'%' order by u.created_at desc,u.id limit 30 offset p_offset) r),'[]');
end$$;
do $$declare f record;begin for f in select p.oid::regprocedure signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='private' and p.proname like 'cms_%' loop execute format('revoke all on function %s from public,anon,authenticated',f.signature);end loop;end$$;
do $$declare f record;begin for f in select p.oid::regprocedure signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'cms_%' loop execute format('revoke all on function %s from public,anon,authenticated',f.signature);if f.signature::text not like '%cms_run_scheduled%' then execute format('grant execute on function %s to authenticated',f.signature);end if;end loop;end$$;
do $$begin if exists(select 1 from pg_roles where rolname='service_role') then grant execute on function public.cms_run_scheduled() to service_role;end if;end$$;
commit;
