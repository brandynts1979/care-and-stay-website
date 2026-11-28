-- Existing QSR issuance ledger; durable delivery of approved native assessment requests.
-- Install after assessment cycles and bundle retry. Service-only; no automatic issuance.
begin;
alter table public.academy_qsr_assessment_issuances
 add column delivered_at timestamptz,
 add column attempt_count integer not null default 0 check(attempt_count between 0 and 1000000),
 add column next_attempt_at timestamptz not null default now(),
 add column lease_token uuid,
 add column lease_until timestamptz,
 add column lease_revision bigint,
 add constraint academy_qsr_issuance_lease_check check(
 (lease_token is null and lease_until is null and lease_revision is null)
 or (lease_token is not null and lease_until is not null and lease_revision>0));
-- Stable issuance IDs and scope must not be changed by delivery processing.
grant update(delivered_at,attempt_count,next_attempt_at,lease_token,lease_until,lease_revision) on public.academy_qsr_assessment_issuances to service_role;
create index academy_qsr_issuance_due_idx on public.academy_qsr_assessment_issuances(next_attempt_at,id) where delivered_at is null;

create function public.academy_claim_qsr_assessment_deliveries(p_limit integer default 4)
returns table(issuance_id uuid,cycle_id uuid,location_id uuid,product text,target_id uuid,gm_user_id uuid,starts_at timestamptz,ends_at timestamptz,revision bigint,lease_token uuid)
language sql security invoker set search_path=pg_catalog,public as $$
 with due as (
 select i.id,l.billing_revision from public.academy_qsr_assessment_issuances i
 join public.academy_qsr_assessment_cycles c on c.id=i.cycle_id
 join public.academy_locations l on l.id=c.location_id
 join public.academy_qsr_bundle_routes r on r.location_id=l.id and r.product=i.product and r.target_id=i.target_id
 join public.academy_qsr_bundle_delivery d on d.location_id=l.id and d.product=i.product
 where i.delivered_at is null and i.next_attempt_at<=now()
 and (i.lease_until is null or i.lease_until<=now())
 and c.starts_at<=now() and c.ends_at>now()
 and l.subscription_status in ('active','trialing') and l.current_period_end>now()
 and d.revision=l.billing_revision and d.desired_active and d.period_end>now() and d.acknowledged_at is not null
 and (i.gm_user_id is null or exists(select 1 from public.academy_location_members m where m.location_id=l.id and m.user_id=i.gm_user_id and m.role='gm' and m.active))
 order by i.next_attempt_at,i.id limit greatest(0,least(coalesce(p_limit,4),4)) for update of i skip locked
 ), claimed as (
 update public.academy_qsr_assessment_issuances i set attempt_count=least(i.attempt_count+1,1000000),lease_token=gen_random_uuid(),lease_until=now()+interval '120 seconds',lease_revision=due.billing_revision
 from due where i.id=due.id returning i.*
 )
 select i.id,c.id,c.location_id,i.product,i.target_id,i.gm_user_id,c.starts_at,c.ends_at,i.lease_revision,i.lease_token
 from claimed i join public.academy_qsr_assessment_cycles c on c.id=i.cycle_id;
$$;
revoke all on function public.academy_claim_qsr_assessment_deliveries(integer) from public,anon,authenticated;
grant execute on function public.academy_claim_qsr_assessment_deliveries(integer) to service_role;

create function public.academy_finish_qsr_assessment_delivery(p_issuance uuid,p_revision bigint,p_lease uuid,p_native_id uuid,p_success boolean)
returns boolean language plpgsql security invoker set search_path=pg_catalog,public as $$
declare
 v_location uuid;
 v_gm uuid;
 v_checked_at timestamptz;
begin
 if p_lease is null or p_revision is null or p_success is null or (p_success and p_native_id is distinct from p_issuance) then return false; end if;
 -- Match the lock order of subscription reconciliation and original issuance.
 -- A successful receipt must not race a billing change or GM removal.
 if p_success then
   select l.id,i.gm_user_id into v_location,v_gm
   from public.academy_qsr_assessment_issuances i
   join public.academy_qsr_assessment_cycles c on c.id=i.cycle_id
   join public.academy_locations l on l.id=c.location_id
   where i.id=p_issuance
   for update of l;
   if not found then return false; end if;
   if v_gm is not null then
     perform 1 from public.academy_location_members m
     where m.location_id=v_location and m.user_id=v_gm and m.role='gm' and m.active
     for share of m;
     if not found then return false; end if;
   end if;
 end if;
 -- Use wall clock after waiting for locks; a transaction-start timestamp
 -- must not allow an expired lease, cycle, or subscription to complete.
 v_checked_at:=clock_timestamp();
 update public.academy_qsr_assessment_issuances i
 set delivered_at=case when p_success then v_checked_at else null end,
 next_attempt_at=case when p_success then v_checked_at else v_checked_at+make_interval(secs=>least(3600,15*power(2,least(i.attempt_count,8)))::double precision) end,
 lease_token=null,lease_until=null,lease_revision=null
 from public.academy_qsr_assessment_cycles c,public.academy_locations l,public.academy_qsr_bundle_delivery d,public.academy_qsr_bundle_routes r
 where i.id=p_issuance and i.delivered_at is null and i.lease_token=p_lease and i.lease_until>v_checked_at and i.lease_revision=p_revision
 and c.id=i.cycle_id and l.id=c.location_id and d.location_id=l.id and d.product=i.product
 and r.location_id=l.id and r.product=i.product and r.target_id=i.target_id
 and (not p_success or (l.billing_revision=p_revision and l.subscription_status in ('active','trialing') and l.current_period_end>v_checked_at
 and c.starts_at<=v_checked_at and c.ends_at>v_checked_at and d.revision=p_revision and d.desired_active and d.period_end>v_checked_at and d.acknowledged_at is not null
 and (i.gm_user_id is null or exists(select 1 from public.academy_location_members m where m.location_id=l.id and m.user_id=i.gm_user_id and m.role='gm' and m.active))));
 return found;
end $$;
revoke all on function public.academy_finish_qsr_assessment_delivery(uuid,bigint,uuid,uuid,boolean) from public,anon,authenticated;
grant execute on function public.academy_finish_qsr_assessment_delivery(uuid,bigint,uuid,uuid,boolean) to service_role;
commit;
