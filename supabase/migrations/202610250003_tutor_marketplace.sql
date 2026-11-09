-- Task 10. Preserve prototype bookings; requested becomes the equivalent pending state.
begin;
create table public.tutor_applications(user_id uuid primary key references auth.users(id) on delete cascade,display_name text not null check(length(display_name) between 1 and 80),photo_url text not null default '' check(photo_url='' or photo_url ~ '^https://[^[:space:]]+$'),languages text[] not null check(cardinality(languages) between 1 and 10 and languages<@array['ja','en','ne','hi','zh','ko','es','fr','de','vi','id','th']),country text not null check(length(country) between 2 and 80),timezone text not null,specialties text[] not null check(cardinality(specialties) between 1 and 10 and specialties<@array['jlpt','jft','business','workplace','interviews','conversation','grammar','pronunciation','industry']),levels text[] not null check(levels<@array['n5','n4','n3','n2','n1'] and cardinality(levels)>0),experience_years integer not null check(experience_years between 0 and 80),biography text not null check(length(biography) between 50 and 4000),video_url text not null default '' check(video_url='' or video_url ~ '^https://[^[:space:]]+$'),credentials text not null default '' check(length(credentials)<=4000),durations integer[] not null check(durations<@array[25,30,45,50,60] and cardinality(durations)>0),proposed_price_minor integer not null default 0 check(proposed_price_minor between 0 and 10000000),currency text not null default 'JPY' check(currency in ('JPY','USD','NPR','INR')),status text not null default 'draft' check(status in ('draft','submitted','under_review','approved','rejected','suspended')),review_notes text not null default '',reviewed_by uuid references auth.users(id) on delete set null,reviewed_at timestamptz,created_at timestamptz not null default clock_timestamp(),updated_at timestamptz not null default clock_timestamp());
create table public.tutor_profiles(user_id uuid primary key references public.tutor_applications(user_id) on delete cascade,slug text not null unique check(slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),display_name text not null,photo_url text not null default '',languages text[] not null,country text not null,timezone text not null,specialties text[] not null,levels text[] not null,experience_years integer not null,biography text not null,video_url text not null default '',qualification_summary text not null default '' check(length(qualification_summary)<=2000),qualifications_verified boolean not null default false,published boolean not null default false,notice_hours integer not null default 24 check(notice_hours between 0 and 168),horizon_days integer not null default 30 check(horizon_days between 7 and 90),created_at timestamptz not null default clock_timestamp(),updated_at timestamptz not null default clock_timestamp());
create table public.tutor_lesson_types(id uuid primary key default gen_random_uuid(),tutor_id uuid not null references public.tutor_profiles(user_id) on delete cascade,title text not null check(length(title) between 1 and 160),specialty text not null check(specialty in ('jlpt','jft','business','workplace','interviews','conversation','grammar','pronunciation','industry')),duration_minutes integer not null check(duration_minutes in (25,30,45,50,60)),price_minor integer not null check(price_minor between 0 and 10000000),currency text not null check(currency in ('JPY','USD','NPR','INR')),published boolean not null default false,created_at timestamptz not null default clock_timestamp(),updated_at timestamptz not null default clock_timestamp(),unique(tutor_id,id));
create table public.tutor_availability_rules(id uuid primary key default gen_random_uuid(),tutor_id uuid not null references public.tutor_profiles(user_id) on delete cascade,weekday integer not null check(weekday between 0 and 6),start_time time not null,end_time time not null,created_at timestamptz not null default clock_timestamp(),check(end_time>start_time),unique(tutor_id,weekday,start_time,end_time));
create table public.tutor_availability_exceptions(id uuid primary key default gen_random_uuid(),tutor_id uuid not null references public.tutor_profiles(user_id) on delete cascade,kind text not null check(kind in ('available','blocked')),starts_at timestamptz not null,ends_at timestamptz not null,created_at timestamptz not null default clock_timestamp(),check(ends_at>starts_at and ends_at-starts_at<=interval '31 days'));
alter table public.tutor_bookings drop constraint tutor_bookings_status_check;
update public.tutor_bookings set status='pending' where status='requested';
alter table public.tutor_bookings alter column status set default 'pending';
alter table public.tutor_bookings add constraint tutor_bookings_status_check check(status in ('pending','confirmed','declined','cancelled','completed','no_show'));
alter table public.tutor_bookings add column lesson_type_id uuid references public.tutor_lesson_types(id) on delete set null,add column lesson_title text not null default 'Legacy lesson',add column duration_minutes integer,add column price_minor integer,add column currency text,add column learning_goals text not null default '' check(length(learning_goals)<=2000),add column request_expires_at timestamptz,add column cancellation_requested_at timestamptz,add column learner_completed_at timestamptz,add column tutor_completed_at timestamptz,add column request_key uuid,add column status_reason text not null default '' check(length(status_reason)<=2000),add constraint tutor_booking_request_key unique(learner_id,request_key);
create table public.tutor_booking_events(id uuid primary key default gen_random_uuid(),booking_id uuid not null references public.tutor_bookings(id) on delete cascade,actor_id uuid references auth.users(id) on delete set null,event text not null,created_at timestamptz not null default clock_timestamp());
create table public.tutor_lesson_notes(booking_id uuid not null references public.tutor_bookings(id) on delete cascade,author_id uuid not null references auth.users(id) on delete cascade,note text not null check(length(note)<=3000),updated_at timestamptz not null default clock_timestamp(),primary key(booking_id,author_id));
create table public.tutor_meetings(booking_id uuid primary key references public.tutor_bookings(id) on delete cascade,url text not null check(length(url)<=2000 and url ~ '^https://[^[:space:]]+$'),updated_at timestamptz not null default clock_timestamp());
create table public.tutor_reviews(id uuid primary key default gen_random_uuid(),booking_id uuid not null unique references public.tutor_bookings(id) on delete cascade,tutor_id uuid not null references public.tutor_profiles(user_id) on delete cascade,learner_id uuid not null references auth.users(id) on delete cascade,rating integer not null check(rating between 1 and 5),body text not null check(length(body) between 10 and 2000),response text not null default '' check(length(response)<=2000),moderation_status text not null default 'pending' check(moderation_status in ('pending','published','hidden')),created_at timestamptz not null default clock_timestamp(),updated_at timestamptz not null default clock_timestamp());
create table public.tutor_reports(id uuid primary key default gen_random_uuid(),reporter_id uuid not null references auth.users(id) on delete cascade,tutor_id uuid references public.tutor_profiles(user_id) on delete cascade,booking_id uuid references public.tutor_bookings(id) on delete cascade,review_id uuid references public.tutor_reviews(id) on delete cascade,reason text not null check(length(reason) between 10 and 2000),status text not null default 'open' check(status in ('open','resolved')),created_at timestamptz not null default clock_timestamp(),check(num_nonnulls(tutor_id,booking_id,review_id)=1));
create table public.tutor_moderation_logs(id uuid primary key default gen_random_uuid(),admin_id uuid references auth.users(id) on delete set null,tutor_id uuid references public.tutor_applications(user_id) on delete cascade,action text not null,notes text not null check(length(notes) between 10 and 4000),created_at timestamptz not null default clock_timestamp());
create table public.tutor_request_limits(user_id uuid not null references auth.users(id) on delete cascade,day date not null,requests integer not null check(requests between 0 and 20),primary key(user_id,day));
create index tutor_profile_search on public.tutor_profiles(published,experience_years);
create index tutor_lesson_owner on public.tutor_lesson_types(tutor_id,published);
create index tutor_rule_owner on public.tutor_availability_rules(tutor_id,weekday);
create index tutor_exception_owner on public.tutor_availability_exceptions(tutor_id,starts_at);
create index tutor_booking_schedule on public.tutor_bookings(tutor_id,starts_at,ends_at);
create index tutor_booking_learner_schedule on public.tutor_bookings(learner_id,starts_at,ends_at);
create index tutor_event_booking on public.tutor_booking_events(booking_id,created_at);
create index tutor_review_public on public.tutor_reviews(tutor_id,moderation_status);
create index tutor_report_status on public.tutor_reports(status,created_at);
create index tutor_log_owner on public.tutor_moderation_logs(tutor_id,created_at);
create index tutor_note_author on public.tutor_lesson_notes(author_id);
create index tutor_review_learner on public.tutor_reviews(learner_id);
create index tutor_report_reporter on public.tutor_reports(reporter_id,created_at);
create index tutor_log_recent on public.tutor_moderation_logs(created_at desc);
create index tutor_limits_retention on public.tutor_request_limits(day);

create function private.tutor_approved(p_tutor uuid) returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from public.tutor_applications where user_id=p_tutor and status='approved')$$;
create function private.tutor_public(p_tutor uuid) returns boolean language sql stable security definer set search_path='' as $$select private.tutor_approved(p_tutor) and exists(select 1 from public.tutor_profiles where user_id=p_tutor and published)$$;
create function private.tutor_participant(p_booking uuid) returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from public.tutor_bookings where id=p_booking and (learner_id=(select auth.uid()) or tutor_id=(select auth.uid())))$$;
create function private.tutor_audit(p_tutor uuid,p_action text,p_notes text) returns void language sql security definer set search_path='' as $$insert into public.tutor_moderation_logs(admin_id,tutor_id,action,notes) values(auth.uid(),p_tutor,p_action,p_notes)$$;
create function private.tutor_lock(p_one uuid,p_two uuid) returns void language plpgsql set search_path='' as $$begin perform pg_advisory_xact_lock(hashtext('tutor-schedule:'||least(p_one,p_two)::text));if p_one<>p_two then perform pg_advisory_xact_lock(hashtext('tutor-schedule:'||greatest(p_one,p_two)::text));end if;end$$;
create function private.tutor_interval_stable(p_zone text,p_start timestamptz,p_end timestamptz) returns boolean language sql stable set search_path='' as $$select (p_start at time zone p_zone)::date=(p_end at time zone p_zone)::date and (p_end at time zone p_zone)-(p_start at time zone p_zone)=p_end-p_start$$;
create function private.tutor_slot_valid(p_tutor uuid,p_type uuid,p_start timestamptz,p_end timestamptz,p_ignore uuid default null,p_notice boolean default true) returns boolean language plpgsql stable security definer set search_path='' as $$declare p public.tutor_profiles;l public.tutor_lesson_types;s timestamp;e timestamp;begin
 select * into p from public.tutor_profiles where user_id=p_tutor;select * into l from public.tutor_lesson_types where id=p_type and tutor_id=p_tutor and published;
 if p.user_id is null or l.id is null or not private.tutor_approved(p_tutor) or p_notice and not p.published or p_start<=now() or p_start>now()+make_interval(days=>p.horizon_days) or p_notice and p_start<now()+make_interval(hours=>p.notice_hours) or p_end-p_start<>make_interval(mins=>l.duration_minutes) or mod(extract(epoch from p_start)::numeric,900)<>0 then return false;end if;
 s:=p_start at time zone p.timezone;e:=p_end at time zone p.timezone;
 -- UTC candidates eliminate nonexistent local times; do not offer a lesson crossing an offset change.
 if not private.tutor_interval_stable(p.timezone,p_start,p_end) then return false;end if;
 if not (exists(select 1 from public.tutor_availability_rules r where r.tutor_id=p_tutor and r.weekday=extract(dow from s)::int and r.start_time<=s::time and r.end_time>=e::time) or exists(select 1 from public.tutor_availability_exceptions x where x.tutor_id=p_tutor and x.kind='available' and x.starts_at<=p_start and x.ends_at>=p_end)) then return false;end if;
 if exists(select 1 from public.tutor_availability_exceptions x where x.tutor_id=p_tutor and x.kind='blocked' and x.starts_at<p_end and x.ends_at>p_start) then return false;end if;
 return not exists(select 1 from public.tutor_bookings b where b.id is distinct from p_ignore and (b.tutor_id=p_tutor or b.learner_id=p_tutor) and b.starts_at<p_end and b.ends_at>p_start and (b.status='confirmed' or b.status='pending' and (b.request_expires_at is null or b.request_expires_at>now())));
end$$;

-- No public table contains private application credentials or meeting links.
do $$declare t text;begin foreach t in array array['tutor_applications','tutor_profiles','tutor_lesson_types','tutor_availability_rules','tutor_availability_exceptions','tutor_booking_events','tutor_lesson_notes','tutor_meetings','tutor_reviews','tutor_reports','tutor_moderation_logs','tutor_request_limits'] loop execute format('alter table public.%I enable row level security',t);execute format('revoke all on public.%I from anon,authenticated',t);end loop;end$$;
grant select on public.tutor_applications,public.tutor_availability_rules,public.tutor_availability_exceptions,public.tutor_booking_events,public.tutor_lesson_notes,public.tutor_meetings,public.tutor_reports,public.tutor_moderation_logs to authenticated;
grant select on public.tutor_profiles,public.tutor_lesson_types to anon,authenticated;
grant select on public.tutor_reviews to authenticated;
create policy application_private on public.tutor_applications for select to authenticated using(user_id=(select auth.uid()) or public.is_admin());
create policy tutor_visible on public.tutor_profiles for select using(private.tutor_public(user_id) or user_id=(select auth.uid()) or public.is_admin());
create policy tutor_lesson_visible on public.tutor_lesson_types for select using(published and private.tutor_public(tutor_id) or tutor_id=(select auth.uid()) or public.is_admin());
create policy tutor_rules_private on public.tutor_availability_rules for select to authenticated using(tutor_id=(select auth.uid()));
create policy tutor_exceptions_private on public.tutor_availability_exceptions for select to authenticated using(tutor_id=(select auth.uid()));
create policy tutor_events_private on public.tutor_booking_events for select to authenticated using(private.tutor_participant(booking_id));
create policy tutor_notes_private on public.tutor_lesson_notes for select to authenticated using(author_id=(select auth.uid()) and private.tutor_participant(booking_id));
create policy tutor_meeting_private on public.tutor_meetings for select to authenticated using(exists(select 1 from public.tutor_bookings b where b.id=booking_id and private.tutor_participant(b.id) and b.status in ('confirmed','completed') and b.ends_at>now()-interval '1 day'));
-- Public review projection is an RPC: raw learner identifiers never become public.
create policy tutor_review_private on public.tutor_reviews for select using(learner_id=(select auth.uid()) or tutor_id=(select auth.uid()) or public.is_admin());
create policy tutor_report_private on public.tutor_reports for select to authenticated using(reporter_id=(select auth.uid()) or public.is_admin());
create policy tutor_logs_private on public.tutor_moderation_logs for select to authenticated using(public.is_admin());

create function public.tutor_application_save(p_data jsonb,p_expected timestamptz default null,p_submit boolean default false) returns uuid language plpgsql security definer set search_path='' as $$declare a public.tutor_applications;begin
 if auth.uid() is null then raise exception 'Sign in required';end if;
 perform private.tutor_lock(auth.uid(),auth.uid());
 select * into a from public.tutor_applications where user_id=auth.uid() for update;
 if a.status='suspended' then raise exception 'Application suspended';end if;
 if a.user_id is not null and (p_expected is null or a.updated_at<>p_expected) then raise exception 'Stale application';end if;
 if not exists(select 1 from pg_timezone_names where name=p_data->>'timezone') then raise exception 'Invalid timezone';end if;
 insert into public.tutor_applications(user_id,display_name,photo_url,languages,country,timezone,specialties,levels,experience_years,biography,video_url,credentials,durations,proposed_price_minor,currency)
 values(auth.uid(),trim(p_data->>'display_name'),coalesce(p_data->>'photo_url',''),array(select jsonb_array_elements_text(p_data->'languages')),p_data->>'country',p_data->>'timezone',array(select jsonb_array_elements_text(p_data->'specialties')),array(select jsonb_array_elements_text(p_data->'levels')),(p_data->>'experience_years')::int,p_data->>'biography',coalesce(p_data->>'video_url',''),coalesce(p_data->>'credentials',''),array(select jsonb_array_elements_text(p_data->'durations'))::int[],(p_data->>'proposed_price_minor')::int,p_data->>'currency')
 on conflict(user_id) do update set display_name=excluded.display_name,photo_url=excluded.photo_url,languages=excluded.languages,country=excluded.country,timezone=excluded.timezone,specialties=excluded.specialties,levels=excluded.levels,experience_years=excluded.experience_years,biography=excluded.biography,video_url=excluded.video_url,credentials=excluded.credentials,durations=excluded.durations,proposed_price_minor=excluded.proposed_price_minor,currency=excluded.currency,status='draft',reviewed_by=null,reviewed_at=null,review_notes='',updated_at=clock_timestamp();
 update public.tutor_profiles set published=false,qualifications_verified=false,qualification_summary='' where user_id=auth.uid();if p_submit then update public.tutor_applications set status='submitted' where user_id=auth.uid();end if;return auth.uid();end$$;
create function public.tutor_application_submit(p_expected timestamptz) returns void language plpgsql security definer set search_path='' as $$begin
 if auth.uid() is null then raise exception 'Sign in required';end if;
 update public.tutor_applications set status='submitted',updated_at=clock_timestamp() where user_id=auth.uid() and status in ('draft','rejected') and updated_at=p_expected;
 if not found then raise exception 'Stale application';end if;end$$;
create function public.tutor_admin_review(p_tutor uuid,p_action text,p_expected timestamptz,p_notes text,p_verified boolean default false,p_summary text default '') returns void language plpgsql security definer set search_path='' as $$declare a public.tutor_applications;begin
 if not public.is_admin() or coalesce(length(trim(p_notes)),0)<10 then raise exception 'Administrator review notes required';end if;
 perform private.tutor_lock(p_tutor,p_tutor);
 select * into a from public.tutor_applications where user_id=p_tutor for update;
 if a.user_id is null or a.updated_at<>p_expected then raise exception 'Stale application';end if;
 if p_action='under_review' and a.status in ('submitted','rejected','suspended') then update public.tutor_applications set status='under_review',updated_at=clock_timestamp() where user_id=p_tutor;
 elsif p_action='approved' and a.status='under_review' then
  if p_verified and (length(trim(p_summary))<10 or length(trim(a.credentials))<10) then raise exception 'Reviewed qualification summary required';end if;
  update public.tutor_applications set status='approved',reviewed_by=auth.uid(),reviewed_at=clock_timestamp(),review_notes=p_notes,updated_at=clock_timestamp() where user_id=p_tutor;
  insert into public.tutor_profiles(user_id,slug,display_name,photo_url,languages,country,timezone,specialties,levels,experience_years,biography,video_url,qualification_summary,qualifications_verified)
  values(p_tutor,'tutor-'||replace(p_tutor::text,'-',''),a.display_name,a.photo_url,a.languages,a.country,a.timezone,a.specialties,a.levels,a.experience_years,a.biography,a.video_url,case when p_verified then p_summary else '' end,p_verified)
  on conflict(user_id) do update set display_name=excluded.display_name,photo_url=excluded.photo_url,languages=excluded.languages,country=excluded.country,timezone=excluded.timezone,specialties=excluded.specialties,levels=excluded.levels,experience_years=excluded.experience_years,biography=excluded.biography,video_url=excluded.video_url,qualification_summary=excluded.qualification_summary,qualifications_verified=excluded.qualifications_verified,published=false,updated_at=clock_timestamp();
 elsif p_action='verification' and a.status='approved' then
  if p_verified and (length(trim(p_summary))<10 or length(trim(a.credentials))<10) then raise exception 'Reviewed qualification summary required';end if;
  update public.tutor_profiles set qualifications_verified=p_verified,qualification_summary=case when p_verified then p_summary else '' end,updated_at=clock_timestamp() where user_id=p_tutor;
  update public.tutor_applications set reviewed_by=auth.uid(),reviewed_at=clock_timestamp(),review_notes=p_notes,updated_at=clock_timestamp() where user_id=p_tutor;
 elsif p_action in ('rejected','suspended') and (p_action='suspended' or a.status='under_review') then
  update public.tutor_applications set status=p_action,review_notes=p_notes,reviewed_by=auth.uid(),reviewed_at=clock_timestamp(),updated_at=clock_timestamp() where user_id=p_tutor;
  update public.tutor_profiles set published=false,qualifications_verified=false where user_id=p_tutor;
  if p_action='suspended' then
   insert into public.tutor_booking_events(booking_id,actor_id,event) select id,auth.uid(),'moderation.cancelled' from public.tutor_bookings where tutor_id=p_tutor and status in ('pending','confirmed') and ends_at>now();
   update public.tutor_bookings set status='cancelled',status_reason='Tutor suspended by platform moderation' where tutor_id=p_tutor and status in ('pending','confirmed') and ends_at>now();
  end if;
 else raise exception 'Invalid review transition';end if;
 perform private.tutor_audit(p_tutor,p_action,p_notes);end$$;

create function public.tutor_manage(p_action text,p_data jsonb) returns uuid language plpgsql security definer set search_path='' as $$declare v uuid:=nullif(p_data->>'id','')::uuid;begin
 if auth.uid() is null or not private.tutor_approved(auth.uid()) then raise exception 'Approved tutor required';end if;
 perform private.tutor_lock(auth.uid(),auth.uid());
 if p_action='settings' then
  if not exists(select 1 from pg_timezone_names where name=p_data->>'timezone') then raise exception 'Invalid timezone';end if;
  update public.tutor_profiles set timezone=p_data->>'timezone',notice_hours=(p_data->>'notice_hours')::int,horizon_days=(p_data->>'horizon_days')::int,published=(p_data->>'published')::boolean,updated_at=clock_timestamp() where user_id=auth.uid();v:=auth.uid();
 elsif p_action='lesson' then
  if v is null then insert into public.tutor_lesson_types(tutor_id,title,specialty,duration_minutes,price_minor,currency,published) values(auth.uid(),trim(p_data->>'title'),p_data->>'specialty',(p_data->>'duration_minutes')::int,(p_data->>'price_minor')::int,p_data->>'currency',(p_data->>'published')::boolean) returning id into v;
  else update public.tutor_lesson_types set published=(p_data->>'published')::boolean,updated_at=clock_timestamp() where id=v and tutor_id=auth.uid();if not found then raise exception 'Lesson unavailable';end if;end if;
 elsif p_action='rule' then insert into public.tutor_availability_rules(tutor_id,weekday,start_time,end_time) values(auth.uid(),(p_data->>'weekday')::int,(p_data->>'start_time')::time,(p_data->>'end_time')::time) returning id into v;
 elsif p_action='exception' then insert into public.tutor_availability_exceptions(tutor_id,kind,starts_at,ends_at) values(auth.uid(),p_data->>'kind',(p_data->>'starts_at')::timestamptz,(p_data->>'ends_at')::timestamptz) returning id into v;
 elsif p_action='remove_rule' then delete from public.tutor_availability_rules where id=v and tutor_id=auth.uid();if not found then raise exception 'Rule unavailable';end if;
 elsif p_action='remove_exception' then delete from public.tutor_availability_exceptions where id=v and tutor_id=auth.uid();if not found then raise exception 'Exception unavailable';end if;
 else raise exception 'Invalid tutor command';end if;return v;end$$;

create function public.tutor_slots(p_tutor uuid,p_type uuid,p_from timestamptz,p_days integer default 7) returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('starts_at',s,'ends_at',s+make_interval(mins=>l.duration_minutes)) order by s),'[]') from public.tutor_lesson_types l cross join lateral generate_series(to_timestamp(ceil(extract(epoch from greatest(p_from,now()))/900)*900),least(p_from+make_interval(days=>greatest(1,least(p_days,7))),now()+interval '90 days'),interval '15 minutes') s where l.id=p_type and l.tutor_id=p_tutor and p_from<=now()+interval '90 days' and p_from>=now()-interval '1 day' and private.tutor_public(p_tutor) and l.published and private.tutor_slot_valid(p_tutor,l.id,s,s+make_interval(mins=>l.duration_minutes))$$;
create function public.tutor_catalog() returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(to_jsonb(p)||jsonb_build_object('lesson_types',coalesce((select jsonb_agg(to_jsonb(l)) from public.tutor_lesson_types l where l.tutor_id=p.user_id and l.published),'[]'),'reviews',coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'rating',r.rating,'body',r.body,'response',r.response,'created_at',r.created_at)) from public.tutor_reviews r where r.tutor_id=p.user_id and r.moderation_status='published'),'[]')) order by p.display_name),'[]') from public.tutor_profiles p where private.tutor_public(p.user_id)$$;
create function public.tutor_local_slots(p_tutor uuid,p_type uuid,p_day date,p_zone text) returns jsonb language plpgsql stable security definer set search_path='' as $$declare a timestamptz;b timestamptz;result jsonb;begin
 if not exists(select 1 from pg_timezone_names where name=p_zone) then raise exception 'Invalid timezone';end if;
 a:=p_day::timestamp at time zone p_zone;b:=(p_day+7)::timestamp at time zone p_zone;
 if a<now()-interval '1 day' or a>now()+interval '90 days' then return '[]';end if;
 select coalesce(jsonb_agg(jsonb_build_object('starts_at',s,'ends_at',s+make_interval(mins=>l.duration_minutes)) order by s),'[]') into result from public.tutor_lesson_types l cross join lateral generate_series(to_timestamp(ceil(extract(epoch from greatest(a,now()))/900)*900),b-interval '15 minutes',interval '15 minutes') s where l.id=p_type and l.tutor_id=p_tutor and l.published and private.tutor_public(p_tutor) and s+make_interval(mins=>l.duration_minutes)<=b and private.tutor_slot_valid(p_tutor,p_type,s,s+make_interval(mins=>l.duration_minutes));return result;end$$;

create function public.tutor_request_booking(p_id uuid,p_tutor uuid,p_type uuid,p_start timestamptz,p_goals text) returns uuid language plpgsql security definer set search_path='' as $$declare l public.tutor_lesson_types;e timestamptz;existing public.tutor_bookings;n integer;begin
 if auth.uid() is null or auth.uid()=p_tutor or coalesce(length(p_goals),0)>2000 then raise exception 'Invalid booking';end if;
 perform private.tutor_lock(auth.uid(),p_tutor);
 select * into existing from public.tutor_bookings where learner_id=auth.uid() and request_key=p_id;
 if existing.id is not null then if existing.tutor_id<>p_tutor or existing.lesson_type_id<>p_type or existing.starts_at<>p_start or existing.learning_goals<>coalesce(p_goals,'') then raise exception 'Conflicting retry';end if;if existing.status in ('cancelled','declined','no_show') or existing.status='pending' and existing.request_expires_at<=now() then raise exception 'Closed request';end if;return existing.id;end if;
 select * into l from public.tutor_lesson_types where id=p_type and tutor_id=p_tutor;
 if l.id is null or l.price_minor<>0 then raise exception 'Paid bookings unavailable';end if;
 e:=p_start+make_interval(mins=>l.duration_minutes);
 if not private.tutor_slot_valid(p_tutor,p_type,p_start,e) then raise exception 'Slot unavailable';end if;
 if exists(select 1 from public.tutor_bookings b where (b.learner_id=auth.uid() or b.tutor_id=auth.uid()) and b.starts_at<e and b.ends_at>p_start and (b.status='confirmed' or b.status='pending' and (b.request_expires_at is null or b.request_expires_at>now()))) then raise exception 'Overlapping lesson';end if;
 insert into public.tutor_request_limits(user_id,day,requests) values(auth.uid(),current_date,1) on conflict(user_id,day) do update set requests=public.tutor_request_limits.requests+1 where public.tutor_request_limits.requests<20 returning requests into n;
 if n is null then raise exception 'Daily request limit';end if;
 if (select count(*) from public.tutor_bookings where learner_id=auth.uid() and status='pending' and request_expires_at>now())>=5 then raise exception 'Pending request limit';end if;
 insert into public.tutor_bookings(id,learner_id,tutor_id,lesson_type_id,lesson_title,duration_minutes,price_minor,currency,starts_at,ends_at,status,learning_goals,request_key,request_expires_at) values(p_id,auth.uid(),p_tutor,p_type,l.title,l.duration_minutes,l.price_minor,l.currency,p_start,e,'pending',coalesce(p_goals,''),p_id,least(now()+interval '24 hours',p_start));
 insert into public.tutor_booking_events(booking_id,actor_id,event) values(p_id,auth.uid(),'requested');return p_id;end$$;

create function public.tutor_booking_action(p_booking uuid,p_action text,p_expected timestamptz,p_data jsonb default '{}') returns void language plpgsql security definer set search_path='' as $$declare b public.tutor_bookings;u uuid:=auth.uid();begin
 select * into b from public.tutor_bookings where id=p_booking and (learner_id=u or tutor_id=u);
 if b.id is null then raise exception 'Booking unavailable';end if;
 perform private.tutor_lock(b.learner_id,b.tutor_id);
 select * into b from public.tutor_bookings where id=p_booking for update;
 if b.updated_at<>p_expected then raise exception 'Stale booking';end if;
 if p_action='confirm' and u=b.tutor_id and b.status='pending' and b.request_expires_at>now() then
  if not private.tutor_slot_valid(b.tutor_id,b.lesson_type_id,b.starts_at,b.ends_at,b.id,false) then raise exception 'Slot unavailable';end if;
  update public.tutor_bookings set status='confirmed' where id=b.id;
 elsif p_action='decline' and u=b.tutor_id and b.status='pending' then update public.tutor_bookings set status='declined',status_reason=left(coalesce(p_data->>'reason',''),2000) where id=b.id;
 elsif p_action='cancel' and (b.status='pending' or u=b.tutor_id and b.status='confirmed') then update public.tutor_bookings set status='cancelled',status_reason=left(coalesce(p_data->>'reason',''),2000) where id=b.id;
 elsif p_action='request_cancel' and u=b.learner_id and b.status='confirmed' then update public.tutor_bookings set cancellation_requested_at=clock_timestamp(),status_reason=left(coalesce(p_data->>'reason',''),2000) where id=b.id;
 elsif p_action='complete' and b.status='confirmed' and b.ends_at<=now() then
  update public.tutor_bookings set learner_completed_at=case when u=learner_id then clock_timestamp() else learner_completed_at end,tutor_completed_at=case when u=tutor_id then clock_timestamp() else tutor_completed_at end where id=b.id;
  update public.tutor_bookings set status='completed' where id=b.id and learner_completed_at is not null and tutor_completed_at is not null;
 elsif p_action='no_show' and u=b.tutor_id and b.status='confirmed' and b.ends_at<=now() and length(trim(p_data->>'reason'))>=10 then update public.tutor_bookings set status='no_show',status_reason=left(p_data->>'reason',2000) where id=b.id;
 elsif p_action='meeting' and u=b.tutor_id and b.status='confirmed' then
  if coalesce(p_data->>'url','')!~'^https://(meet\.google\.com|([a-z0-9-]+\.)?zoom\.us|teams\.microsoft\.com|teams\.live\.com)/[^[:space:]]+$' then raise exception 'Unsupported meeting URL';end if;
  insert into public.tutor_meetings(booking_id,url) values(b.id,p_data->>'url') on conflict(booking_id) do update set url=excluded.url,updated_at=clock_timestamp();
 elsif p_action='note' then insert into public.tutor_lesson_notes(booking_id,author_id,note) values(b.id,u,coalesce(p_data->>'note','')) on conflict(booking_id,author_id) do update set note=excluded.note,updated_at=clock_timestamp();
 else raise exception 'Invalid booking transition';end if;
 insert into public.tutor_booking_events(booking_id,actor_id,event) values(b.id,u,p_action);end$$;

create function public.tutor_write_review(p_booking uuid,p_rating integer,p_body text) returns uuid language plpgsql security definer set search_path='' as $$declare b public.tutor_bookings;v uuid;begin
 select * into b from public.tutor_bookings where id=p_booking and learner_id=auth.uid() and status='completed' and ends_at<=now() and learner_completed_at is not null and tutor_completed_at is not null;
 if b.id is null or not exists(select 1 from public.tutor_profiles where user_id=b.tutor_id) then raise exception 'Completed lesson required';end if;
 insert into public.tutor_reviews(booking_id,tutor_id,learner_id,rating,body) values(b.id,b.tutor_id,auth.uid(),p_rating,trim(p_body)) returning id into v;return v;end$$;
create function public.tutor_review_response(p_review uuid,p_response text) returns void language plpgsql security definer set search_path='' as $$begin
 update public.tutor_reviews set response=trim(p_response),moderation_status='pending',updated_at=clock_timestamp() where id=p_review and tutor_id=auth.uid();if not found then raise exception 'Review unavailable';end if;end$$;
create function public.tutor_report(p_kind text,p_target uuid,p_reason text) returns uuid language plpgsql security definer set search_path='' as $$declare v uuid;begin
 if auth.uid() is null then raise exception 'Sign in required';end if;
 if (select count(*) from public.tutor_reports where reporter_id=auth.uid() and created_at>now()-interval '1 day')>=10 then raise exception 'Report limit';end if;
 if p_kind='profile' and private.tutor_public(p_target) then insert into public.tutor_reports(reporter_id,tutor_id,reason) values(auth.uid(),p_target,trim(p_reason)) returning id into v;
 elsif p_kind='booking' and private.tutor_participant(p_target) then insert into public.tutor_reports(reporter_id,booking_id,reason) values(auth.uid(),p_target,trim(p_reason)) returning id into v;
 elsif p_kind='review' and exists(select 1 from public.tutor_reviews where id=p_target and (moderation_status='published' or tutor_id=auth.uid() or learner_id=auth.uid())) then insert into public.tutor_reports(reporter_id,review_id,reason) values(auth.uid(),p_target,trim(p_reason)) returning id into v;
 else raise exception 'Target unavailable';end if;return v;end$$;
create function public.tutor_moderate(p_kind text,p_id uuid,p_action text,p_notes text) returns void language plpgsql security definer set search_path='' as $$declare t uuid;begin
 if not public.is_admin() or coalesce(length(trim(p_notes)),0)<10 then raise exception 'Administrator notes required';end if;
 if p_kind='review' and p_action in ('published','hidden') then update public.tutor_reviews set moderation_status=p_action,updated_at=clock_timestamp() where id=p_id returning tutor_id into t;if not found then raise exception 'Review unavailable';end if;
 elsif p_kind='report' and p_action='resolved' then update public.tutor_reports set status='resolved' where id=p_id returning tutor_id into t;if not found then raise exception 'Report unavailable';end if;
 elsif p_kind='booking' and p_action='cancelled' then
  select tutor_id into t from public.tutor_bookings where id=p_id;
  if t is null then raise exception 'Booking unavailable';end if;
  perform private.tutor_lock(t,t);
  update public.tutor_bookings set status='cancelled',status_reason='Platform resolved dispute' where id=p_id and status in ('pending','confirmed');if not found then raise exception 'Booking cannot be cancelled';end if;
  insert into public.tutor_booking_events(booking_id,actor_id,event) values(p_id,auth.uid(),'moderation.cancelled');
 else raise exception 'Invalid moderation action';end if;perform private.tutor_audit(t,p_kind||'.'||p_action,p_notes);end$$;

create function public.tutor_workspace() returns jsonb language sql stable security definer set search_path='' as $$select jsonb_build_object(
 'user_id',auth.uid(),'application',(select to_jsonb(a) from public.tutor_applications a where a.user_id=auth.uid()),'profile',(select to_jsonb(p) from public.tutor_profiles p where p.user_id=auth.uid()),
 'lesson_types',coalesce((select jsonb_agg(to_jsonb(l)) from public.tutor_lesson_types l where tutor_id=auth.uid()),'[]'),
 'rules',coalesce((select jsonb_agg(to_jsonb(r) order by weekday,start_time) from public.tutor_availability_rules r where tutor_id=auth.uid()),'[]'),
 'exceptions',coalesce((select jsonb_agg(to_jsonb(x) order by starts_at) from public.tutor_availability_exceptions x where tutor_id=auth.uid()),'[]'),
 'bookings',coalesce((select jsonb_agg(to_jsonb(b)||jsonb_build_object('tutor_name',coalesce((select display_name from public.tutor_profiles where user_id=b.tutor_id),(select display_name from public.profiles where id=b.tutor_id),'Tutor'),'learner_name',coalesce((select display_name from public.profiles where id=b.learner_id),'Learner'),'meeting_url',(select url from public.tutor_meetings where booking_id=b.id and b.status in ('confirmed','completed') and b.ends_at>now()-interval '1 day'),'private_note',coalesce((select note from public.tutor_lesson_notes where booking_id=b.id and author_id=auth.uid()),''),'reviewed',exists(select 1 from public.tutor_reviews where booking_id=b.id)) order by b.starts_at desc) from public.tutor_bookings b where b.learner_id=auth.uid() or b.tutor_id=auth.uid()),'[]'),
 'reviews',coalesce((select jsonb_agg(to_jsonb(r)) from public.tutor_reviews r where learner_id=auth.uid() or tutor_id=auth.uid()),'[]'))$$;
create function public.tutor_admin_workspace() returns jsonb language plpgsql stable security definer set search_path='' as $$begin
 if not public.is_admin() then raise exception 'Administrator required';end if;
 return jsonb_build_object('applications',coalesce((select jsonb_agg(to_jsonb(a) order by updated_at desc) from public.tutor_applications a),'[]'),'reviews',coalesce((select jsonb_agg(to_jsonb(r)) from public.tutor_reviews r),'[]'),'reports',coalesce((select jsonb_agg(to_jsonb(r)) from public.tutor_reports r),'[]'),'bookings',coalesce((select jsonb_agg(jsonb_build_object('id',b.id,'tutor_id',b.tutor_id,'status',b.status,'starts_at',b.starts_at,'ends_at',b.ends_at)) from public.tutor_bookings b),'[]'),'logs',coalesce((select jsonb_agg(to_jsonb(l)) from (select * from public.tutor_moderation_logs order by created_at desc limit 100) l),'[]'));end$$;
-- Manual/scheduled retention task: links expire after one day; personal notes after one year.
create function public.tutor_purge_private() returns void language plpgsql security definer set search_path='' as $$begin
 if not public.is_admin() then raise exception 'Administrator required';end if;
 delete from public.tutor_meetings m using public.tutor_bookings b where b.id=m.booking_id and b.ends_at<now()-interval '1 day';
 delete from public.tutor_lesson_notes n using public.tutor_bookings b where b.id=n.booking_id and b.ends_at<now()-interval '1 year';
 update public.tutor_bookings set learning_goals='' where ends_at<now()-interval '1 year' and learning_goals<>'';
 delete from public.tutor_request_limits where day<current_date-31;
 perform private.tutor_audit(null,'retention.cleanup','Applied the configured private-data retention policy.');end$$;

do $$declare f record;begin for f in select p.oid::regprocedure signature,n.nspname,p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','private') and p.proname like 'tutor_%' loop execute format('revoke all on function %s from public,anon,authenticated',f.signature);if f.nspname='public' then execute format('grant execute on function %s to authenticated',f.signature);end if;end loop;end$$;
grant execute on function private.tutor_approved(uuid),private.tutor_public(uuid),private.tutor_participant(uuid) to anon,authenticated;
grant execute on function public.tutor_catalog(),public.tutor_slots(uuid,uuid,timestamptz,integer) to anon;
grant execute on function public.tutor_local_slots(uuid,uuid,date,text) to anon;
commit;
