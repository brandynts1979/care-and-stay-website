-- Staged integration of private curriculum PR #11 shared media candidate.
-- Apply after staged_academy_module_media.sql. Starts with no assets or mappings.
BEGIN;
CREATE TABLE public.academy_shared_media_assets (
 asset_key text PRIMARY KEY CHECK(asset_key ~ '^foundation-v[1-9][0-9]*-m0[1-8]$'),
 title text NOT NULL CHECK(length(trim(title)) BETWEEN 1 AND 180),
 sha256 text NOT NULL CHECK(sha256 ~ '^[a-f0-9]{64}$'),
 object_path text NOT NULL UNIQUE CHECK(object_path='shared/'||asset_key||'/'||sha256||'.mp4'),
 duration_seconds integer NOT NULL CHECK(duration_seconds BETWEEN 1 AND 3600),
 captioned boolean NOT NULL DEFAULT false,
 reviewed_at timestamptz,
 rights_reviewed_at timestamptz,
 published boolean NOT NULL DEFAULT false,
 CHECK(NOT published OR (captioned AND reviewed_at IS NOT NULL AND rights_reviewed_at IS NOT NULL))
);
CREATE TABLE public.academy_shared_module_media (
 module_id uuid PRIMARY KEY REFERENCES public.academy_modules(id) ON DELETE CASCADE,
 asset_key text NOT NULL REFERENCES public.academy_shared_media_assets(asset_key) ON DELETE RESTRICT,
 published boolean NOT NULL DEFAULT false
);
ALTER TABLE public.academy_shared_media_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academy_shared_module_media ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.academy_shared_media_assets,public.academy_shared_module_media FROM public,anon,authenticated;
GRANT ALL ON public.academy_shared_media_assets,public.academy_shared_module_media TO service_role;
-- Preserve existing return signature. Legacy module-specific row takes precedence even
-- when not published: no implicit fallback after a deliberate unpublish.
CREATE OR REPLACE FUNCTION public.academy_module_media_for_enrollment(p_user uuid,p_enrollment uuid)
RETURNS TABLE(module_id uuid,title text,object_path text,duration_seconds integer,captioned boolean)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path=pg_catalog,public AS $$
 WITH eligible AS (
 SELECT m.id,m.position
 FROM public.academy_enrollments e
 JOIN public.academy_locations loc ON loc.id=e.location_id
 JOIN public.academy_location_members mem ON mem.location_id=e.location_id AND mem.user_id=e.user_id
 JOIN public.academy_courses c ON c.id=e.course_id
 JOIN public.academy_modules m ON m.course_id=c.id
 WHERE e.id=p_enrollment AND e.user_id=p_user
 AND e.status IN ('active','completed') AND (e.expires_at IS NULL OR e.expires_at>now())
 AND mem.active AND loc.subscription_status IN ('active','trialing')
 AND (loc.current_period_end IS NULL OR loc.current_period_end>now())
 AND c.published
 AND EXISTS(SELECT 1 FROM public.academy_lessons l WHERE l.module_id=m.id AND l.published)
 AND EXISTS(SELECT 1 FROM public.academy_entitled_course_ids(e.location_id) entitled WHERE entitled.course_id=c.id)
 ), resolved AS (
 SELECT e.id,e.position,m.title,m.object_path,m.duration_seconds,m.captioned
 FROM eligible e JOIN public.academy_module_media m ON m.module_id=e.id
 WHERE m.published AND m.reviewed_at IS NOT NULL AND m.captioned
 UNION ALL
 SELECT e.id,e.position,a.title,a.object_path,a.duration_seconds,a.captioned
 FROM eligible e JOIN public.academy_shared_module_media m ON m.module_id=e.id
 JOIN public.academy_shared_media_assets a ON a.asset_key=m.asset_key
 WHERE m.published AND a.published AND a.captioned
 AND a.reviewed_at IS NOT NULL AND a.rights_reviewed_at IS NOT NULL
 AND NOT EXISTS(SELECT 1 FROM public.academy_module_media old WHERE old.module_id=e.id)
 )
 SELECT id,title,object_path,duration_seconds,captioned FROM resolved ORDER BY position;
$$;
REVOKE ALL ON FUNCTION public.academy_module_media_for_enrollment(uuid,uuid) FROM public,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.academy_module_media_for_enrollment(uuid,uuid) TO service_role;
COMMIT;
