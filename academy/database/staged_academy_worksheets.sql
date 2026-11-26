-- Staged after exact enrollment and course entitlement migrations. No curriculum seeded.
begin;

create table public.academy_worksheet_templates (
  id uuid primary key,
  lesson_id uuid not null references public.academy_lessons(id) on delete cascade,
  template_key text not null check (template_key ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  version integer not null check (version > 0),
  title text not null check (length(trim(title)) between 1 and 180),
  prompts text[] not null check (
    array_ndims(prompts) = 1 and array_lower(prompts, 1) = 1
    and cardinality(prompts) between 1 and 30
    and array_position(prompts, null) is null
    and array_position(prompts, '') is null
    and length(array_to_string(prompts, '')) <= 18000
  ),
  published boolean not null default false,
  unique(lesson_id, template_key, version)
);

create table public.academy_worksheet_responses (
  enrollment_id uuid not null references public.academy_enrollments(id) on delete cascade,
  template_id uuid not null references public.academy_worksheet_templates(id),
  answers jsonb not null check (jsonb_typeof(answers) = 'object' and octet_length(answers::text) <= 245760),
  primary key(enrollment_id, template_id)
);

alter table public.academy_worksheet_templates enable row level security;
alter table public.academy_worksheet_responses enable row level security;
revoke all on public.academy_worksheet_templates, public.academy_worksheet_responses from public, anon, authenticated;
grant select on public.academy_worksheet_templates to authenticated;
grant select, insert, delete on public.academy_worksheet_responses to authenticated;
grant update(answers) on public.academy_worksheet_responses to authenticated;
grant all on public.academy_worksheet_templates, public.academy_worksheet_responses to service_role;

create policy "published worksheets for entitled learners" on public.academy_worksheet_templates
for select to authenticated using (
  published and exists (
    select 1 from public.academy_lessons l
    join public.academy_modules m on m.id=l.module_id
    join public.academy_learner_available_enrollments() e on e.course_id=m.course_id
    where l.id=academy_worksheet_templates.lesson_id and l.published
  )
);

create function public.academy_worksheet_access(p_enrollment uuid, p_template uuid, p_answers jsonb default null)
returns boolean language sql stable security invoker set search_path=pg_catalog,public as $$
  select exists (
    select 1 from public.academy_worksheet_templates t
    join public.academy_lessons l on l.id=t.lesson_id
    join public.academy_modules m on m.id=l.module_id
    join public.academy_learner_available_enrollments() e on e.course_id=m.course_id
    where t.id=p_template and e.id=p_enrollment
      and (p_answers is null or (
        jsonb_typeof(p_answers)='object' and not exists (
          select 1
          from jsonb_each(case when jsonb_typeof(p_answers)='object' then p_answers else '{}'::jsonb end) a
          where jsonb_typeof(a.value)<>'string' or length(a.value#>>'{}')>2000
            or not exists (
              select 1 from generate_subscripts(t.prompts,1) position where a.key=position::text
            )
        )
      ))
  );
$$;
revoke all on function public.academy_worksheet_access(uuid,uuid,jsonb) from public, anon, authenticated;
grant execute on function public.academy_worksheet_access(uuid,uuid,jsonb) to authenticated;

create policy "own worksheet read" on public.academy_worksheet_responses
for select to authenticated using (public.academy_worksheet_access(enrollment_id,template_id));
create policy "own worksheet insert" on public.academy_worksheet_responses
for insert to authenticated with check (public.academy_worksheet_access(enrollment_id,template_id,answers));
create policy "own worksheet update" on public.academy_worksheet_responses
for update to authenticated using (public.academy_worksheet_access(enrollment_id,template_id))
with check (public.academy_worksheet_access(enrollment_id,template_id,answers));
create policy "own worksheet delete" on public.academy_worksheet_responses
for delete to authenticated using (public.academy_worksheet_access(enrollment_id,template_id));

create function public.academy_save_worksheet(p_enrollment uuid, p_template uuid, p_answers jsonb)
returns void language sql security invoker set search_path=pg_catalog,public as $$
  insert into public.academy_worksheet_responses(enrollment_id,template_id,answers)
  values (p_enrollment,p_template,p_answers)
  on conflict (enrollment_id,template_id) do update set answers=excluded.answers;
$$;
revoke all on function public.academy_save_worksheet(uuid,uuid,jsonb) from public, anon, authenticated;
grant execute on function public.academy_save_worksheet(uuid,uuid,jsonb) to authenticated;

commit;
