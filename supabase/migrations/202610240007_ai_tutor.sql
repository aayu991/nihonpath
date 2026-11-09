-- Extend the existing scenario contract; preserve legacy roleplay sessions.
alter table public.ai_scenarios add column slug text unique,
 add column title_ja text not null default '', add column description text not null default '',
 add column description_ja text not null default '', add column suggested_level text not null default 'N5–N4',
 add column opening text not null default '', add column opening_translation text not null default '';
create table public.ai_user_settings(user_id uuid primary key references auth.users(id) on delete cascade,
 settings jsonb not null, updated_at timestamptz not null default now());
create table public.ai_sessions(id uuid primary key, user_id uuid not null references auth.users(id) on delete cascade,
 scenario_id uuid not null references public.ai_scenarios(id) on delete restrict,
 settings jsonb not null, status text not null default 'active' check(status in ('active','completed')),
 completed_turns integer not null default 0 check(completed_turns between 0 and 15),
 active_request uuid, request_started_at timestamptz, created_at timestamptz not null default now());
create table public.ai_messages(id uuid primary key default gen_random_uuid(), session_id uuid not null references public.ai_sessions(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade, role text not null check(role in ('user','assistant')),
 content text not null check(char_length(content) between 1 and 1200), translation text not null default '',
 reviewed boolean not null default false, turn integer not null check(turn between 0 and 15), unique(session_id,role,turn));
create table public.ai_feedback(id uuid primary key default gen_random_uuid(),session_id uuid not null references public.ai_sessions(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,turn integer not null check(turn between 1 and 15),
 original text not null, payload jsonb not null, unique(session_id,turn));
create table public.ai_usage(id uuid primary key,user_id uuid not null references auth.users(id) on delete cascade,
 session_id uuid references public.ai_sessions(id) on delete set null, status text not null default 'pending' check(status in ('pending','succeeded','failed')),
 model text not null,input_tokens integer not null default 0 check(input_tokens>=0),output_tokens integer not null default 0 check(output_tokens>=0),
 estimated_cost_usd numeric check(estimated_cost_usd>=0), created_at timestamptz not null default now());
create index ai_sessions_user on public.ai_sessions(user_id,created_at desc);
create index ai_usage_user_time on public.ai_usage(user_id,created_at desc);
create index ai_messages_session on public.ai_messages(session_id,turn);
create index ai_feedback_session on public.ai_feedback(session_id,turn);
do $$declare t text;begin foreach t in array array['ai_sessions','ai_messages','ai_feedback','ai_usage','ai_user_settings'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from anon,authenticated',t);
 execute format('grant select on public.%I to authenticated',t);
 execute format('create policy owner_read on public.%I for select to authenticated using(user_id=(select auth.uid()))',t);
end loop;end$$;
-- Children have no client writes, including administrator accounts. Trusted server RPCs only.
grant delete on public.ai_sessions to authenticated;
create policy owner_delete on public.ai_sessions for delete to authenticated using(user_id=(select auth.uid()));
create function private.ai_valid_settings(p jsonb) returns boolean language sql immutable set search_path='' as $$
 select jsonb_typeof(p)='object' and octet_length(p::text)<=2000
 and not exists(select 1 from jsonb_object_keys(p) k where k not in ('level','scenarioId','target','locale','correctionMode','furigana','translation'))
 and jsonb_typeof(p->'target')='number'
 and p->>'level' in ('n5','n4','n3','n2','n1') and p->>'target' in ('5','10','15')
 and p->>'correctionMode' in ('each','end') and p->>'locale' in ('en','ja')
 and jsonb_typeof(p->'furigana')='boolean' and jsonb_typeof(p->'translation')='boolean'
 and p ? 'scenarioId'
$$;
create function public.ai_start(p_user uuid,p_id uuid,p_settings jsonb) returns uuid
language plpgsql security definer set search_path='' as $$
declare sc public.ai_scenarios; existing public.ai_sessions;begin
 perform pg_advisory_xact_lock(hashtextextended(p_user::text,700));
 select * into existing from public.ai_sessions where id=p_id;
 if found then
  if existing.user_id<>p_user or existing.settings<>p_settings then raise exception 'Invalid retry';end if;
  return p_id;
 end if;
 if not coalesce(private.ai_valid_settings(p_settings),false) then raise exception 'Invalid settings';end if;
 select * into sc from public.ai_scenarios where id=(p_settings->>'scenarioId')::uuid and published
 and (program_id is null or exists(select 1 from public.learning_programs p where p.id=program_id and p.published));
 if not found or sc.opening='' then raise exception 'Scenario unavailable';end if;
 if (select count(*) from public.ai_sessions where user_id=p_user and created_at>now()-interval '1 day')>=20 then raise exception 'Session limit';end if;
 insert into public.ai_sessions(id,user_id,scenario_id,settings) values(p_id,p_user,sc.id,p_settings);
 insert into public.ai_messages(session_id,user_id,role,content,translation,reviewed,turn) values(p_id,p_user,'assistant',sc.opening,sc.opening_translation,true,0);
 insert into public.ai_user_settings values(p_user,p_settings,now()) on conflict(user_id) do update set settings=excluded.settings,updated_at=now();
 return p_id;
end$$;
create function public.ai_reserve(p_user uuid,p_session uuid,p_request uuid,p_text text,p_model text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare s public.ai_sessions;u public.ai_usage;t integer;begin
 perform pg_advisory_xact_lock(hashtextextended(p_user::text,700));
 select * into s from public.ai_sessions where id=p_session and user_id=p_user for update;
 if not found then raise exception 'Session unavailable';end if;
 select * into u from public.ai_usage where id=p_request;
 if found then
  if u.user_id<>p_user or u.session_id is distinct from p_session then raise exception 'Invalid retry';end if;
  if u.status='succeeded' then return jsonb_build_object('replay',true);end if;
  if u.status='failed' then raise exception 'Request failed';end if;
  raise exception 'Request already attempted';
 end if;
 if s.status<>'active' or s.completed_turns >= (s.settings->>'target')::int then raise exception 'Session ended';end if;
 if char_length(trim(p_text)) not between 1 and 1200 or char_length(p_model) not between 1 and 100 then raise exception 'Invalid input';end if;
 if s.active_request is not null and s.request_started_at>now()-interval '90 seconds' then raise exception 'Reply pending';end if;
 if s.active_request is not null then
  update public.ai_usage set status='failed' where id=s.active_request and status='pending';
  delete from public.ai_messages where session_id=s.id and role='user' and turn>s.completed_turns;
 end if;
 if (select count(*) from public.ai_usage where user_id=p_user and created_at>now()-interval '1 minute')>=6
 or (select count(*) from public.ai_usage where user_id=p_user and created_at>=date_trunc('day',now() at time zone 'UTC') at time zone 'UTC')>=30
 then raise exception 'Quota exceeded';end if;
 t:=s.completed_turns+1;
 insert into public.ai_usage(id,user_id,session_id,model) values(p_request,p_user,p_session,p_model);
 insert into public.ai_messages(session_id,user_id,role,content,turn) values(p_session,p_user,'user',p_text,t);
 update public.ai_sessions set active_request=p_request,request_started_at=now() where id=p_session;
 return jsonb_build_object('replay',false,'turn',t);
end$$;
create function public.ai_finish(p_user uuid,p_session uuid,p_request uuid,p_output jsonb,p_input_tokens integer,p_output_tokens integer,p_cost numeric) returns void
language plpgsql security definer set search_path='' as $$
declare s public.ai_sessions; original text; t integer;begin
 select * into s from public.ai_sessions where id=p_session and user_id=p_user for update;
 if not found or s.active_request is distinct from p_request then raise exception 'Request unavailable';end if;
 if not exists(select 1 from public.ai_usage where id=p_request and user_id=p_user and status='pending') then raise exception 'Request unavailable';end if;
 t:=s.completed_turns+1;
 if p_output is null then
  delete from public.ai_messages where session_id=p_session and role='user' and turn=t;
  update public.ai_usage set status='failed',input_tokens=p_input_tokens,output_tokens=p_output_tokens,estimated_cost_usd=p_cost where id=p_request;
 else
  if char_length(p_output->>'dialogue') not between 1 and 600 or p_output->>'category' not in ('correct','grammar','wording','register','non_japanese','unassessed') then raise exception 'Invalid output';end if;
  select content into original from public.ai_messages where session_id=p_session and role='user' and turn=t;
  insert into public.ai_messages(session_id,user_id,role,content,translation,turn) values(p_session,p_user,'assistant',p_output->>'dialogue',p_output->>'translation',t);
  insert into public.ai_feedback(session_id,user_id,turn,original,payload) values(p_session,p_user,t,original,p_output);
  update public.ai_usage set status='succeeded',input_tokens=p_input_tokens,output_tokens=p_output_tokens,estimated_cost_usd=p_cost where id=p_request;
  update public.ai_sessions set completed_turns=t,status=case when t>=(s.settings->>'target')::int then 'completed' else 'active' end where id=p_session;
 end if;
 update public.ai_sessions set active_request=null,request_started_at=null where id=p_session;
end$$;
create function public.ai_end(p_user uuid,p_session uuid) returns void language plpgsql security definer set search_path='' as $$
declare s public.ai_sessions;begin
 select * into s from public.ai_sessions where id=p_session and user_id=p_user for update;
 if not found then raise exception 'Session unavailable';end if;
 if s.active_request is not null and s.request_started_at>now()-interval '90 seconds' then raise exception 'Reply pending';end if;
 update public.ai_sessions set status='completed',active_request=null where id=p_session and user_id=p_user;
 delete from public.ai_messages where session_id=p_session and user_id=p_user and turn>(select completed_turns from public.ai_sessions where id=p_session);
 update public.ai_usage set status='failed' where session_id=p_session and user_id=p_user and status='pending';
end$$;
create function public.ai_save_settings(p_settings jsonb) returns void language plpgsql security definer set search_path='' as $$begin
 if auth.uid() is null or not coalesce(private.ai_valid_settings(p_settings),false) then raise exception 'Invalid settings';end if;
 if not exists(select 1 from public.ai_scenarios where id=(p_settings->>'scenarioId')::uuid and published) then raise exception 'Scenario unavailable';end if;
 insert into public.ai_user_settings values(auth.uid(),p_settings,now()) on conflict(user_id) do update set settings=excluded.settings,updated_at=now();
end$$;
revoke all on function private.ai_valid_settings(jsonb) from public,anon,authenticated;
revoke all on function public.ai_start(uuid,uuid,jsonb),public.ai_reserve(uuid,uuid,uuid,text,text),public.ai_finish(uuid,uuid,uuid,jsonb,integer,integer,numeric),public.ai_end(uuid,uuid) from public,anon,authenticated;
revoke all on function public.ai_save_settings(jsonb) from public,anon;
grant execute on function public.ai_save_settings(jsonb) to authenticated;
-- Local tests need not create a provider role; hosted Supabase already has it.
do $$begin if exists(select 1 from pg_roles where rolname='service_role') then
 grant execute on function public.ai_start(uuid,uuid,jsonb),public.ai_reserve(uuid,uuid,uuid,text,text),public.ai_finish(uuid,uuid,uuid,jsonb,integer,integer,numeric),public.ai_end(uuid,uuid) to service_role;
end if;end$$;
