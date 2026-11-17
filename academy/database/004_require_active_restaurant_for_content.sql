-- Require an active paid restaurant and active membership to view Academy content.
-- Graduates retain progress/graduation records, but paid course content is subscription-gated.
begin;
drop policy if exists "course available to enrolled learner" on public.academy_courses;
create policy "course available to active location learners" on public.academy_courses
for select to authenticated using (
  published and exists (
    select 1
    from public.academy_enrollments e
    join public.academy_locations l on l.id = e.location_id
    join public.academy_location_members m
      on m.location_id = l.id and m.user_id = e.user_id
    where e.course_id = academy_courses.id
      and e.user_id = (select auth.uid())
      and e.status in ('active','completed')
      and (e.expires_at is null or e.expires_at > now())
      and m.active
      and l.subscription_status in ('active','trialing')
      and (l.current_period_end is null or l.current_period_end > now())
  )
);
commit;
