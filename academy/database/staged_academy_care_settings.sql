-- Apply after staged_academy_course_entitlements.sql. Seed only reviewed curriculum mappings.
begin;

create table public.academy_care_settings (
  course_id uuid not null references public.academy_courses(id),
  setting_key text not null check (setting_key ~ '^[a-z][a-z0-9_]{0,47}$'),
  label text not null check (length(trim(label)) between 1 and 100),
  published boolean not null default false,
  primary key (course_id, setting_key)
);

create table public.academy_lesson_applications (
  course_id uuid not null,
  setting_key text not null,
  lesson_id uuid not null references public.academy_lessons(id),
  kind text not null check (kind in (
    'case_study', 'scenario', 'simulation', 'exercise', 'reflection', 'fieldwork', 'recommendation'
  )),
  body text not null check (length(trim(body)) between 1 and 12000),
  published boolean not null default false,
  primary key (course_id, setting_key, lesson_id, kind),
  foreign key (course_id, setting_key) references public.academy_care_settings(course_id, setting_key)
);

alter table public.academy_care_settings enable row level security;
alter table public.academy_lesson_applications enable row level security;
revoke all on public.academy_care_settings, public.academy_lesson_applications from public, anon, authenticated;
grant select on public.academy_care_settings, public.academy_lesson_applications to authenticated;
grant all on public.academy_care_settings, public.academy_lesson_applications to service_role;

create policy "available course settings" on public.academy_care_settings
for select to authenticated using (
  published and exists (
    select 1 from public.academy_learner_available_enrollments() e
    where e.course_id=academy_care_settings.course_id
  )
);

create policy "available lesson applications" on public.academy_lesson_applications
for select to authenticated using (
  published and exists (
    select 1
    from public.academy_care_settings s
    join public.academy_modules m on m.course_id=s.course_id
    join public.academy_lessons l on l.module_id=m.id
    where s.course_id=academy_lesson_applications.course_id
      and s.setting_key=academy_lesson_applications.setting_key
      and l.id=academy_lesson_applications.lesson_id and l.published
  )
);

create function public.academy_my_care_settings(p_enrollment uuid)
returns table(setting_key text, label text)
language sql stable security invoker set search_path=pg_catalog,public as $$
  select s.setting_key,s.label
  from public.academy_learner_available_enrollments() e
  join public.academy_care_settings s on s.course_id=e.course_id
  where e.id=p_enrollment and s.published
  order by s.label,s.setting_key;
$$;

create function public.academy_my_lesson_applications(p_enrollment uuid, p_lesson uuid, p_setting text)
returns table(kind text, body text)
language sql stable security invoker set search_path=pg_catalog,public as $$
  select a.kind,a.body
  from public.academy_learner_available_enrollments() e
  join public.academy_lesson_applications a on a.course_id=e.course_id
  where e.id=p_enrollment and a.lesson_id=p_lesson and a.setting_key=p_setting
  order by a.kind;
$$;

revoke all on function public.academy_my_care_settings(uuid),
  public.academy_my_lesson_applications(uuid,uuid,text) from public, anon, authenticated;
grant execute on function public.academy_my_care_settings(uuid),
  public.academy_my_lesson_applications(uuid,uuid,text) to authenticated;

commit;
