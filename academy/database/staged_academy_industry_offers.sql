-- Additive industry-only checkout routing. Apply only after existing checkout binding,
-- explicit course entitlements and QSR bundle delivery migrations; no seed prices.
BEGIN;
create table public.academy_industry_offers(
 id uuid primary key default gen_random_uuid(),
 course_id uuid not null references public.academy_courses(id)
  check(course_id in ('4e9d56db-6ece-8b5f-ac7c-8bd24f809617','01fa508f-2265-8915-9ed3-cd48611927ad','6bec604c-2d3c-88ad-a04f-3f80c4471c5c','2d90f628-dcc5-8d94-a5a3-6c343106187d','6f3d57ab-a581-880e-be45-8e6bc75ec481')),
 price_id text not null check(price_id ~ '^price_[A-Za-z0-9_]+$' and price_id<>'price_1UgSjtHJxPBidfhbyvsfGsM6'),
 product_id text not null check(product_id ~ '^prod_[A-Za-z0-9_]+$'),
 livemode boolean not null,
 unit_amount integer not null check(unit_amount>0),
 currency text not null check(currency='usd'),
 tax_behavior text not null check(tax_behavior in ('exclusive','inclusive')),
 terms_version text not null check(length(trim(terms_version)) between 1 and 128),
 checkout_enabled boolean not null default false,
 unique(livemode,price_id),
 unique(livemode,course_id)
);
create table public.academy_industry_location_offers(
 location_id uuid primary key references public.academy_locations(id),
 offer_id uuid not null references public.academy_industry_offers(id),
 approved_at timestamptz not null default now()
);
alter table public.academy_industry_offers enable row level security;
alter table public.academy_industry_location_offers enable row level security;
revoke all on public.academy_industry_offers,public.academy_industry_location_offers from public,anon,authenticated,service_role;
grant select on public.academy_industry_offers,public.academy_industry_location_offers to service_role;
-- Only the privileged operator can provision a reviewed offer or attach a new location.
-- Never mutate a route to change a paid subscription's price/course. New terms need a reviewed migration.
create function public.academy_industry_route_guard() returns trigger
language plpgsql security invoker set search_path=pg_catalog,public as $$
declare loc public.academy_locations%rowtype;
begin
 if tg_op<>'INSERT' then raise exception 'Industry location offer is immutable'; end if;
 select * into loc from public.academy_locations where id=new.location_id for update;
 if not found or loc.subscription_status<>'pending' or loc.stripe_subscription_id is not null
 or exists(select 1 from public.academy_checkout_attempts where location_id=new.location_id)
 or exists(select 1 from public.academy_location_course_entitlements where location_id=new.location_id)
 or exists(select 1 from public.academy_qsr_bundle_routes where location_id=new.location_id)
 or exists(select 1 from public.academy_enrollments where location_id=new.location_id)
 then raise exception 'Industry offer requires an unused pending location'; end if;
 return new;
end $$;
create trigger academy_industry_route_guard before insert or update or delete on public.academy_industry_location_offers
 for each row execute function public.academy_industry_route_guard();
create function public.academy_industry_offer_immutable() returns trigger
language plpgsql security invoker set search_path=pg_catalog,public as $$
begin
 if tg_op='DELETE' then raise exception 'Retain approved offer history'; end if;
 if (to_jsonb(old)-'checkout_enabled') is distinct from (to_jsonb(new)-'checkout_enabled')
 then raise exception 'Industry offer commercial identity is immutable'; end if;
 return new;
end $$;
create trigger academy_industry_offer_immutable before update or delete on public.academy_industry_offers
 for each row execute function public.academy_industry_offer_immutable();
-- Prevent any unrelated provisioning path from granting another course at an industry location.
create function public.academy_industry_entitlement_guard() returns trigger
language plpgsql security invoker set search_path=pg_catalog,public as $$
declare expected uuid;
begin
 select o.course_id into expected from public.academy_industry_location_offers r
 join public.academy_industry_offers o on o.id=r.offer_id where r.location_id=new.location_id;
 if found and (new.course_id<>expected or new.source<>'verified_subscription') then
  raise exception using errcode='42501',message='Industry location accepts only its verified subscription course';
 end if;
 return new;
end $$;
create trigger academy_industry_entitlement_guard before insert or update on public.academy_location_course_entitlements
 for each row execute function public.academy_industry_entitlement_guard();
-- The legacy implicit grant is preserved for non-industry locations only.
-- Without this additive exact-route filter, a paid industry location would also
-- be granted the published legacy course in production (absent in current staging).
create or replace function public.academy_entitled_course_ids(p_location uuid)
returns table(course_id uuid) language sql stable security invoker set search_path=pg_catalog,public as $$
 select c.id from public.academy_courses c
 join public.academy_locations loc on loc.id=p_location
 where c.published and loc.subscription_status in ('active','trialing')
   and (loc.current_period_end is null or loc.current_period_end>now())
   and (not exists(select 1 from public.academy_industry_location_offers r where r.location_id=loc.id)
        or exists(select 1 from public.academy_industry_location_offers r join public.academy_industry_offers o on o.id=r.offer_id
          where r.location_id=loc.id and o.course_id=c.id))
   and (c.slug='stay-culture-leadership-academy' or exists (
     select 1 from public.academy_location_course_entitlements g
     where g.location_id=loc.id and g.course_id=c.id and g.active
       and (g.expires_at is null or g.expires_at>now())
   ))
 order by c.id;
$$;
revoke all on function public.academy_entitled_course_ids(uuid) from public,anon,authenticated;
grant execute on function public.academy_entitled_course_ids(uuid) to service_role;

create function public.academy_industry_reserve_checkout(p_location uuid,p_owner uuid,p_email text,p_livemode boolean)
returns jsonb language plpgsql security invoker set search_path=pg_catalog,public as $$
declare offer public.academy_industry_offers%rowtype;
begin
 perform 1 from public.academy_locations where id=p_location for update;
 select o.* into offer from public.academy_industry_location_offers r join public.academy_industry_offers o on o.id=r.offer_id
 where r.location_id=p_location;
 if not found or offer.livemode is distinct from p_livemode or not offer.checkout_enabled
 or not exists(select 1 from public.academy_courses where id=offer.course_id and published)
 or exists(select 1 from public.academy_qsr_bundle_routes where location_id=p_location)
 then return jsonb_build_object('result','unavailable'); end if;
 return public.academy_reserve_checkout(p_location,p_owner,p_email,offer.price_id);
end $$;
create function public.academy_industry_bind_checkout_atomic(p_location uuid,p_revision bigint,p_attempt uuid,p_session text,p_owner uuid,p_price text,
 p_event_id text,p_event_type text,p_subscription text,p_customer text,p_status text,p_period_end timestamptz,p_livemode boolean)
returns text language plpgsql security invoker set search_path=pg_catalog,public as $$
declare offer public.academy_industry_offers%rowtype; attempt public.academy_checkout_attempts%rowtype; result text;
begin
 perform 1 from public.academy_locations where id=p_location for update;
 select o.* into offer from public.academy_industry_location_offers r join public.academy_industry_offers o on o.id=r.offer_id
 where r.location_id=p_location;
 if not found or offer.livemode is distinct from p_livemode or offer.price_id is distinct from p_price
 or exists(select 1 from public.academy_qsr_bundle_routes where location_id=p_location)
 then return 'mismatch'; end if;
 select * into attempt from public.academy_checkout_attempts where id=p_attempt and location_id=p_location for update;
 if not found or attempt.price_id<>offer.price_id then return 'mismatch'; end if;
 if attempt.state='bound' then
  -- A genuine duplicate must never restore a grant deliberately revoked by an operator.
  return public.academy_bind_checkout_atomic(p_location,p_revision,p_attempt,p_session,p_owner,p_price,p_event_id,p_event_type,p_subscription,p_customer,p_status,p_period_end);
 end if;
 if attempt.state<>'pending' or not exists(select 1 from public.academy_courses where id=offer.course_id and published)
 or exists(select 1 from public.academy_location_course_entitlements where location_id=p_location)
 then return 'mismatch'; end if;
 begin
  insert into public.academy_location_course_entitlements(location_id,course_id,active,source)
   values(p_location,offer.course_id,true,'verified_subscription');
  result:=public.academy_bind_checkout_atomic(p_location,p_revision,p_attempt,p_session,p_owner,p_price,p_event_id,p_event_type,p_subscription,p_customer,p_status,p_period_end);
  if result<>'applied' then raise exception using errcode='PZ003',message='Rollback unapplied industry binding'; end if;
 exception when sqlstate 'PZ003' then
  if result='duplicate' then return 'mismatch'; end if;
  return result;
 end;
 return 'applied';
end $$;
create function public.academy_industry_reconcile_subscription_atomic(p_location uuid,p_revision bigint,p_event_id text,p_event_type text,
 p_subscription text,p_customer text,p_status text,p_period_end timestamptz,p_price text,p_livemode boolean)
returns text language plpgsql security invoker set search_path=pg_catalog,public as $$
declare offer public.academy_industry_offers%rowtype;
begin
 perform 1 from public.academy_locations where id=p_location for update;
 select o.* into offer from public.academy_industry_location_offers r join public.academy_industry_offers o on o.id=r.offer_id
 where r.location_id=p_location;
 if not found or offer.price_id is distinct from p_price or offer.livemode is distinct from p_livemode
 or not exists(select 1 from public.academy_checkout_attempts where location_id=p_location and state='bound' and bound_subscription_id=p_subscription and price_id=offer.price_id)
 or exists(select 1 from public.academy_qsr_bundle_routes where location_id=p_location)
 then return 'mismatch'; end if;
 -- Existing linked subscriptions reconcile even if new sales are disabled.
 -- An absent/revoked grant is not silently restored; the existing atomic RPC fails closed.
 return public.academy_reconcile_subscription_atomic(p_location,p_revision,p_event_id,p_event_type,p_subscription,p_customer,p_status,p_period_end);
end $$;
revoke all on function public.academy_industry_route_guard(),public.academy_industry_offer_immutable(),public.academy_industry_entitlement_guard() from public,anon,authenticated;
revoke all on function public.academy_industry_reserve_checkout(uuid,uuid,text,boolean),
 public.academy_industry_bind_checkout_atomic(uuid,bigint,uuid,text,uuid,text,text,text,text,text,text,timestamptz,boolean),
 public.academy_industry_reconcile_subscription_atomic(uuid,bigint,text,text,text,text,text,timestamptz,text,boolean) from public,anon,authenticated;
grant execute on function public.academy_industry_reserve_checkout(uuid,uuid,text,boolean),
 public.academy_industry_bind_checkout_atomic(uuid,bigint,uuid,text,uuid,text,text,text,text,text,text,timestamptz,boolean),
 public.academy_industry_reconcile_subscription_atomic(uuid,bigint,text,text,text,text,text,timestamptz,text,boolean) to service_role;
COMMIT;
