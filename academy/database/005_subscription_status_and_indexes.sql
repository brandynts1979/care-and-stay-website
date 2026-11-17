-- Academy production hardening: indexes and full Stripe subscription lifecycle status.
begin;
alter table public.academy_locations drop constraint if exists academy_locations_subscription_status_check;
alter table public.academy_locations add constraint academy_locations_subscription_status_check
check(subscription_status in ('pending','trialing','active','past_due','canceled','unpaid','incomplete','incomplete_expired','paused'));
create index if not exists academy_enrollments_course_fk_idx on public.academy_enrollments(course_id);
create index if not exists academy_graduations_approved_by_fk_idx on public.academy_graduations(approved_by);
create index if not exists academy_invitations_accepted_by_fk_idx on public.academy_invitations(accepted_by);
create index if not exists academy_invitations_invited_by_fk_idx on public.academy_invitations(invited_by);
create index if not exists academy_lesson_progress_lesson_fk_idx on public.academy_lesson_progress(lesson_id);
create index if not exists academy_private_reflections_lesson_fk_idx on public.academy_private_reflections(lesson_id);
create index if not exists academy_reviewer_assignments_enrollment_fk_idx on public.academy_reviewer_assignments(enrollment_id);
create index if not exists academy_reviews_reviewer_fk_idx on public.academy_reviews(reviewer_user_id);
create index if not exists academy_submissions_lesson_fk_idx on public.academy_submissions(lesson_id);
commit;