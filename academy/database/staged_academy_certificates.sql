-- Apply after staged_academy_course_entitlements.sql and the graduation gate.
begin;

create function public.academy_my_completion_certificate(p_enrollment uuid)
returns table(course_title text, awarded_at timestamptz)
language sql stable security invoker set search_path=pg_catalog,public as $$
  select c.title,g.approved_at
  from public.academy_learner_available_enrollments() e
  join public.academy_graduations g on g.enrollment_id=e.id
  join public.academy_courses c on c.id=e.course_id
  where e.id=p_enrollment and e.status='completed';
$$;
revoke all on function public.academy_my_completion_certificate(uuid) from public, anon, authenticated;
grant execute on function public.academy_my_completion_certificate(uuid) to authenticated;

commit;
