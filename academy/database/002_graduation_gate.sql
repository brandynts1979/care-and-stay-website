-- Graduation must only be finalized by a trusted server-side caller.
-- Must run after 001_academy_schema.sql.
begin;
create schema if not exists academy_internal;
revoke all on schema academy_internal from public, anon, authenticated;
grant usage on schema academy_internal to service_role;

create or replace function academy_internal.finalize_graduation(p_enrollment_id uuid,p_reviewer_id uuid)
returns boolean
language plpgsql
security invoker
set search_path = pg_catalog,public
as $$
declare
  v_enrollment public.academy_enrollments%rowtype;
  v_total integer;
  v_done integer;
  v_submissions integer;
  v_approved integer;
begin
  select * into v_enrollment from public.academy_enrollments where id=p_enrollment_id for update;
  if not found or v_enrollment.status <> 'active' or
    (v_enrollment.expires_at is not null and v_enrollment.expires_at <= now())
  then raise exception 'Enrollment not active'; end if;

  if not exists (
    select 1 from public.academy_reviewer_assignments
    where enrollment_id=p_enrollment_id and reviewer_user_id=p_reviewer_id
  ) then raise exception 'Reviewer is not assigned'; end if;

  select count(*) into v_total
    from public.academy_lessons l
    join public.academy_modules m on m.id=l.module_id
    where m.course_id=v_enrollment.course_id and l.published;
  if v_total=0 then raise exception 'Course has no published lessons'; end if;
  select count(distinct p.lesson_id) into v_done
    from public.academy_lesson_progress p
    join public.academy_lessons l on l.id=p.lesson_id
    join public.academy_modules m on m.id=l.module_id
    where p.enrollment_id=p_enrollment_id and m.course_id=v_enrollment.course_id and l.published;
  if v_total <> v_done then raise exception 'Course lessons incomplete'; end if;

  select count(*) into v_submissions from public.academy_submissions s
    where s.enrollment_id=p_enrollment_id;
  if v_submissions=0 then raise exception 'No practice submissions reviewed'; end if;
  select count(*) into v_approved
    from public.academy_submissions s
    join public.academy_reviews r on r.submission_id=s.id and r.decision='approved'
    where s.enrollment_id=p_enrollment_id;
  if v_approved <> v_submissions then raise exception 'Practice approvals incomplete'; end if;

  insert into public.academy_graduations(enrollment_id,approved_by)
  values(p_enrollment_id,p_reviewer_id)
  on conflict(enrollment_id) do nothing;
  update public.academy_enrollments set status='completed' where id=p_enrollment_id;
  return true;
end;
$$;

revoke all on function academy_internal.finalize_graduation(uuid,uuid) from public,anon,authenticated;
grant execute on function academy_internal.finalize_graduation(uuid,uuid) to service_role;
commit;
