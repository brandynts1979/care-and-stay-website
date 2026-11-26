-- STAGED only. Apply after staged_academy_atomic_invites.sql.
BEGIN;
alter table public.academy_locations add column billing_revision bigint not null default 0;
-- Reconcile one verified Stripe snapshot and mark its event processed in one transaction.
-- Caller reads billing_revision BEFORE retrieving the authoritative Stripe subscription.
-- If another snapshot wins meanwhile, retry retrieval, never apply the stale snapshot.
create function public.academy_reconcile_subscription_atomic(
 p_location uuid,p_revision bigint,p_event_id text,p_event_type text,p_subscription text,p_customer text,p_status text,p_period_end timestamptz
) returns text language plpgsql security invoker set search_path=pg_catalog,public as $$
declare loc public.academy_locations%rowtype;
 event_done timestamptz; is_active boolean; course_count integer;
begin
 if p_revision is null or p_revision<0 or p_event_id is null or p_event_type is null or p_subscription is null or p_customer is null
    or p_status is null or p_status not in ('trialing','active','past_due','canceled','unpaid','incomplete','paused')
 then return 'invalid'; end if;
 select * into loc from public.academy_locations where id=p_location for update;
 if not found then return 'not_found'; end if;
 if (loc.stripe_subscription_id is not null and loc.stripe_subscription_id<>p_subscription)
    or (loc.stripe_customer_id is not null and loc.stripe_customer_id<>p_customer) then return 'mismatch'; end if;
 insert into public.academy_billing_events(stripe_event_id,event_type)
 values(p_event_id,p_event_type) on conflict(stripe_event_id) do nothing;
 select processed_at into event_done from public.academy_billing_events where stripe_event_id=p_event_id for update;
 if event_done is not null then return 'duplicate'; end if;
 if loc.billing_revision<>p_revision then return 'retry'; end if;
 -- Paid subscriptions must provide a valid finite period; no unbounded access from malformed data.
 if p_status in ('active','trialing') and p_period_end is null then return 'invalid'; end if;
 is_active=p_status in ('active','trialing') and p_period_end>now();
 update public.academy_locations set stripe_customer_id=p_customer,stripe_subscription_id=p_subscription,
 subscription_status=p_status,current_period_end=p_period_end,billing_revision=billing_revision+1 where id=p_location;
 if is_active then
   select count(*) into course_count from public.academy_entitled_course_ids(p_location);
   if course_count=0 then raise exception 'Approved Academy course unavailable'; end if;
   -- Set-based upsert preserves completed enrollments and supports unlimited active members.
   insert into public.academy_enrollments as e(location_id,user_id,course_id,status,stripe_subscription_id,granted_at,expires_at)
   select p_location,m.user_id,c.course_id,'active',p_subscription,now(),null
   from public.academy_location_members m cross join public.academy_entitled_course_ids(p_location) c
   where m.location_id=p_location and m.active
   on conflict(location_id,user_id,course_id) do update set
   status=case when e.status='completed' then 'completed' else 'active' end,
   stripe_subscription_id=excluded.stripe_subscription_id,expires_at=null;
 end if;
 -- A cancellation, removed member or expired explicit course grant revokes only
 -- this location's noncompleted enrollment; historical records remain readable.
 update public.academy_enrollments e set status='revoked',expires_at=now()
 where e.location_id=p_location and e.status not in ('completed','revoked')
 and (not is_active or not exists(select 1 from public.academy_location_members m where m.location_id=p_location and m.user_id=e.user_id and m.active)
      or not exists(select 1 from public.academy_entitled_course_ids(p_location) c where c.course_id=e.course_id));
 update public.academy_billing_events set processed_at=now(),processing_error=null where stripe_event_id=p_event_id;
 return 'applied';
end;
$$;
revoke all on function public.academy_reconcile_subscription_atomic(uuid,bigint,text,text,text,text,text,timestamptz) from public,anon,authenticated;
grant execute on function public.academy_reconcile_subscription_atomic(uuid,bigint,text,text,text,text,text,timestamptz) to service_role;
COMMIT;
