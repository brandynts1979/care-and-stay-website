-- STAGED candidate after course entitlement and transactional provisioning migrations.
-- Upload actual bytes via the Storage API to a PRIVATE academy-module-media bucket.
-- No Storage object rows are fabricated here; manifest starts empty and unpublished.
BEGIN;
create table public.academy_module_media (
 module_id uuid primary key references public.academy_modules(id) on delete cascade,
 title text not null check(length(trim(title)) between 1 and 180),
 object_path text not null unique,
 duration_seconds integer not null check(duration_seconds between 1 and 3600),
 captioned boolean not null default false,
 published boolean not null default false,
 reviewed_at timestamptz,
 sha256 text not null check(sha256 ~ '^[a-f0-9]{64}$'),
 check(object_path = module_id::text || '/' || sha256 || '.mp4'),
 check(not published or (reviewed_at is not null and captioned))
);
alter table public.academy_module_media enable row level security;
revoke all on public.academy_module_media from public,anon,authenticated;
grant all on public.academy_module_media to service_role;
-- Exact enrollment, not merely access to a course via another location. The Edge
-- handler derives p_user from verified auth; the browser cannot execute this RPC.
create function public.academy_module_media_for_enrollment(p_user uuid,p_enrollment uuid)
returns table(module_id uuid,title text,object_path text,duration_seconds integer,captioned boolean)
language sql stable security invoker set search_path=pg_catalog,public as $$
 select media.module_id,media.title,media.object_path,media.duration_seconds,media.captioned
 from public.academy_enrollments e
 join public.academy_locations loc on loc.id=e.location_id
 join public.academy_location_members mem on mem.location_id=e.location_id and mem.user_id=e.user_id
 join public.academy_courses c on c.id=e.course_id
 join public.academy_modules m on m.course_id=c.id
 join public.academy_module_media media on media.module_id=m.id
 where e.id=p_enrollment and e.user_id=p_user
 and e.status in ('active','completed') and (e.expires_at is null or e.expires_at>now())
 and mem.active and loc.subscription_status in ('active','trialing')
 and (loc.current_period_end is null or loc.current_period_end>now())
 and c.published and media.published and media.reviewed_at is not null and media.captioned
 and exists(select 1 from public.academy_lessons l where l.module_id=m.id and l.published)
 and exists(select 1 from public.academy_entitled_course_ids(e.location_id) entitled where entitled.course_id=c.id)
 order by m.position;
$$;
revoke all on function public.academy_module_media_for_enrollment(uuid,uuid) from public,anon,authenticated;
grant execute on function public.academy_module_media_for_enrollment(uuid,uuid) to service_role;
COMMIT;
