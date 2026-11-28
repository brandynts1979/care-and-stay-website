-- Apply after staged_qsr_bundle_delivery.sql. Operators establish windows and
-- approved GM eligibility only after the cycle and replacement terms are settled.
begin;

create table public.academy_qsr_assessment_cycles (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references public.academy_locations(id),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  unique (location_id, starts_at),
  check (isfinite(starts_at) and isfinite(ends_at)
    and ends_at=((starts_at at time zone 'UTC')+interval '6 months') at time zone 'UTC')
);

create table public.academy_qsr_assessment_gms (
  cycle_id uuid not null references public.academy_qsr_assessment_cycles(id),
  gm_user_id uuid not null references auth.users(id),
  primary key (cycle_id,gm_user_id)
);

create table public.academy_qsr_assessment_issuances (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references public.academy_qsr_assessment_cycles(id),
  product text not null,
  target_id uuid not null,
  gm_user_id uuid,
  created_at timestamptz not null default now(),
  unique nulls not distinct (cycle_id,product,gm_user_id),
  foreign key (cycle_id,gm_user_id) references public.academy_qsr_assessment_gms(cycle_id,gm_user_id),
  check ((product='organizational_360' and gm_user_id is null)
      or (product='individual_360' and gm_user_id is not null))
);
create index academy_qsr_assessment_issuances_gm_idx
  on public.academy_qsr_assessment_issuances(gm_user_id) where gm_user_id is not null;

alter table public.academy_qsr_assessment_cycles enable row level security;
alter table public.academy_qsr_assessment_gms enable row level security;
alter table public.academy_qsr_assessment_issuances enable row level security;
revoke all on public.academy_qsr_assessment_cycles, public.academy_qsr_assessment_gms,
  public.academy_qsr_assessment_issuances from public, anon, authenticated, service_role;
grant select, insert on public.academy_qsr_assessment_cycles, public.academy_qsr_assessment_gms,
  public.academy_qsr_assessment_issuances to service_role;

create function academy_internal.check_qsr_assessment_cycle_overlap()
returns trigger language plpgsql security invoker set search_path=pg_catalog,public as $$
begin
  perform 1 from public.academy_locations where id=new.location_id for update;
  if exists(select 1 from public.academy_qsr_assessment_cycles c
      where c.location_id=new.location_id and c.starts_at<new.ends_at and new.starts_at<c.ends_at)
  then raise exception 'QSR assessment cycle overlaps an existing cycle'; end if;
  return new;
end;
$$;
revoke all on function academy_internal.check_qsr_assessment_cycle_overlap() from public,anon,authenticated;
grant execute on function academy_internal.check_qsr_assessment_cycle_overlap() to service_role;
create trigger academy_qsr_assessment_cycle_overlap before insert on public.academy_qsr_assessment_cycles
for each row execute function academy_internal.check_qsr_assessment_cycle_overlap();

-- Service only. The caller derives the requester from verified local identity.
-- The stable issuance ID is the receiving product's idempotency key.
create function public.academy_issue_qsr_assessment(
  p_location uuid,p_cycle uuid,p_product text,p_actor uuid,p_gm uuid default null
)
returns uuid language plpgsql security invoker set search_path=pg_catalog,public as $$
declare
  loc public.academy_locations%rowtype;
  cycle public.academy_qsr_assessment_cycles%rowtype;
  recipient uuid;
  result uuid;
begin
  if p_product is null or p_product not in ('organizational_360','individual_360')
     or (p_product='organizational_360')<>(p_gm is null) then return null; end if;

  select * into loc from public.academy_locations where id=p_location for update;
  if not found or loc.subscription_status not in ('active','trialing')
    or loc.current_period_end is null or loc.current_period_end<=now()
    or not exists(select 1 from public.academy_location_members m
      where m.location_id=p_location and m.user_id=p_actor and m.active and m.role='owner' for share)
  then return null; end if;

  select * into cycle from public.academy_qsr_assessment_cycles
  where id=p_cycle and location_id=p_location and starts_at<=now() and now()<ends_at;
  if not found then return null; end if;

  select r.target_id into recipient
  from public.academy_qsr_bundle_routes r
  join public.academy_qsr_bundle_delivery d using(location_id,product)
  where r.location_id=p_location and r.product=p_product and d.revision=loc.billing_revision
    and d.desired_active and d.period_end>now() and d.acknowledged_at is not null;
  if not found then return null; end if;

  if p_gm is not null then
    if not exists(select 1 from public.academy_qsr_assessment_gms g
      join public.academy_location_members m on m.user_id=g.gm_user_id
      where g.cycle_id=p_cycle and g.gm_user_id=p_gm and m.location_id=p_location and m.active and m.role='gm'
      for share of m) then return null; end if;

    perform pg_advisory_xact_lock(hashtextextended('academy-qsr-gm:'||p_gm::text,0));
    if exists(select 1 from public.academy_qsr_assessment_issuances i
      join public.academy_qsr_assessment_cycles c on c.id=i.cycle_id
      where i.gm_user_id=p_gm and c.id<>p_cycle and c.starts_at<cycle.ends_at and cycle.starts_at<c.ends_at)
    then return null; end if;
  end if;

  insert into public.academy_qsr_assessment_issuances(cycle_id,product,target_id,gm_user_id)
  values(p_cycle,p_product,recipient,p_gm) on conflict(cycle_id,product,gm_user_id) do nothing
  returning id into result;
  if result is null then
    select id into result from public.academy_qsr_assessment_issuances
    where cycle_id=p_cycle and product=p_product and target_id=recipient and gm_user_id is not distinct from p_gm;
  end if;
  return result;
end;
$$;
revoke all on function public.academy_issue_qsr_assessment(uuid,uuid,text,uuid,uuid) from public,anon,authenticated;
grant execute on function public.academy_issue_qsr_assessment(uuid,uuid,text,uuid,uuid) to service_role;
commit;
