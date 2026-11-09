-- Task 9: additive tenant management. No existing records are deleted or published.
begin;
alter table public.organizations drop constraint organizations_kind_check;
alter table public.organizations add constraint organizations_kind_check check(kind in ('institute','employer','ssw_center','training_provider'));
alter table public.organizations add column contact_email text not null default '' check(length(contact_email)<=254), add column contact_phone text not null default '' check(length(contact_phone)<=60), add column logo_url text not null default '' check(logo_url='' or logo_url ~ '^https://[^[:space:]]+$'), add column preferred_language text not null default 'en' check(preferred_language in ('en','ja','ne','hi')), add column timezone text not null default 'Asia/Tokyo' check(timezone in ('Asia/Tokyo','Asia/Kathmandu','Asia/Kolkata','UTC'));
alter table public.organization_members drop constraint organization_members_role_check;
alter table public.organization_members add constraint organization_members_role_check check(role in ('owner','administrator','instructor','manager','learner'));
alter table public.organization_members add column status text not null default 'active' check(status in ('active','inactive')), add column display_name text not null default 'Member' check(length(display_name) between 1 and 80), add column share_progress boolean not null default false, add column jlpt_level text not null default 'n5' check(jlpt_level in ('n5','n4','n3','n2','n1')), add column jft_preparing boolean not null default false, add column sector_id uuid references public.industry_sectors(id), add column updated_at timestamptz not null default clock_timestamp();
alter table public.profiles drop constraint profiles_preferred_language_check;
alter table public.profiles add constraint profiles_preferred_language_check check(preferred_language in ('en','ja','ne','hi'));
create or replace function private.create_profile() returns trigger language plpgsql security definer set search_path='' as $$begin
 insert into public.profiles(id,display_name,preferred_language,learning_goal,jlpt_target) values(new.id,left(coalesce(nullif(trim(new.raw_user_meta_data->>'display_name'),''),'Learner'),60),case when new.raw_user_meta_data->>'preferred_language' in ('en','ja','ne','hi') then new.raw_user_meta_data->>'preferred_language' else 'en' end,case when new.raw_user_meta_data->>'learning_goal' in ('jlpt','business','conversation','study','work','travel') then new.raw_user_meta_data->>'learning_goal' else 'jlpt' end,case when new.raw_user_meta_data->>'jlpt_target' in ('n5','n4','n3','n2','n1') then new.raw_user_meta_data->>'jlpt_target' else 'n5' end);return new;end$$;

create table public.organization_invitations(id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations(id),email text not null check(length(email) between 3 and 254),role text not null check(role in ('administrator','instructor','manager','learner')),token_hash text not null unique check(length(token_hash)=64),invited_by uuid not null references auth.users(id),expires_at timestamptz not null default now()+interval '7 days',accepted_at timestamptz,revoked_at timestamptz,created_at timestamptz not null default clock_timestamp());
create table public.classes(id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations(id),title text not null check(length(title) between 1 and 180),schedule text not null default '' check(length(schedule)<=1000),created_by uuid not null references auth.users(id),created_at timestamptz not null default clock_timestamp(),updated_at timestamptz not null default clock_timestamp(),unique(organization_id,id));
create table public.class_teachers(organization_id uuid not null,class_id uuid not null,user_id uuid not null,created_at timestamptz not null default clock_timestamp(),primary key(class_id,user_id),foreign key(organization_id,class_id) references public.classes(organization_id,id),foreign key(organization_id,user_id) references public.organization_members(organization_id,user_id));
create table public.class_enrollments(organization_id uuid not null,class_id uuid not null,user_id uuid not null,created_at timestamptz not null default clock_timestamp(),primary key(class_id,user_id),foreign key(organization_id,class_id) references public.classes(organization_id,id),foreign key(organization_id,user_id) references public.organization_members(organization_id,user_id));
alter table public.training_sessions add column class_id uuid;
alter table public.training_sessions add constraint training_session_class foreign key(organization_id,class_id) references public.classes(organization_id,id);
create table public.course_assignments(id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations(id),course_id uuid not null references public.courses(id),class_id uuid,learner_id uuid,deadline date,created_by uuid not null references auth.users(id),created_at timestamptz not null default clock_timestamp(),check((class_id is null)<>(learner_id is null)),foreign key(organization_id,class_id) references public.classes(organization_id,id),foreign key(organization_id,learner_id) references public.organization_members(organization_id,user_id));
create unique index assignment_class_unique on public.course_assignments(organization_id,course_id,class_id) where class_id is not null;
create unique index assignment_learner_unique on public.course_assignments(organization_id,course_id,learner_id) where learner_id is not null;
create table public.organization_reminders(id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations(id),assignment_id uuid not null references public.course_assignments(id),user_id uuid not null references auth.users(id),created_by uuid not null references auth.users(id),created_at timestamptz not null default clock_timestamp(),unique(assignment_id,user_id));
create table public.organization_audit_logs(id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations(id),actor_id uuid not null references auth.users(id),action text not null,entity_id uuid,detail jsonb not null default '{}',created_at timestamptz not null default clock_timestamp());
create index org_invite_org on public.organization_invitations(organization_id,created_at);
create index org_class_org on public.classes(organization_id);
create index org_teacher_user on public.class_teachers(organization_id,user_id);
create index org_enrollment_user on public.class_enrollments(organization_id,user_id);
create index org_session_class on public.training_sessions(organization_id,class_id,starts_at);
create index org_assignment_org on public.course_assignments(organization_id,course_id);
create index org_audit_org on public.organization_audit_logs(organization_id,created_at);
create index org_reminder_user on public.organization_reminders(organization_id,user_id);

create function private.org_role(p_org uuid) returns text language sql stable security definer set search_path='' as $$select role from public.organization_members where organization_id=p_org and user_id=(select auth.uid()) and status='active'$$;
create function private.org_admin(p_org uuid) returns boolean language sql stable security definer set search_path='' as $$select coalesce(private.org_role(p_org) in ('owner','administrator'),false) or public.is_admin()$$;
create function private.org_class_access(p_org uuid,p_class uuid) returns boolean language sql stable security definer set search_path='' as $$select private.org_admin(p_org) or (private.org_role(p_org) in ('instructor','manager') and exists(select 1 from public.class_teachers where organization_id=p_org and class_id=p_class and user_id=(select auth.uid())))$$;
create function private.org_person_access(p_org uuid,p_user uuid) returns boolean language sql stable security definer set search_path='' as $$select private.org_admin(p_org) or p_user=(select auth.uid()) and private.org_role(p_org) is not null or exists(select 1 from public.class_enrollments e where e.organization_id=p_org and e.user_id=p_user and private.org_class_access(p_org,e.class_id))$$;
create function private.org_assignment_access(p_org uuid,p_assignment uuid) returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from public.course_assignments a where a.organization_id=p_org and a.id=p_assignment and (private.org_admin(p_org) or a.class_id is not null and (private.org_class_access(p_org,a.class_id) or exists(select 1 from public.class_enrollments e where e.class_id=a.class_id and e.user_id=(select auth.uid()) and private.org_role(p_org) is not null)) or a.learner_id is not null and private.org_person_access(p_org,a.learner_id)))$$;
create or replace function public.is_organization_member(p_org uuid) returns boolean language sql stable security definer set search_path='' as $$select private.org_role(p_org) is not null$$;
create or replace function public.is_organization_staff(p_org uuid) returns boolean language sql stable security definer set search_path='' as $$select private.org_admin(p_org)$$;

-- Retire broad legacy staff policies; all writes go through audited, scoped RPCs.
do $$declare t text;r record;begin foreach t in array array['organizations','organization_members','organization_programs','training_sessions','attendance_records','training_reports','organization_invitations','classes','class_teachers','class_enrollments','course_assignments','organization_reminders','organization_audit_logs'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from anon,authenticated',t);
 for r in select policyname from pg_policies where schemaname='public' and tablename=t loop execute format('drop policy %I on public.%I',r.policyname,t);end loop;
 execute format('grant select on public.%I to authenticated',t);
end loop;end$$;
create policy org_read on public.organizations for select to authenticated using(public.is_organization_member(id) or public.is_admin());
create policy member_read on public.organization_members for select to authenticated using(private.org_person_access(organization_id,user_id));
create policy program_read on public.organization_programs for select to authenticated using(public.is_organization_member(organization_id) or public.is_admin());
create policy report_read on public.training_reports for select to authenticated using(private.org_admin(organization_id));
create policy invite_read on public.organization_invitations for select to authenticated using(false); -- hash never exposed through REST
create policy class_read on public.classes for select to authenticated using(private.org_class_access(organization_id,id) or private.org_role(organization_id) is not null and exists(select 1 from public.class_enrollments e where e.class_id=id and e.user_id=(select auth.uid())));
create policy teacher_read on public.class_teachers for select to authenticated using(private.org_class_access(organization_id,class_id));
create policy enrollment_read on public.class_enrollments for select to authenticated using(private.org_class_access(organization_id,class_id) or user_id=(select auth.uid()) and private.org_role(organization_id) is not null);
create policy session_read on public.training_sessions for select to authenticated using(private.org_admin(organization_id) or class_id is not null and (private.org_class_access(organization_id,class_id) or exists(select 1 from public.class_enrollments e where e.class_id=training_sessions.class_id and e.user_id=(select auth.uid()) and private.org_role(organization_id) is not null)));
create policy attendance_read on public.attendance_records for select to authenticated using(private.org_admin(organization_id) or student_id=(select auth.uid()) and private.org_role(organization_id) is not null or exists(select 1 from public.training_sessions s where s.id=session_id and private.org_class_access(organization_id,s.class_id)));
create policy assignment_read on public.course_assignments for select to authenticated using(private.org_assignment_access(organization_id,id));
create policy reminder_read on public.organization_reminders for select to authenticated using(user_id=(select auth.uid()) and private.org_role(organization_id) is not null or private.org_admin(organization_id));
create policy audit_read on public.organization_audit_logs for select to authenticated using(private.org_admin(organization_id));

create function private.org_audit(p_org uuid,p_action text,p_entity uuid,p_detail jsonb default '{}') returns void language sql security definer set search_path='' as $$insert into public.organization_audit_logs(organization_id,actor_id,action,entity_id,detail) values(p_org,auth.uid(),p_action,p_entity,p_detail)$$;
create function public.org_register(p_data jsonb) returns uuid language plpgsql security definer set search_path='' as $$declare v uuid;begin
 if auth.uid() is null or not exists(select 1 from auth.users u where u.id=auth.uid() and nullif(to_jsonb(u)->>'email_confirmed_at','') is not null) then raise exception 'Verified account required';end if;
 perform pg_advisory_xact_lock(hashtext(auth.uid()::text));
 if (select count(*) from public.organization_members where user_id=auth.uid() and role='owner')>=5 then raise exception 'Organization limit';end if;
 insert into public.organizations(name,kind,contact_email,contact_phone,logo_url,preferred_language,timezone) values(trim(p_data->>'name'),p_data->>'kind',coalesce(p_data->>'contact_email',''),coalesce(p_data->>'contact_phone',''),coalesce(p_data->>'logo_url',''),coalesce(p_data->>'preferred_language','en'),coalesce(p_data->>'timezone','Asia/Tokyo')) returning id into v;
 insert into public.organization_members(organization_id,user_id,role,display_name) values(v,auth.uid(),'owner',coalesce((select display_name from public.profiles where id=auth.uid()),'Owner'));
 perform private.org_audit(v,'organization.create',v);return v;end$$;
create function public.org_list() returns jsonb language sql stable security definer set search_path='' as $$select coalesce(jsonb_agg(jsonb_build_object('id',o.id,'name',o.name,'kind',o.kind,'role',case when public.is_admin() then 'platform_admin' else m.role end) order by o.name),'[]') from public.organizations o left join public.organization_members m on m.organization_id=o.id and m.user_id=(select auth.uid()) and m.status='active' where m.user_id is not null or public.is_admin()$$;

create function public.org_invite(p_org uuid,p_email text,p_role text,p_hash text) returns uuid language plpgsql security definer set search_path='' as $$declare v uuid;begin
 if not private.org_admin(p_org) or p_role='administrator' and private.org_role(p_org)<>'owner' and not public.is_admin() then raise exception 'Forbidden';end if;
 if p_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'Invalid email';end if;
 if (select count(*) from public.organization_invitations where organization_id=p_org and created_at>now()-interval '1 day')>=100 then raise exception 'Invitation limit';end if;
 update public.organization_invitations set revoked_at=clock_timestamp() where organization_id=p_org and email=lower(trim(p_email)) and accepted_at is null and revoked_at is null;
 insert into public.organization_invitations(organization_id,email,role,token_hash,invited_by) values(p_org,lower(trim(p_email)),p_role,p_hash,auth.uid()) returning id into v;
 perform private.org_audit(p_org,'invitation.create',v,jsonb_build_object('role',p_role));return v;end$$;
create function public.org_accept_invite(p_token text,p_share boolean) returns uuid language plpgsql security definer set search_path='' as $$declare i public.organization_invitations;mail text;begin
 select lower(to_jsonb(u)->>'email') into mail from auth.users u where u.id=auth.uid() and nullif(to_jsonb(u)->>'email_confirmed_at','') is not null;
 if mail is null or length(p_token)<>64 then raise exception 'Verified account required';end if;
 select * into i from public.organization_invitations where token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex') for update;
 if i.id is null or i.email<>mail or i.revoked_at is not null or i.accepted_at is not null or i.expires_at<=now() then raise exception 'Invitation unavailable';end if;
 if exists(select 1 from public.organization_members where organization_id=i.organization_id and user_id=auth.uid()) then raise exception 'Membership exists; ask the owner to reactivate';end if;
 insert into public.organization_members(organization_id,user_id,role,display_name,share_progress) values(i.organization_id,auth.uid(),i.role,coalesce((select display_name from public.profiles where id=auth.uid()),'Member'),coalesce(p_share,false));
 update public.organization_invitations set accepted_at=clock_timestamp() where id=i.id;
 perform private.org_audit(i.organization_id,'invitation.accept',i.id);return i.organization_id;end$$;

-- Generic command surface with explicit operation allowlist, field lists and tenant checks.
create function public.org_command(p_org uuid,p_action text,p_data jsonb) returns uuid language plpgsql security definer set search_path='' as $$declare v uuid;u uuid;c uuid;s uuid;a public.course_assignments;r text;old_role text;row_data jsonb;expected timestamptz;begin
 r:=private.org_role(p_org);
 if r is null and not public.is_admin() then raise exception 'Forbidden';end if;
 v:=nullif(p_data->>'id','')::uuid;u:=nullif(p_data->>'user_id','')::uuid;c:=nullif(p_data->>'class_id','')::uuid;
 if p_action='settings' then
  if not private.org_admin(p_org) then raise exception 'Forbidden';end if;
  update public.organizations set name=trim(p_data->>'name'),kind=p_data->>'kind',contact_email=coalesce(p_data->>'contact_email',''),contact_phone=coalesce(p_data->>'contact_phone',''),logo_url=coalesce(p_data->>'logo_url',''),preferred_language=p_data->>'preferred_language',timezone=p_data->>'timezone' where id=p_org;v:=p_org;
 elsif p_action='sharing' then
  update public.organization_members set share_progress=(p_data->>'share_progress')::boolean,updated_at=clock_timestamp() where organization_id=p_org and user_id=auth.uid();v:=auth.uid();
 elsif p_action='member' then
  if not private.org_admin(p_org) then raise exception 'Forbidden';end if;
  select role into old_role from public.organization_members where organization_id=p_org and user_id=u for update;
  if old_role is null or old_role='owner' or u=auth.uid() then raise exception 'Protected membership';end if;
  if p_data->>'role'<>old_role and r<>'owner' and not public.is_admin() then raise exception 'Only owner changes roles';end if;
  update public.organization_members set role=p_data->>'role',status=p_data->>'status',jlpt_level=p_data->>'jlpt_level',jft_preparing=(p_data->>'jft_preparing')::boolean,sector_id=nullif(p_data->>'sector_id','')::uuid,updated_at=clock_timestamp() where organization_id=p_org and user_id=u;v:=u;
 elsif p_action='revoke_invite' then
  if not private.org_admin(p_org) then raise exception 'Forbidden';end if;
  update public.organization_invitations set revoked_at=clock_timestamp() where id=v and organization_id=p_org and accepted_at is null;
 elsif p_action='class' then
  if not private.org_admin(p_org) and not (r='instructor' and (v is null or private.org_class_access(p_org,v))) then raise exception 'Forbidden';end if;
  if v is null then
   insert into public.classes(organization_id,title,schedule,created_by) values(p_org,trim(p_data->>'title'),coalesce(p_data->>'schedule',''),auth.uid()) returning id into v;
   if r='instructor' then insert into public.class_teachers(organization_id,class_id,user_id) values(p_org,v,auth.uid());end if;
  else
   update public.classes set title=trim(p_data->>'title'),schedule=coalesce(p_data->>'schedule',''),updated_at=clock_timestamp() where organization_id=p_org and id=v and updated_at=(p_data->>'expected')::timestamptz;
   if not found then raise exception 'Stale edit';end if;
  end if;
 elsif p_action in ('teacher','enroll') then
  if not private.org_class_access(p_org,c) or r='manager' then raise exception 'Forbidden';end if;
  if not exists(select 1 from public.classes where id=c and organization_id=p_org) or not exists(select 1 from public.organization_members where organization_id=p_org and user_id=u and status='active' and role=any(case when p_action='teacher' then array['instructor','manager'] else array['learner'] end)) then raise exception 'Invalid member';end if;
  if p_action='teacher' then
   if not private.org_admin(p_org) then raise exception 'Forbidden';end if;
   if coalesce((p_data->>'remove')::boolean,false) then delete from public.class_teachers where class_id=c and user_id=u;else insert into public.class_teachers values(p_org,c,u,clock_timestamp()) on conflict do nothing;end if;
  else
   if coalesce((p_data->>'remove')::boolean,false) then delete from public.class_enrollments where class_id=c and user_id=u;else insert into public.class_enrollments values(p_org,c,u,clock_timestamp()) on conflict do nothing;end if;
  end if;v:=c;
 elsif p_action='session' then
  if not private.org_class_access(p_org,c) or r='manager' then raise exception 'Forbidden';end if;
  insert into public.training_sessions(organization_id,class_id,title,starts_at) values(p_org,c,trim(p_data->>'title'),(p_data->>'starts_at')::timestamptz) returning id into v;
 elsif p_action='attendance' then
  s:=v;
  select class_id into c from public.training_sessions where id=s and organization_id=p_org;
  if c is null or not private.org_class_access(p_org,c) or r='manager' then raise exception 'Forbidden';end if;
  perform pg_advisory_xact_lock(hashtext(s::text));
  if jsonb_typeof(p_data->'records')<>'array' or jsonb_array_length(p_data->'records') not between 1 and 500 then raise exception 'Invalid attendance';end if;
  for row_data in select * from jsonb_array_elements(p_data->'records') loop
   u:=(row_data->>'user_id')::uuid;
   if not exists(select 1 from public.class_enrollments e join public.organization_members m on m.organization_id=e.organization_id and m.user_id=e.user_id where e.class_id=c and e.organization_id=p_org and e.user_id=u and m.status='active') then raise exception 'Learner not enrolled';end if;
   expected:=nullif(row_data->>'expected','')::timestamptz;
   if exists(select 1 from public.attendance_records where session_id=s and student_id=u) then
    update public.attendance_records set status=row_data->>'status',recorded_by=auth.uid() where session_id=s and student_id=u and updated_at=expected;
    if not found then raise exception 'Stale attendance';end if;
   else
    if expected is not null then raise exception 'Stale attendance';end if;
    insert into public.attendance_records(organization_id,session_id,student_id,status,recorded_by) values(p_org,s,u,row_data->>'status',auth.uid());
   end if;
   perform private.org_audit(p_org,'attendance.save',s,jsonb_build_object('learner',u,'status',row_data->>'status'));
  end loop;
 elsif p_action='assignment' then
  if r='manager' or not (private.org_admin(p_org) or c is not null and private.org_class_access(p_org,c) or u is not null and private.org_person_access(p_org,u) and r='instructor') then raise exception 'Forbidden';end if;
  if c is not null and not exists(select 1 from public.classes where organization_id=p_org and id=c) or u is not null and not exists(select 1 from public.organization_members where organization_id=p_org and user_id=u and role='learner' and status='active') then raise exception 'Invalid target';end if;
  if not exists(select 1 from public.courses where id=(p_data->>'course_id')::uuid and published and (program_id is null or exists(select 1 from public.learning_programs p where p.id=program_id and p.published))) then raise exception 'Course unavailable';end if;
  insert into public.course_assignments(organization_id,course_id,class_id,learner_id,deadline,created_by) values(p_org,(p_data->>'course_id')::uuid,c,u,nullif(p_data->>'deadline','')::date,auth.uid()) returning id into v;
 elsif p_action='remind' then
  select * into a from public.course_assignments where id=v and organization_id=p_org;
  if a.id is null or r='manager' or not (private.org_admin(p_org) or a.class_id is not null and private.org_class_access(p_org,a.class_id) or a.learner_id is not null and private.org_person_access(p_org,a.learner_id) and r='instructor') then raise exception 'Forbidden';end if;
  insert into public.organization_reminders(organization_id,assignment_id,user_id,created_by) select p_org,a.id,m.user_id,auth.uid() from public.organization_members m where m.organization_id=p_org and m.status='active' and (m.user_id=a.learner_id or exists(select 1 from public.class_enrollments e where e.class_id=a.class_id and e.user_id=m.user_id)) on conflict(assignment_id,user_id) do update set created_at=clock_timestamp(),created_by=auth.uid();
 else raise exception 'Unknown action';end if;
 if v is null then raise exception 'Record unavailable';end if;
 perform private.org_audit(p_org,p_action,v);return v;end$$;

-- Derived progress is restricted to explicitly shared, assigned courses. Never return transcripts,
-- checklist notes, global quiz answers, private exam results or unassigned learning history.
create function public.org_workspace(p_org uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$declare result jsonb;begin
 if private.org_role(p_org) is null and not public.is_admin() then raise exception 'Forbidden';end if;
 with visible_classes as(select * from public.classes c where c.organization_id=p_org and (private.org_class_access(p_org,c.id) or exists(select 1 from public.class_enrollments e where e.class_id=c.id and e.user_id=auth.uid()))),
 people as(select * from public.organization_members m where m.organization_id=p_org and private.org_person_access(p_org,m.user_id)),
 assignments as(select a.*,c.title course_title,c.slug course_level from public.course_assignments a join public.courses c on c.id=a.course_id where a.organization_id=p_org and private.org_assignment_access(p_org,a.id)),
 targets as(select a.*,m.user_id,m.display_name,m.share_progress,m.jlpt_level,m.sector_id,m.jft_preparing from assignments a join public.organization_members m on m.organization_id=p_org and m.role='learner' and m.status='active' and (m.user_id=a.learner_id or exists(select 1 from public.class_enrollments e where e.class_id=a.class_id and e.user_id=m.user_id)) where private.org_person_access(p_org,m.user_id)),
 reports as(select a.id assignment_id,a.course_id,a.course_title,a.course_level,a.class_id,a.deadline,a.user_id,a.display_name,a.jlpt_level,a.sector_id,a.jft_preparing,a.share_progress,
 case when a.share_progress or a.user_id=auth.uid() then (select count(*) from public.lessons l where l.course_id=a.course_id and private.content_visible('lesson',l.id)) end total_lessons,
 case when a.share_progress or a.user_id=auth.uid() then (select count(*) from public.lesson_progress p join public.lessons l on l.id=p.lesson_id where p.user_id=a.user_id and p.completed_at is not null and l.course_id=a.course_id and private.content_visible('lesson',l.id)) end completed_lessons,
 case when a.share_progress or a.user_id=auth.uid() then (select coalesce(jsonb_agg(jsonb_build_object('score',q.score,'total',q.total,'created_at',q.created_at,'subject',q.subject) order by q.created_at),'[]') from public.quiz_attempts q join public.question_banks b on b.id=q.bank_id where q.user_id=a.user_id and b.course_id=a.course_id) end practice,
 case when a.share_progress or a.user_id=auth.uid() then (select max(p.completed_at) from public.lesson_progress p join public.lessons l on l.id=p.lesson_id where p.user_id=a.user_id and l.course_id=a.course_id) end last_activity
 from targets a)
 select jsonb_build_object(
 'organization',(select to_jsonb(o) from public.organizations o where id=p_org),
 'role',case when public.is_admin() then 'platform_admin' else private.org_role(p_org) end,'user_id',auth.uid(),
 'members',coalesce((select jsonb_agg(to_jsonb(p)) from people p),'[]'),
 'classes',coalesce((select jsonb_agg(to_jsonb(c)) from visible_classes c),'[]'),
 'teachers',coalesce((select jsonb_agg(to_jsonb(t)) from public.class_teachers t where t.organization_id=p_org and t.class_id in (select id from visible_classes)),'[]'),
 'enrollments',coalesce((select jsonb_agg(to_jsonb(e)) from public.class_enrollments e where e.organization_id=p_org and e.class_id in (select id from visible_classes) and private.org_person_access(p_org,e.user_id)),'[]'),
 'sessions',coalesce((select jsonb_agg(to_jsonb(s) order by s.starts_at desc) from public.training_sessions s where s.organization_id=p_org and s.class_id in(select id from visible_classes)),'[]'),
 'attendance',coalesce((select jsonb_agg(to_jsonb(a)) from public.attendance_records a join public.training_sessions s on s.id=a.session_id where a.organization_id=p_org and s.class_id in(select id from visible_classes) and private.org_person_access(p_org,a.student_id)),'[]'),
 'assignments',coalesce((select jsonb_agg(to_jsonb(a)) from assignments a),'[]'),
 'reports',coalesce((select jsonb_agg(to_jsonb(r)) from reports r),'[]'),
 'invitations',case when private.org_admin(p_org) then coalesce((select jsonb_agg(jsonb_build_object('id',i.id,'email',i.email,'role',i.role,'expires_at',i.expires_at,'accepted_at',i.accepted_at,'revoked_at',i.revoked_at)) from public.organization_invitations i where i.organization_id=p_org),'[]') else '[]'::jsonb end,
 'reminders',coalesce((select jsonb_agg(to_jsonb(r)) from public.organization_reminders r where r.organization_id=p_org and r.user_id=auth.uid()),'[]'),
 'audit',case when private.org_admin(p_org) then coalesce((select jsonb_agg(to_jsonb(a)) from (select * from public.organization_audit_logs where organization_id=p_org order by created_at desc limit 100) a),'[]') else '[]'::jsonb end
 ) into result;return result;end$$;

do $$declare f record;begin
 for f in select p.oid::regprocedure signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where (n.nspname='public' and p.proname in ('org_register','org_list','org_invite','org_accept_invite','org_command','org_workspace')) or (n.nspname='private' and p.proname like 'org_%') loop
 execute format('revoke all on function %s from public,anon,authenticated',f.signature);
 end loop;
end$$;
grant execute on function private.org_role(uuid),private.org_admin(uuid),private.org_class_access(uuid,uuid),private.org_person_access(uuid,uuid),private.org_assignment_access(uuid,uuid) to authenticated;
grant execute on function public.org_register(jsonb),public.org_list(),public.org_invite(uuid,text,text,text),public.org_accept_invite(text,boolean),public.org_command(uuid,text,jsonb),public.org_workspace(uuid) to authenticated;
commit;

