-- Isolated Academy targets only. The database operator supplies a fresh UUID
-- via psql -v academy_target_uuid=... after verifying the target connection.
\set ON_ERROR_STOP on
begin;
create schema if not exists academy_internal;
revoke all on schema academy_internal from public, anon, authenticated;
create table academy_internal.curriculum_staging_target (
  singleton boolean primary key default true check (singleton),
  target_id uuid not null
);
insert into academy_internal.curriculum_staging_target(target_id)
values (:'academy_target_uuid'::uuid);

create table academy_internal.curriculum_import_receipts (
  course_id uuid primary key references public.academy_courses(id),
  source_commit text not null check (source_commit ~ '^[a-f0-9]{40}$'),
  content_sha256 text not null check (content_sha256 ~ '^[a-f0-9]{64}$'),
  imported_at timestamptz not null default now()
);
alter table academy_internal.curriculum_staging_target enable row level security;
alter table academy_internal.curriculum_import_receipts enable row level security;
revoke all on academy_internal.curriculum_staging_target, academy_internal.curriculum_import_receipts
from public, anon, authenticated;
commit;
