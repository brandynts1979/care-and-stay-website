-- Apply after the graduation and explicit-entitlement gates.
begin;

alter table public.academy_reviews add column submission_sha256 text
  check (submission_sha256 ~ '^[0-9a-f]{64}$');

create function public.academy_award_assigned_certificate(p_enrollment uuid, p_reviewer uuid)
returns text language plpgsql security invoker set search_path=pg_catalog,public as $$
declare
  learner public.academy_enrollments%rowtype;
begin
  select * into learner from public.academy_enrollments where id=p_enrollment for update;
  if not found or learner.user_id=p_reviewer or not exists (
    select 1 from public.academy_reviewer_assignments
    where enrollment_id=p_enrollment and reviewer_user_id=p_reviewer
    for share
  ) then return 'forbidden'; end if;

  if learner.expires_at <= now() or not exists (
    select 1 from public.academy_location_members m join public.academy_locations l on l.id=m.location_id
    where m.location_id=learner.location_id and m.user_id=learner.user_id and m.active
      and l.subscription_status in ('active','trialing')
      and (l.current_period_end is null or l.current_period_end>now())
  ) or not exists (
    select 1 from public.academy_entitled_course_ids(learner.location_id) c where c.course_id=learner.course_id
  ) then return 'forbidden'; end if;

  if learner.status='completed' and exists (
    select 1 from public.academy_graduations where enrollment_id=p_enrollment
  ) then return 'awarded'; end if;
  if learner.status<>'active' then return 'forbidden'; end if;

  -- Hold the reviewed versions until the existing graduation gate commits.
  perform 1 from public.academy_submissions where enrollment_id=p_enrollment order by id for share;
  perform 1 from public.academy_reviews r join public.academy_submissions s on s.id=r.submission_id
    where s.enrollment_id=p_enrollment order by r.submission_id for share of r;

  if exists (
    select 1 from public.academy_submissions s
    left join public.academy_reviews r on r.submission_id=s.id
    where s.enrollment_id=p_enrollment
      and r.submission_sha256 is distinct from encode(sha256(convert_to(s.body,'UTF8')),'hex')
  ) then return 'review_required'; end if;

  begin
    perform academy_internal.finalize_graduation(p_enrollment,p_reviewer);
  exception when raise_exception then
    return 'incomplete';
  end;
  return 'awarded';
end;
$$;

revoke all on function public.academy_award_assigned_certificate(uuid,uuid) from public, anon, authenticated;
grant execute on function public.academy_award_assigned_certificate(uuid,uuid) to service_role;
commit;
