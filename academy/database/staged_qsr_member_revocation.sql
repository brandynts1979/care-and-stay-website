-- STAGED migration candidate, not applied to production. Test in disposable Postgres first.
-- Restrictive write policies supplement, rather than replace, existing ownership and lesson checks.
-- A learner with access at location A must not write to a stale enrollment at location B.
BEGIN;
create policy "exact active location insert" on public.academy_lesson_progress
as restrictive for insert to authenticated with check (exists (
  select 1 from public.academy_enrollments e
  join public.academy_location_members m on m.location_id=e.location_id and m.user_id=e.user_id
  join public.academy_locations loc on loc.id=e.location_id
  where e.id=academy_lesson_progress.enrollment_id and e.user_id=(select auth.uid())
    and e.status='active' and (e.expires_at is null or e.expires_at>now())
    and m.active and loc.subscription_status in ('active','trialing')
    and (loc.current_period_end is null or loc.current_period_end>now())
));
create policy "exact active location update" on public.academy_lesson_progress
as restrictive for update to authenticated using (exists (
  select 1 from public.academy_enrollments e
  join public.academy_location_members m on m.location_id=e.location_id and m.user_id=e.user_id
  join public.academy_locations loc on loc.id=e.location_id
  where e.id=academy_lesson_progress.enrollment_id and e.user_id=(select auth.uid())
    and e.status='active' and (e.expires_at is null or e.expires_at>now())
    and m.active and loc.subscription_status in ('active','trialing')
    and (loc.current_period_end is null or loc.current_period_end>now())
)) with check (exists (
  select 1 from public.academy_enrollments e
  join public.academy_location_members m on m.location_id=e.location_id and m.user_id=e.user_id
  join public.academy_locations loc on loc.id=e.location_id
  where e.id=academy_lesson_progress.enrollment_id and e.user_id=(select auth.uid())
    and e.status='active' and (e.expires_at is null or e.expires_at>now())
    and m.active and loc.subscription_status in ('active','trialing')
    and (loc.current_period_end is null or loc.current_period_end>now())
));

create policy "exact active location insert" on public.academy_private_reflections
as restrictive for insert to authenticated with check (exists (
  select 1 from public.academy_enrollments e
  join public.academy_location_members m on m.location_id=e.location_id and m.user_id=e.user_id
  join public.academy_locations loc on loc.id=e.location_id
  where e.id=academy_private_reflections.enrollment_id and e.user_id=(select auth.uid())
    and e.status='active' and (e.expires_at is null or e.expires_at>now())
    and m.active and loc.subscription_status in ('active','trialing')
    and (loc.current_period_end is null or loc.current_period_end>now())
));
create policy "exact active location update" on public.academy_private_reflections
as restrictive for update to authenticated using (exists (
  select 1 from public.academy_enrollments e
  join public.academy_location_members m on m.location_id=e.location_id and m.user_id=e.user_id
  join public.academy_locations loc on loc.id=e.location_id
  where e.id=academy_private_reflections.enrollment_id and e.user_id=(select auth.uid())
    and e.status='active' and (e.expires_at is null or e.expires_at>now())
    and m.active and loc.subscription_status in ('active','trialing')
    and (loc.current_period_end is null or loc.current_period_end>now())
)) with check (exists (
  select 1 from public.academy_enrollments e
  join public.academy_location_members m on m.location_id=e.location_id and m.user_id=e.user_id
  join public.academy_locations loc on loc.id=e.location_id
  where e.id=academy_private_reflections.enrollment_id and e.user_id=(select auth.uid())
    and e.status='active' and (e.expires_at is null or e.expires_at>now())
    and m.active and loc.subscription_status in ('active','trialing')
    and (loc.current_period_end is null or loc.current_period_end>now())
));

create policy "exact active location insert" on public.academy_submissions
as restrictive for insert to authenticated with check (exists (
  select 1 from public.academy_enrollments e
  join public.academy_location_members m on m.location_id=e.location_id and m.user_id=e.user_id
  join public.academy_locations loc on loc.id=e.location_id
  where e.id=academy_submissions.enrollment_id and e.user_id=(select auth.uid())
    and e.status='active' and (e.expires_at is null or e.expires_at>now())
    and m.active and loc.subscription_status in ('active','trialing')
    and (loc.current_period_end is null or loc.current_period_end>now())
));
create policy "exact active location update" on public.academy_submissions
as restrictive for update to authenticated using (exists (
  select 1 from public.academy_enrollments e
  join public.academy_location_members m on m.location_id=e.location_id and m.user_id=e.user_id
  join public.academy_locations loc on loc.id=e.location_id
  where e.id=academy_submissions.enrollment_id and e.user_id=(select auth.uid())
    and e.status='active' and (e.expires_at is null or e.expires_at>now())
    and m.active and loc.subscription_status in ('active','trialing')
    and (loc.current_period_end is null or loc.current_period_end>now())
)) with check (exists (
  select 1 from public.academy_enrollments e
  join public.academy_location_members m on m.location_id=e.location_id and m.user_id=e.user_id
  join public.academy_locations loc on loc.id=e.location_id
  where e.id=academy_submissions.enrollment_id and e.user_id=(select auth.uid())
    and e.status='active' and (e.expires_at is null or e.expires_at>now())
    and m.active and loc.subscription_status in ('active','trialing')
    and (loc.current_period_end is null or loc.current_period_end>now())
));

-- Service-only, SECURITY INVOKER. Role and target checks repeated inside the transaction.
-- No browser can choose a privileged actor. Edge handler supplies verified auth user ID.
create function public.academy_deactivate_member_atomic(p_actor uuid,p_location uuid,p_target uuid)
returns text language plpgsql security invoker set search_path=pg_catalog,public as $$
declare
  billing_owner uuid;
  actor_role text;
  target_role text;
  target_active boolean;
  revoked integer;
begin
  select billing_owner_id into billing_owner from public.academy_locations where id=p_location for update;
  if not found then return 'not_found'; end if;
  -- Acquire membership locks in one deterministic order.
  perform 1 from public.academy_location_members where location_id=p_location and user_id in (p_actor,p_target) order by user_id for update;
  select role into actor_role from public.academy_location_members where location_id=p_location and user_id=p_actor and active;
  if actor_role is null or actor_role not in ('owner','gm') then return 'forbidden'; end if;
  select role,active into target_role,target_active from public.academy_location_members where location_id=p_location and user_id=p_target;
  if not found then return 'not_found'; end if;
  if p_target=billing_owner or target_role='owner'
     or (actor_role='gm' and target_role not in ('manager','shift_leader'))
     or (actor_role='owner' and target_role not in ('gm','manager','shift_leader')) then return 'forbidden'; end if;
  update public.academy_location_members set active=false where location_id=p_location and user_id=p_target and active;
  update public.academy_enrollments set status='revoked'
    where location_id=p_location and user_id=p_target and status not in ('completed','revoked');
  get diagnostics revoked=row_count;
  if target_active or revoked>0 then
    insert into public.academy_audit_log(actor_id,action,target) values(p_actor,'member_deactivated',p_location::text);
  end if;
  return 'deactivated';
end;
$$;
revoke all on function public.academy_deactivate_member_atomic(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.academy_deactivate_member_atomic(uuid,uuid,uuid) to service_role;
COMMIT;
