begin;
-- No merchant credentials, production configuration, or live price activation is seeded.
create table public.payment_providers(code text primary key check(code in ('stripe','esewa','khalti')),enabled boolean not null default false,mode text not null default 'test' check(mode='test'));
insert into public.payment_providers(code) values('stripe'),('esewa'),('khalti');
create table public.billing_products(code text primary key,features text[] not null,description text not null,enabled boolean not null default false);
insert into public.billing_products values('premium',array['jlpt','mock_exams','flashcards','ai_tutor','business','jft_ssw'],'Individual learning access',false),('mock-pass',array['mock_exams'],'Mock examination access',false);
create table public.regional_prices(id uuid primary key default gen_random_uuid(),product text not null references public.billing_products(code),provider text not null references public.payment_providers(code),country text not null check(country='*' or country ~ '^[A-Z]{2}$'),currency text not null check(currency in ('NPR','JPY','USD')),amount_minor bigint not null check(amount_minor between 1 and 1000000000),tax_minor bigint not null default 0 check(tax_minor>=0 and tax_minor<=amount_minor),tax_label text not null check(length(tax_label) between 1 and 300),kind text not null check(kind in ('pass','subscription')),days integer,interval text,version integer not null default 1 check(version>0),enabled boolean not null default false,check((kind='pass' and days in(30,365) and interval is null) or (kind='subscription' and provider='stripe' and days is null and interval in('month','year'))),check(provider='stripe' or (country='NP' and currency='NPR' and kind='pass' and amount_minor>=1000)),created_at timestamptz not null default now());
create table public.purchase_orders(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id),price_id uuid not null references public.regional_prices(id),provider text not null references public.payment_providers(code),product text not null references public.billing_products(code),kind text not null,country text not null,currency text not null,amount_minor bigint not null,tax_minor bigint not null,days integer,interval text,locale text not null check(locale in('en','ja','ne','hi')),request_key uuid not null,status text not null default 'created' check(status in('created','pending','paid','failed','cancelled','expired','reversed')),provider_reference text,customer_reference text,subscription_reference text,initiation_claimed boolean not null default false,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(user_id,request_key),unique(provider,provider_reference),unique(provider,subscription_reference));
create table public.payment_transactions(id uuid primary key default gen_random_uuid(),order_id uuid not null references public.purchase_orders(id),provider text not null references public.payment_providers(code),reference text not null,currency text not null,amount_minor bigint not null check(amount_minor>=0),status text not null,verified_at timestamptz not null default now(),unique(provider,reference));
create table public.payment_attempts(id uuid primary key default gen_random_uuid(),order_id uuid not null references public.purchase_orders(id),operation text not null check(operation in('initiate','verify','callback','refund','cancel')),result text not null check(result in('pending','success','unavailable','timeout','provider_error','invalid_proof','unsupported')),created_at timestamptz not null default now());
create table public.payment_events(id uuid primary key default gen_random_uuid(),provider text not null references public.payment_providers(code),event_reference text not null,order_id uuid not null references public.purchase_orders(id),state text not null,created_at timestamptz not null default now(),unique(provider,event_reference));
create table public.access_passes(order_id uuid primary key references public.purchase_orders(id),user_id uuid not null references auth.users(id),product text not null references public.billing_products(code),starts_at timestamptz not null,ends_at timestamptz not null,revoked_at timestamptz,check(ends_at>starts_at));
create table public.billing_subscriptions(order_id uuid primary key references public.purchase_orders(id),user_id uuid not null references auth.users(id),reference text not null unique,customer_reference text not null,period_start timestamptz not null,period_end timestamptz not null,status text not null,updated_at timestamptz not null default now());
create table public.entitlements(order_id uuid not null references public.purchase_orders(id),user_id uuid not null references auth.users(id),feature text not null check(feature in('jlpt','mock_exams','flashcards','ai_tutor','business','jft_ssw','organizations')),starts_at timestamptz not null,ends_at timestamptz not null,revoked_at timestamptz,primary key(order_id,feature));
create index entitlements_lookup on public.entitlements(user_id,feature,ends_at) where revoked_at is null;
create table public.refunds(id uuid primary key default gen_random_uuid(),order_id uuid not null references public.purchase_orders(id),provider text not null references public.payment_providers(code),reference text not null,currency text not null,amount_minor bigint check(amount_minor>=0),status text not null,created_at timestamptz not null default now(),unique(provider,reference));
create table public.provider_settlement_records(id uuid primary key default gen_random_uuid(),provider text not null references public.payment_providers(code),reference text not null,currency text not null check(currency in('NPR','JPY','USD')),gross_minor bigint not null check(gross_minor>=0),refund_minor bigint not null check(refund_minor>=0),fee_minor bigint not null check(fee_minor>=0),net_minor bigint not null,settled_at timestamptz,status text not null check(status in('unreconciled','reconciled','disputed')),source text not null check(length(source) between 1 and 300),reviewer uuid references auth.users(id),unique(provider,reference),check(net_minor=gross_minor-refund_minor-fee_minor));
create table public.premium_requirements(resource_table text not null,resource_id uuid not null,feature text not null check(feature in('jlpt','mock_exams','flashcards','ai_tutor','business','jft_ssw','organizations')),primary key(resource_table,resource_id));

do $$declare t text;begin
 foreach t in array array['payment_providers','billing_products','regional_prices','purchase_orders','payment_transactions','payment_attempts','payment_events','access_passes','billing_subscriptions','entitlements','refunds','provider_settlement_records','premium_requirements'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from anon,authenticated',t);
 execute format('grant select on public.%I to authenticated',t);
 execute format('create policy billing_admin_read on public.%I for select to authenticated using(public.is_admin())',t);
 end loop;
end$$;
create policy products_read on public.billing_products for select using(enabled);
create policy prices_read on public.regional_prices for select using(enabled);
create policy providers_read on public.payment_providers for select using(enabled);
grant select on public.billing_products,public.regional_prices,public.payment_providers to anon;
create policy order_owner on public.purchase_orders for select to authenticated using(user_id=auth.uid());
create policy pass_owner on public.access_passes for select to authenticated using(user_id=auth.uid());
create policy entitlement_owner on public.entitlements for select to authenticated using(user_id=auth.uid());
create policy subscription_owner on public.billing_subscriptions for select to authenticated using(user_id=auth.uid());
create policy transaction_owner on public.payment_transactions for select to authenticated using(exists(select 1 from public.purchase_orders o where o.id=order_id and o.user_id=auth.uid()));
create policy refund_owner on public.refunds for select to authenticated using(exists(select 1 from public.purchase_orders o where o.id=order_id and o.user_id=auth.uid()));

create function public.billing_has_feature(p_feature text) returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from public.entitlements where user_id=auth.uid() and feature=p_feature and revoked_at is null and starts_at<=now() and ends_at>now())$$;
create function public.billing_resource_access(p_table text,p_id uuid) returns boolean language sql stable security definer set search_path='' as $$select public.is_admin() or not exists(select 1 from public.premium_requirements r where r.resource_table=p_table and r.resource_id=p_id and not public.billing_has_feature(r.feature))$$;
-- Restrictive policies protect direct reads. Definer RPC entry points are checked below too.
do $$declare t text;begin foreach t in array array['lessons','flashcard_decks','question_banks','exam_templates','ai_scenarios'] loop
 execute format('create policy premium_read on public.%I as restrictive for select using(public.billing_resource_access(%L,id))',t,t);
end loop;end$$;
create function public.billing_catalog() returns jsonb language sql stable security definer set search_path='' as $$select coalesce(jsonb_agg(to_jsonb(r)-'enabled'-'created_at'),'[]') from public.regional_prices r join public.billing_products p on p.code=r.product join public.payment_providers g on g.code=r.provider where r.enabled and p.enabled and g.enabled and g.mode='test'$$;
create function public.billing_order_create(p_price uuid,p_provider text,p_country text,p_key uuid,p_locale text) returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.regional_prices;o public.purchase_orders;begin
 if auth.uid() is null then raise exception 'sign_in';end if;
 perform pg_advisory_xact_lock(hashtext('billing:'||auth.uid()::text));
 select * into o from public.purchase_orders where user_id=auth.uid() and request_key=p_key;
 if found then if o.price_id<>p_price or o.provider<>p_provider or o.country<>p_country then raise exception 'invalid_retry';end if;return to_jsonb(o);end if;
 if (select count(*) from public.purchase_orders where user_id=auth.uid() and created_at>now()-interval '1 day')>=20 then raise exception 'limit';end if;
 select * into r from public.regional_prices where id=p_price and enabled and provider=p_provider and (country='*' or country=p_country);
 if not found or p_country !~ '^[A-Z]{2}$' or p_locale not in('en','ja','ne','hi') or not exists(select 1 from public.billing_products where code=r.product and enabled) or not exists(select 1 from public.payment_providers where code=r.provider and enabled and mode='test') or (r.provider<>'stripe' and p_country<>'NP') then raise exception 'unavailable';end if;
 if r.kind='subscription' and exists(select 1 from public.purchase_orders old where old.user_id=auth.uid() and old.product=r.product and old.kind='subscription' and ((old.status in('created','pending') and old.created_at>now()-interval '24 hours') or exists(select 1 from public.billing_subscriptions s where s.order_id=old.id and s.status='active' and s.period_end>now()))) then raise exception 'subscription_exists';end if;
 insert into public.purchase_orders(user_id,price_id,provider,product,kind,country,currency,amount_minor,tax_minor,days,interval,locale,request_key) values(auth.uid(),r.id,r.provider,r.product,r.kind,p_country,r.currency,r.amount_minor,r.tax_minor,r.days,r.interval,p_locale,p_key) returning * into o;
 return to_jsonb(o);end$$;
create function public.billing_claim(p_order uuid) returns boolean language plpgsql security definer set search_path='' as $$begin update public.purchase_orders set initiation_claimed=true where id=p_order and not initiation_claimed and status='created';return found;end$$;
create function public.billing_attach(p_order uuid,p_reference text) returns void language plpgsql security definer set search_path='' as $$begin
 if length(p_reference) not between 1 and 500 then raise exception 'invalid';end if;
 update public.purchase_orders set provider_reference=p_reference,status='pending',updated_at=now() where id=p_order and status='created' and initiation_claimed and provider_reference is null;
 if not found then raise exception 'stale';end if;end$$;
create function public.billing_attempt(p_order uuid,p_operation text,p_result text) returns void language sql security definer set search_path='' as $$insert into public.payment_attempts(order_id,operation,result) values(p_order,p_operation,p_result)$$;
create function public.billing_verify_claim(p_order uuid) returns boolean language plpgsql security definer set search_path='' as $$begin
 perform pg_advisory_xact_lock(hashtext('verify:'||p_order::text));
 if (select count(*) from public.payment_attempts where order_id=p_order and operation in('verify','callback') and result='pending' and created_at>now()-interval '1 minute')>=5 then return false;end if;
 insert into public.payment_attempts(order_id,operation,result) values(p_order,'verify','pending');return true;
end$$;
revoke all on function public.billing_verify_claim(uuid) from public,anon,authenticated;
create function public.billing_apply(p_order uuid,p_proof jsonb) returns void language plpgsql security definer set search_path='' as $$
declare o public.purchase_orders;s text:=p_proof->>'state';a timestamptz;b timestamptz;f text;event text:=p_proof->>'event';begin
 select * into o from public.purchase_orders where id=p_order for update;
 if not found or o.provider_reference is null or (p_proof->>'reference') is distinct from o.provider_reference or (p_proof->>'amount')::bigint is distinct from o.amount_minor or (p_proof->>'currency') is distinct from o.currency or event is null or length(event) not between 1 and 500 or s is null or s not in('pending','paid','failed','cancelled','expired','reversed') then raise exception 'invalid_proof';end if;
 -- Serialize renewal stacking across distinct orders as well as duplicate deliveries.
 perform pg_advisory_xact_lock(hashtext('billing:'||o.user_id::text));
 perform pg_advisory_xact_lock(hashtext('payment-receipt:'||o.provider||':'||coalesce(p_proof->>'receipt',o.provider_reference)));
 if exists(select 1 from public.payment_events where provider=o.provider and event_reference=event and order_id<>o.id) then raise exception 'invalid_proof';end if;
 if o.status='reversed' and s<>'reversed' then return;end if;
 if exists(select 1 from public.payment_events where provider=o.provider and event_reference=event) and s<>'reversed' then return;end if;
 insert into public.payment_events(provider,event_reference,order_id,state) values(o.provider,event,o.id,s) on conflict(provider,event_reference) do nothing;
 if s='reversed' then
 update public.purchase_orders set status='reversed',updated_at=now() where id=o.id;
 update public.entitlements set revoked_at=now() where order_id=o.id;
 update public.access_passes set revoked_at=now() where order_id=o.id;
 update public.billing_subscriptions set status='reversed',updated_at=now() where order_id=o.id;
 update public.payment_transactions set status='reversed' where order_id=o.id;
 insert into public.refunds(order_id,provider,reference,currency,amount_minor,status) values(o.id,o.provider,coalesce(p_proof->>'refundReference',event),o.currency,(p_proof->>'refundAmount')::bigint,'verified_reversal') on conflict(provider,reference) do update set amount_minor=greatest(public.refunds.amount_minor,excluded.amount_minor);
 return;end if;
 if s<>'paid' then if o.status<>'paid' then update public.purchase_orders set status=s,updated_at=now() where id=o.id;end if;return;end if;
 if exists(select 1 from public.payment_transactions where provider=o.provider and reference=coalesce(p_proof->>'receipt',o.provider_reference) and order_id<>o.id) then raise exception 'invalid_proof';end if;
 if o.kind='pass' then
 if exists(select 1 from public.access_passes where order_id=o.id) then return;end if;
 select greatest(now(),coalesce(max(ends_at),now())) into a from public.access_passes where user_id=o.user_id and product=o.product and revoked_at is null;
 b:=a+make_interval(days=>o.days);
 insert into public.access_passes values(o.id,o.user_id,o.product,a,b,null);
 else
 if o.provider<>'stripe' or coalesce(p_proof->>'subscription','')='' or coalesce(p_proof->>'customer','')='' then raise exception 'invalid_proof';end if;
 a:=(p_proof->>'periodStart')::timestamptz;b:=(p_proof->>'periodEnd')::timestamptz;
 if a is null or b is null or b<a or b>a+interval '370 days' then raise exception 'invalid_period';end if;
 -- Ignore stale invoice periods; an older webhook cannot shorten a newer paid period.
 if exists(select 1 from public.billing_subscriptions where order_id=o.id and period_end>b) then return;end if;
 insert into public.billing_subscriptions values(o.id,o.user_id,p_proof->>'subscription',p_proof->>'customer',a,b,'active',now()) on conflict(order_id) do update set period_start=a,period_end=b,status='active',updated_at=now();
 end if;
 insert into public.payment_transactions(order_id,provider,reference,currency,amount_minor,status) values(o.id,o.provider,coalesce(p_proof->>'receipt',o.provider_reference),o.currency,o.amount_minor,'paid') on conflict(provider,reference) do nothing;
 for f in select unnest(features) from public.billing_products where code=o.product loop
 insert into public.entitlements values(o.id,o.user_id,f,a,b,null) on conflict(order_id,feature) do update set starts_at=least(public.entitlements.starts_at,a),ends_at=b where public.entitlements.revoked_at is null;
 end loop;
 update public.purchase_orders set status='paid',customer_reference=coalesce(p_proof->>'customer',customer_reference),subscription_reference=coalesce(p_proof->>'subscription',subscription_reference),updated_at=now() where id=o.id;
end$$;
create function public.billing_subscription_end(p_order uuid,p_event text) returns void language plpgsql security definer set search_path='' as $$declare o public.purchase_orders;begin
 select * into o from public.purchase_orders where id=p_order and provider='stripe' and kind='subscription' for update;
 if not found then raise exception 'invalid';end if;
 insert into public.payment_events(provider,event_reference,order_id,state) values('stripe',p_event,p_order,'subscription_ended') on conflict do nothing;
 update public.billing_subscriptions set status='cancelled',period_end=least(period_end,now()),updated_at=now() where order_id=p_order;
 update public.entitlements set ends_at=least(ends_at,now()) where order_id=p_order;
end$$;
revoke all on function public.billing_subscription_end(uuid,text) from public,anon,authenticated;
create function public.billing_admin_report() returns jsonb language plpgsql stable security definer set search_path='' as $$begin
 if not public.is_admin() then raise exception 'forbidden';end if;
 return jsonb_build_object('totals',coalesce((select jsonb_agg(x) from(select provider,currency,count(*) payments,sum(amount_minor)::text gross_minor from public.payment_transactions group by provider,currency)x),'[]'::jsonb),'orders',coalesce((select jsonb_agg(x) from(select id,provider,currency,amount_minor,status,product,kind,created_at from public.purchase_orders order by created_at desc limit 100)x),'[]'::jsonb),'refunds',coalesce((select jsonb_agg(r) from(select provider,currency,amount_minor,status,created_at from public.refunds order by created_at desc limit 100)r),'[]'::jsonb),'settlements',coalesce((select jsonb_agg(r) from(select provider,currency,gross_minor,refund_minor,fee_minor,net_minor,status,settled_at from public.provider_settlement_records order by settled_at desc nulls last limit 100)r),'[]'::jsonb),'active_passes',(select count(*) from public.access_passes where starts_at<=now() and ends_at>now() and revoked_at is null),'active_subscriptions',(select count(*) from public.billing_subscriptions where period_end>now() and status='active'));
end$$;
revoke all on function public.billing_claim(uuid),public.billing_attach(uuid,text),public.billing_apply(uuid,jsonb),public.billing_attempt(uuid,text,text) from public,anon,authenticated;
revoke all on function public.billing_order_create(uuid,text,text,uuid,text),public.billing_admin_report() from public,anon;
grant execute on function public.billing_order_create(uuid,text,text,uuid,text),public.billing_admin_report() to authenticated;
revoke all on function public.billing_catalog(),public.billing_has_feature(text),public.billing_resource_access(text,uuid) from public;
grant execute on function public.billing_catalog(),public.billing_has_feature(text),public.billing_resource_access(text,uuid) to anon,authenticated;
do $$begin if exists(select 1 from pg_roles where rolname='service_role') then
 grant execute on function public.billing_claim(uuid),public.billing_attach(uuid,text),public.billing_apply(uuid,jsonb),public.billing_attempt(uuid,text,text),public.billing_subscription_end(uuid,text),public.billing_verify_claim(uuid) to service_role;
 grant select on public.purchase_orders,public.regional_prices,public.billing_products to service_role;
end if;end$$;
-- Child reads must not bypass a premium parent through direct REST queries.
create policy billing_cards on public.flashcards as restrictive for select using(public.billing_resource_access('flashcard_decks',deck_id));
create policy billing_blocks on public.lesson_blocks as restrictive for select using(public.billing_resource_access('lessons',lesson_id));
create policy billing_questions on public.questions as restrictive for select using(public.billing_resource_access('question_banks',bank_id));
create policy billing_options on public.question_options as restrictive for select using(exists(select 1 from public.questions q where q.id=question_id));
-- Preserve earlier implementations and their validation. Wrappers add authorization
-- before their SECURITY DEFINER bodies can bypass the new restrictive read policies.
alter function public.start_exam(uuid,uuid,integer,text) rename to billing_legacy_start_exam;
alter function public.billing_legacy_start_exam(uuid,uuid,integer,text) set schema private;
revoke all on function private.billing_legacy_start_exam(uuid,uuid,integer,text) from public,anon,authenticated;
create function public.start_exam(p_id uuid,p_template uuid,p_count integer default null,p_difficulty text default 'mixed') returns uuid language plpgsql security definer set search_path='' as $$begin
 if not public.billing_resource_access('exam_templates',p_template) or exists(select 1 from public.exam_sections where template_id=p_template and not public.billing_resource_access('question_banks',bank_id)) then raise exception 'premium_required';end if;
 return private.billing_legacy_start_exam(p_id,p_template,p_count,p_difficulty);end$$;
alter function public.get_exam(uuid) rename to billing_legacy_get_exam;
alter function public.billing_legacy_get_exam(uuid) set schema private;
revoke all on function private.billing_legacy_get_exam(uuid) from public,anon,authenticated;
create function public.get_exam(p_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$begin
 if exists(select 1 from public.exam_attempts where id=p_id and (not public.billing_resource_access('exam_templates',template_id) or exists(select 1 from public.exam_sections where template_id=public.exam_attempts.template_id and not public.billing_resource_access('question_banks',bank_id)))) then raise exception 'premium_required';end if;
 return private.billing_legacy_get_exam(p_id);end$$;
alter function public.submit_quiz(uuid,uuid,jsonb) rename to billing_legacy_submit_quiz;
alter function public.billing_legacy_submit_quiz(uuid,uuid,jsonb) set schema private;
revoke all on function private.billing_legacy_submit_quiz(uuid,uuid,jsonb) from public,anon,authenticated;
create function public.submit_quiz(p_id uuid,p_bank uuid,p_answers jsonb) returns jsonb language plpgsql security definer set search_path='' as $$begin if not public.billing_resource_access('question_banks',p_bank) then raise exception 'premium_required';end if;return private.billing_legacy_submit_quiz(p_id,p_bank,p_answers);end$$;
alter function public.practice_quiz(uuid,jsonb) rename to billing_legacy_practice_quiz;
alter function public.billing_legacy_practice_quiz(uuid,jsonb) set schema private;
revoke all on function private.billing_legacy_practice_quiz(uuid,jsonb) from public,anon,authenticated;
create function public.practice_quiz(p_bank uuid,p_answers jsonb) returns jsonb language plpgsql security definer set search_path='' as $$begin if not public.billing_resource_access('question_banks',p_bank) then raise exception 'premium_required';end if;return private.billing_legacy_practice_quiz(p_bank,p_answers);end$$;
revoke all on function public.start_exam(uuid,uuid,integer,text),public.get_exam(uuid),public.submit_quiz(uuid,uuid,jsonb),public.practice_quiz(uuid,jsonb) from public,anon;
grant execute on function public.start_exam(uuid,uuid,integer,text),public.get_exam(uuid),public.submit_quiz(uuid,uuid,jsonb),public.practice_quiz(uuid,jsonb) to authenticated;
grant execute on function public.practice_quiz(uuid,jsonb) to anon;
create function private.billing_user_resource(p_user uuid,p_table text,p_id uuid) returns boolean language sql stable security definer set search_path='' as $$select not exists(select 1 from public.premium_requirements r where r.resource_table=p_table and r.resource_id=p_id and not exists(select 1 from public.entitlements e where e.user_id=p_user and e.feature=r.feature and e.revoked_at is null and e.starts_at<=now() and e.ends_at>now()))$$;
alter function public.ai_start(uuid,uuid,jsonb) rename to billing_legacy_ai_start;
alter function public.billing_legacy_ai_start(uuid,uuid,jsonb) set schema private;
alter function public.ai_reserve(uuid,uuid,uuid,text,text) rename to billing_legacy_ai_reserve;
alter function public.billing_legacy_ai_reserve(uuid,uuid,uuid,text,text) set schema private;
revoke all on function private.billing_legacy_ai_start(uuid,uuid,jsonb),private.billing_legacy_ai_reserve(uuid,uuid,uuid,text,text),private.billing_user_resource(uuid,text,uuid) from public,anon,authenticated;
create function public.ai_start(p_user uuid,p_id uuid,p_settings jsonb) returns uuid language plpgsql security definer set search_path='' as $$begin if not private.billing_user_resource(p_user,'ai_scenarios',(p_settings->>'scenarioId')::uuid) then raise exception 'premium_required';end if;return private.billing_legacy_ai_start(p_user,p_id,p_settings);end$$;
create function public.ai_reserve(p_user uuid,p_session uuid,p_request uuid,p_text text,p_model text) returns jsonb language plpgsql security definer set search_path='' as $$begin if exists(select 1 from public.ai_sessions where id=p_session and not private.billing_user_resource(p_user,'ai_scenarios',scenario_id)) then raise exception 'premium_required';end if;return private.billing_legacy_ai_reserve(p_user,p_session,p_request,p_text,p_model);end$$;
revoke all on function public.ai_start(uuid,uuid,jsonb),public.ai_reserve(uuid,uuid,uuid,text,text) from public,anon,authenticated;
do $$begin if exists(select 1 from pg_roles where rolname='service_role') then
 revoke all on function private.billing_legacy_ai_start(uuid,uuid,jsonb),private.billing_legacy_ai_reserve(uuid,uuid,uuid,text,text) from service_role;
 grant execute on function public.ai_start(uuid,uuid,jsonb),public.ai_reserve(uuid,uuid,uuid,text,text) to service_role;
end if;end$$;
commit;
