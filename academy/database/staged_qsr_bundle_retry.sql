-- Add durable leases and fair retry scheduling after staged_qsr_bundle_delivery.sql.
-- Service-only. No new subscriptions, routes, assessments or user records.
begin;
alter table public.academy_qsr_bundle_delivery
 add column attempt_count integer not null default 0 check(attempt_count between 0 and 1000000),
 add column next_attempt_at timestamptz not null default now(),
 add column lease_token uuid,
 add column lease_until timestamptz,
 add constraint academy_qsr_delivery_lease_pair check((lease_token is null)=(lease_until is null));
create index academy_qsr_delivery_due_idx on public.academy_qsr_bundle_delivery(next_attempt_at,location_id,product) where acknowledged_at is null;

create function academy_internal.reset_qsr_delivery_lease()
returns trigger language plpgsql security invoker set search_path=pg_catalog,public as $$
begin
 if new.revision>old.revision then
  new.attempt_count:=0; new.next_attempt_at:=now(); new.lease_token:=null; new.lease_until:=null;
 end if;
 return new;
end $$;
revoke all on function academy_internal.reset_qsr_delivery_lease() from public,anon,authenticated;
grant execute on function academy_internal.reset_qsr_delivery_lease() to service_role;
create trigger academy_qsr_delivery_revision_reset before update of revision on public.academy_qsr_bundle_delivery
 for each row execute function academy_internal.reset_qsr_delivery_lease();

create function public.academy_claim_qsr_bundle_deliveries(p_limit integer default 4)
returns table(location_id uuid,product text,target_id uuid,revision bigint,desired_active boolean,period_end timestamptz,lease_token uuid)
language sql security invoker set search_path=pg_catalog,public as $$
 with due as (
  select d.location_id,d.product from public.academy_qsr_bundle_delivery d
  where d.acknowledged_at is null and d.next_attempt_at<=now() and (d.lease_until is null or d.lease_until<=now())
  order by d.next_attempt_at,d.location_id,d.product
  limit greatest(0,least(coalesce(p_limit,4),4))
  for update of d skip locked
 ), claimed as (
  update public.academy_qsr_bundle_delivery d
  set attempt_count=least(d.attempt_count+1,1000000),lease_token=gen_random_uuid(),lease_until=now()+interval '120 seconds'
  from due where d.location_id=due.location_id and d.product=due.product
  returning d.location_id,d.product,d.revision,d.desired_active,d.period_end,d.lease_token
 )
 select c.location_id,c.product,r.target_id,c.revision,c.desired_active,c.period_end,c.lease_token
 from claimed c join public.academy_qsr_bundle_routes r using(location_id,product);
$$;
revoke all on function public.academy_claim_qsr_bundle_deliveries(integer) from public,anon,authenticated;
grant execute on function public.academy_claim_qsr_bundle_deliveries(integer) to service_role;

-- Only a protected worker that verified the exact signed persisted receipt
-- passes p_success=true. A stale lease/revision can never acknowledge new work.
create function public.academy_finish_qsr_bundle_delivery(p_location uuid,p_product text,p_target uuid,p_revision bigint,p_lease uuid,p_success boolean)
returns boolean language plpgsql security invoker set search_path=pg_catalog,public as $$
begin
 if p_lease is null or p_success is null then return false; end if;
 update public.academy_qsr_bundle_delivery d
 set acknowledged_at=case when p_success then now() else null end,
     next_attempt_at=case when p_success then now() else now()+make_interval(secs=>least(3600,15*power(2,least(d.attempt_count,8)))::double precision) end,
     lease_token=null,lease_until=null
 from public.academy_qsr_bundle_routes r
 where d.location_id=p_location and d.product=p_product and d.revision=p_revision and d.acknowledged_at is null
 and d.lease_token=p_lease and d.lease_until>now()
 and r.location_id=d.location_id and r.product=d.product and r.target_id=p_target;
 return found;
end $$;
revoke all on function public.academy_finish_qsr_bundle_delivery(uuid,text,uuid,bigint,uuid,boolean) from public,anon,authenticated;
grant execute on function public.academy_finish_qsr_bundle_delivery(uuid,text,uuid,bigint,uuid,boolean) to service_role;
commit;
