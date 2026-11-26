-- STAGED candidate only. Apply after staged_qsr_member_revocation.sql in a coordinated release.
-- Existing published legacy course retains current billing behavior. Future courses require explicit location grants.
BEGIN;
create table public.academy_location_course_entitlements (
  location_id uuid not null references public.academy_locations(id),
  course_id uuid not null references public.academy_courses(id),
  active boolean not null default false,
  expires_at timestamptz,
  source text not null check(source in ('internal_demo','approved_location_contract','verified_subscription')),
  granted_at timestamptz not null default now(),
  primary key(location_id,course_id)
);
alter table public.academy_location_course_entitlements enable row level security;
revoke all on public.academy_location_course_entitlements from public,anon,authenticated;
grant select(location_id,course_id,active,expires_at) on public.academy_location_course_entitlements to authenticated;
grant all on public.academy_location_course_entitlements to service_role;
create policy "own active location course grants" on public.academy_location_course_entitlements
for select to authenticated using (exists (
 select 1 from public.academy_location_members m
 where m.location_id=academy_location_course_entitlements.location_id and m.user_id=(select auth.uid()) and m.active
));

-- Existing ownership/paid-location policy remains required. An explicitly granted course must
-- be authorized at the SAME enrolled location, not at another location with an unrelated grant.
create policy "explicit course entitlement for new versions" on public.academy_courses
as restrictive for select to authenticated using (
 slug='stay-culture-leadership-academy' or exists (
   select 1 from public.academy_enrollments e
   join public.academy_location_members m on m.location_id=e.location_id and m.user_id=e.user_id
   join public.academy_locations loc on loc.id=e.location_id
   join public.academy_location_course_entitlements g on g.location_id=e.location_id and g.course_id=e.course_id
   where e.course_id=academy_courses.id and e.user_id=(select auth.uid())
     and e.status in ('active','completed') and (e.expires_at is null or e.expires_at>now())
     and m.active and loc.subscription_status in ('active','trialing')
     and (loc.current_period_end is null or loc.current_period_end>now())
     and g.active and (g.expires_at is null or g.expires_at>now())
 )
);
create policy "explicit new course insert grant" on public.academy_lesson_progress as restrictive for insert to authenticated with check (exists (
 select 1 from public.academy_enrollments e join public.academy_courses c on c.id=e.course_id
 where e.id=academy_lesson_progress.enrollment_id and e.user_id=(select auth.uid())
 and (c.slug='stay-culture-leadership-academy' or exists (
   select 1 from public.academy_location_course_entitlements g
   where g.location_id=e.location_id and g.course_id=e.course_id
   and g.active and (g.expires_at is null or g.expires_at>now())
 ))
));
create policy "explicit new course update grant" on public.academy_lesson_progress as restrictive for update to authenticated using (exists (
 select 1 from public.academy_enrollments e join public.academy_courses c on c.id=e.course_id
 where e.id=academy_lesson_progress.enrollment_id and e.user_id=(select auth.uid())
 and (c.slug='stay-culture-leadership-academy' or exists (
   select 1 from public.academy_location_course_entitlements g
   where g.location_id=e.location_id and g.course_id=e.course_id
   and g.active and (g.expires_at is null or g.expires_at>now())
 ))
)) with check (exists (
 select 1 from public.academy_enrollments e join public.academy_courses c on c.id=e.course_id
 where e.id=academy_lesson_progress.enrollment_id and e.user_id=(select auth.uid())
 and (c.slug='stay-culture-leadership-academy' or exists (
   select 1 from public.academy_location_course_entitlements g
   where g.location_id=e.location_id and g.course_id=e.course_id
   and g.active and (g.expires_at is null or g.expires_at>now())
 ))
));

create policy "explicit new course insert grant" on public.academy_private_reflections as restrictive for insert to authenticated with check (exists (
 select 1 from public.academy_enrollments e join public.academy_courses c on c.id=e.course_id
 where e.id=academy_private_reflections.enrollment_id and e.user_id=(select auth.uid())
 and (c.slug='stay-culture-leadership-academy' or exists (
   select 1 from public.academy_location_course_entitlements g
   where g.location_id=e.location_id and g.course_id=e.course_id
   and g.active and (g.expires_at is null or g.expires_at>now())
 ))
));
create policy "explicit new course update grant" on public.academy_private_reflections as restrictive for update to authenticated using (exists (
 select 1 from public.academy_enrollments e join public.academy_courses c on c.id=e.course_id
 where e.id=academy_private_reflections.enrollment_id and e.user_id=(select auth.uid())
 and (c.slug='stay-culture-leadership-academy' or exists (
   select 1 from public.academy_location_course_entitlements g
   where g.location_id=e.location_id and g.course_id=e.course_id
   and g.active and (g.expires_at is null or g.expires_at>now())
 ))
)) with check (exists (
 select 1 from public.academy_enrollments e join public.academy_courses c on c.id=e.course_id
 where e.id=academy_private_reflections.enrollment_id and e.user_id=(select auth.uid())
 and (c.slug='stay-culture-leadership-academy' or exists (
   select 1 from public.academy_location_course_entitlements g
   where g.location_id=e.location_id and g.course_id=e.course_id
   and g.active and (g.expires_at is null or g.expires_at>now())
 ))
));

create policy "explicit new course insert grant" on public.academy_submissions as restrictive for insert to authenticated with check (exists (
 select 1 from public.academy_enrollments e join public.academy_courses c on c.id=e.course_id
 where e.id=academy_submissions.enrollment_id and e.user_id=(select auth.uid())
 and (c.slug='stay-culture-leadership-academy' or exists (
   select 1 from public.academy_location_course_entitlements g
   where g.location_id=e.location_id and g.course_id=e.course_id
   and g.active and (g.expires_at is null or g.expires_at>now())
 ))
));
create policy "explicit new course update grant" on public.academy_submissions as restrictive for update to authenticated using (exists (
 select 1 from public.academy_enrollments e join public.academy_courses c on c.id=e.course_id
 where e.id=academy_submissions.enrollment_id and e.user_id=(select auth.uid())
 and (c.slug='stay-culture-leadership-academy' or exists (
   select 1 from public.academy_location_course_entitlements g
   where g.location_id=e.location_id and g.course_id=e.course_id
   and g.active and (g.expires_at is null or g.expires_at>now())
 ))
)) with check (exists (
 select 1 from public.academy_enrollments e join public.academy_courses c on c.id=e.course_id
 where e.id=academy_submissions.enrollment_id and e.user_id=(select auth.uid())
 and (c.slug='stay-culture-leadership-academy' or exists (
   select 1 from public.academy_location_course_entitlements g
   where g.location_id=e.location_id and g.course_id=e.course_id
   and g.active and (g.expires_at is null or g.expires_at>now())
 ))
));
-- Only service role can resolve provisioning targets. No automatic entitlement creation, no Stripe price assumptions.
create function public.academy_entitled_course_ids(p_location uuid)
returns table(course_id uuid) language sql stable security invoker set search_path=pg_catalog,public as $$
 select c.id from public.academy_courses c
 join public.academy_locations loc on loc.id=p_location
 where c.published and loc.subscription_status in ('active','trialing')
   and (loc.current_period_end is null or loc.current_period_end>now())
   and (c.slug='stay-culture-leadership-academy' or exists (
     select 1 from public.academy_location_course_entitlements g
     where g.location_id=loc.id and g.course_id=c.id and g.active
       and (g.expires_at is null or g.expires_at>now())
   ))
 order by c.id;
$$;
revoke all on function public.academy_entitled_course_ids(uuid) from public,anon,authenticated;
grant execute on function public.academy_entitled_course_ids(uuid) to service_role;
-- Learner course selector checks the exact enrollment; a visible course at one location
-- must not make a stale enrollment at another location appear selectable.
create function public.academy_learner_available_enrollments()
returns table(id uuid,course_id uuid,location_id uuid,location_name text,status text,expires_at timestamptz)
language sql stable security invoker set search_path=pg_catalog,public as $
 select e.id,e.course_id,e.location_id,loc.name,e.status,e.expires_at
 from public.academy_enrollments e
 join public.academy_courses c on c.id=e.course_id
 join public.academy_locations loc on loc.id=e.location_id
 join public.academy_location_members m on m.location_id=e.location_id and m.user_id=e.user_id
 where e.user_id=(select auth.uid()) and c.published
   and e.status in ('active','completed') and (e.expires_at is null or e.expires_at>now())
   and m.active and loc.subscription_status in ('active','trialing')
   and (loc.current_period_end is null or loc.current_period_end>now())
   and (c.slug='stay-culture-leadership-academy' or exists (
     select 1 from public.academy_location_course_entitlements g
     where g.location_id=e.location_id and g.course_id=e.course_id and g.active
       and (g.expires_at is null or g.expires_at>now())
   ))
 order by e.created_at desc,e.id;
$;
revoke all on function public.academy_learner_available_enrollments() from public,anon,authenticated;
grant execute on function public.academy_learner_available_enrollments() to authenticated;
COMMIT;
