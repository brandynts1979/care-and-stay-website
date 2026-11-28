-- Apply after staged_academy_checkout_binding.sql. Routes stay empty until
-- isolated recipient projects and tenant associations have been verified.
begin;

create table public.academy_qsr_bundle_routes (
  location_id uuid not null references public.academy_locations(id),
  product text not null check (product in ('organizational_360','individual_360')),
  target_id uuid not null,
  primary key (location_id, product),
  unique (product, target_id)
);

create table public.academy_qsr_bundle_delivery (
  location_id uuid not null,
  product text not null,
  revision bigint not null check (revision > 0),
  desired_active boolean not null,
  period_end timestamptz,
  acknowledged_at timestamptz,
  primary key (location_id, product),
  foreign key (location_id, product) references public.academy_qsr_bundle_routes(location_id, product),
  check (not desired_active or period_end is not null)
);

alter table public.academy_qsr_bundle_routes enable row level security;
alter table public.academy_qsr_bundle_delivery enable row level security;
revoke all on public.academy_qsr_bundle_routes, public.academy_qsr_bundle_delivery from public, anon, authenticated, service_role;
grant select, insert on public.academy_qsr_bundle_routes to service_role;
grant select, insert, update on public.academy_qsr_bundle_delivery to service_role;

create function academy_internal.enqueue_qsr_bundle(p_location uuid)
returns void language sql security invoker set search_path=pg_catalog,public as $$
  insert into public.academy_qsr_bundle_delivery as d(location_id,product,revision,desired_active,period_end)
  select l.id,r.product,l.billing_revision,
    l.subscription_status in ('active','trialing') and coalesce(l.current_period_end>now(),false), l.current_period_end
  from public.academy_locations l
  join public.academy_qsr_bundle_routes r on r.location_id=l.id
  where l.id=p_location and l.billing_revision>0
  and exists (
    select 1 from public.academy_checkout_attempts a
    where a.location_id=l.id and a.state='bound' and a.bound_subscription_id=l.stripe_subscription_id
      and a.price_id='price_1UgSjtHJxPBidfhbyvsfGsM6'
  )
  on conflict (location_id,product) do update
  set revision=excluded.revision,desired_active=excluded.desired_active,period_end=excluded.period_end,acknowledged_at=null
  where d.revision<excluded.revision;
$$;

create function academy_internal.enqueue_qsr_bundle_on_location()
returns trigger language plpgsql security invoker set search_path=pg_catalog,public as $$
begin
  perform academy_internal.enqueue_qsr_bundle(new.id);
  return new;
end;
$$;

create function academy_internal.enqueue_qsr_bundle_on_checkout()
returns trigger language plpgsql security invoker set search_path=pg_catalog,public as $$
begin
  perform academy_internal.enqueue_qsr_bundle(new.location_id);
  return new;
end;
$$;

create trigger academy_qsr_bundle_location_revision after update of billing_revision on public.academy_locations
for each row when (new.billing_revision>old.billing_revision)
execute function academy_internal.enqueue_qsr_bundle_on_location();

create trigger academy_qsr_bundle_bound_checkout after update of state on public.academy_checkout_attempts
for each row when (new.state='bound' and old.state is distinct from new.state)
execute function academy_internal.enqueue_qsr_bundle_on_checkout();

revoke all on function academy_internal.enqueue_qsr_bundle(uuid),
  academy_internal.enqueue_qsr_bundle_on_location(), academy_internal.enqueue_qsr_bundle_on_checkout() from public, anon, authenticated;
grant execute on function academy_internal.enqueue_qsr_bundle(uuid),
  academy_internal.enqueue_qsr_bundle_on_location(), academy_internal.enqueue_qsr_bundle_on_checkout() to service_role;

-- A delivery worker supplies an acknowledgement only after the recipient has
-- persisted this exact target and revision. Older in-flight work cannot ack a new revision.
create function public.academy_ack_qsr_bundle_delivery(p_location uuid,p_product text,p_target uuid,p_revision bigint)
returns boolean language plpgsql security invoker set search_path=pg_catalog,public as $$
begin
  update public.academy_qsr_bundle_delivery d set acknowledged_at=coalesce(d.acknowledged_at,now())
  from public.academy_qsr_bundle_routes r
  where d.location_id=p_location and d.product=p_product and d.revision=p_revision
    and r.location_id=d.location_id and r.product=d.product and r.target_id=p_target;
  return found;
end;
$$;
revoke all on function public.academy_ack_qsr_bundle_delivery(uuid,text,uuid,bigint) from public, anon, authenticated;
grant execute on function public.academy_ack_qsr_bundle_delivery(uuid,text,uuid,bigint) to service_role;
commit;
