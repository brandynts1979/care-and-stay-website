-- Staged after atomic billing. Durable, owner-authorized first Checkout.
BEGIN;
create table public.academy_checkout_attempts(
 id uuid primary key default gen_random_uuid(),
 location_id uuid not null references public.academy_locations(id),
 owner_id uuid not null references auth.users(id),
 price_id text not null,
 owner_email text not null,
 customer_id text,
 stripe_session_id text unique,
 state text not null default 'pending' check(state in ('pending','expired','bound')),
 created_at timestamptz not null default now(),
 bound_subscription_id text
);
create unique index academy_one_pending_checkout on public.academy_checkout_attempts(location_id) where state='pending';
alter table public.academy_checkout_attempts enable row level security;
revoke all on public.academy_checkout_attempts from public,anon,authenticated;
grant all on public.academy_checkout_attempts to service_role;

create function public.academy_reserve_checkout(p_location uuid,p_owner uuid,p_email text,p_price text)
returns jsonb language plpgsql security invoker set search_path=pg_catalog,public as $$
declare loc public.academy_locations%rowtype; attempt public.academy_checkout_attempts%rowtype;
begin
 select * into loc from public.academy_locations where id=p_location for update;
 if not found or loc.billing_owner_id<>p_owner or not exists(
   select 1 from public.academy_location_members m where m.location_id=p_location and m.user_id=p_owner and m.active and m.role='owner'
 ) then return jsonb_build_object('result','forbidden'); end if;
 -- Existing linked accounts use the portal. Replacement requires a separately
 -- verified terminal-subscription workflow, not a second Checkout.
 if loc.stripe_subscription_id is not null or loc.subscription_status not in ('pending','canceled') then
   return jsonb_build_object('result','existing_subscription');
 end if;
 select * into attempt from public.academy_checkout_attempts where location_id=p_location and state='pending' for update;
 if not found then
   insert into public.academy_checkout_attempts(location_id,owner_id,price_id,owner_email,customer_id)
   values(p_location,p_owner,p_price,p_email,loc.stripe_customer_id) returning * into attempt;
 end if;
 if attempt.owner_id<>p_owner or attempt.price_id<>p_price or attempt.owner_email<>p_email or attempt.customer_id is distinct from loc.stripe_customer_id then
   return jsonb_build_object('result','review_required');
 end if;
 return jsonb_build_object('result','reserved','attempt',to_jsonb(attempt));
end $$;

create function public.academy_record_checkout_session(p_attempt uuid,p_session text)
returns boolean language plpgsql security invoker set search_path=pg_catalog,public as $$
declare attempt public.academy_checkout_attempts%rowtype;
begin
 select * into attempt from public.academy_checkout_attempts where id=p_attempt for update;
 if not found or attempt.state<>'pending' or p_session is null or p_session not like 'cs_%' then return false; end if;
 if attempt.stripe_session_id is not null then return attempt.stripe_session_id=p_session; end if;
 update public.academy_checkout_attempts set stripe_session_id=p_session where id=p_attempt;
 return true;
end $$;

create function public.academy_bind_checkout_atomic(p_location uuid,p_revision bigint,p_attempt uuid,p_session text,p_owner uuid,p_price text,
 p_event_id text,p_event_type text,p_subscription text,p_customer text,p_status text,p_period_end timestamptz)
returns text language plpgsql security invoker set search_path=pg_catalog,public as $$
declare loc public.academy_locations%rowtype; attempt public.academy_checkout_attempts%rowtype; result text;
begin
 select * into loc from public.academy_locations where id=p_location for update;
 if not found then return 'not_found'; end if;
 select * into attempt from public.academy_checkout_attempts where id=p_attempt and location_id=p_location for update;
 if not found or attempt.stripe_session_id is distinct from p_session or attempt.owner_id<>p_owner or attempt.price_id<>p_price
   or loc.billing_owner_id<>p_owner or not exists(select 1 from public.academy_location_members m where m.location_id=p_location and m.user_id=p_owner and m.active and m.role='owner')
   or (attempt.customer_id is not null and attempt.customer_id<>p_customer)
   or p_event_type not in ('checkout.session.completed','checkout.session.async_payment_succeeded')
 then return 'mismatch'; end if;
 if attempt.state='bound' then
   if attempt.bound_subscription_id=p_subscription and loc.stripe_subscription_id=p_subscription then return 'duplicate'; end if;
   return 'mismatch';
 end if;
 if attempt.state<>'pending' or loc.stripe_subscription_id is not null or p_status not in ('active','trialing') then return 'mismatch'; end if;
 result:=public.academy_reconcile_subscription_atomic(p_location,p_revision,p_event_id,p_event_type,p_subscription,p_customer,p_status,p_period_end);
 if result='applied' then
   update public.academy_checkout_attempts set state='bound',bound_subscription_id=p_subscription where id=p_attempt;
 end if;
 return result;
end $$;

revoke all on function public.academy_reserve_checkout(uuid,uuid,text,text),public.academy_record_checkout_session(uuid,text),
 public.academy_bind_checkout_atomic(uuid,bigint,uuid,text,uuid,text,text,text,text,text,text,timestamptz) from public,anon,authenticated;
grant execute on function public.academy_reserve_checkout(uuid,uuid,text,text),public.academy_record_checkout_session(uuid,text),
 public.academy_bind_checkout_atomic(uuid,bigint,uuid,text,uuid,text,text,text,text,text,text,timestamptz) to service_role;
COMMIT;
