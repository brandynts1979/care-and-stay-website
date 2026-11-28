-- Additive QSR-only in-place original media manifest. Install after shared media migration.
-- Original uploads are not moved, copied, renamed, published or modified by this SQL.
BEGIN;
CREATE TABLE public.academy_qsr_original_media (
 module_id uuid PRIMARY KEY,
 position integer NOT NULL CHECK(position BETWEEN 1 AND 8),
 title text NOT NULL,
 object_path text NOT NULL UNIQUE,
 expected_bytes bigint NOT NULL CHECK(expected_bytes>0),
 duration_seconds integer NOT NULL CHECK(duration_seconds BETWEEN 1 AND 3600),
 sha256 text CHECK(sha256 ~ '^[a-f0-9]{64}$'),
 bytes_verified_at timestamptz,
 reviewed_at timestamptz,
 rights_reviewed_at timestamptz,
 review_reference text,
 captioned boolean NOT NULL DEFAULT false,
 published boolean NOT NULL DEFAULT false,
 CHECK(NOT published OR (sha256 IS NOT NULL AND bytes_verified_at IS NOT NULL
 AND reviewed_at IS NOT NULL AND rights_reviewed_at IS NOT NULL AND captioned
 AND review_reference IS NOT NULL AND length(trim(review_reference))>=8))
);
ALTER TABLE public.academy_qsr_original_media ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.academy_qsr_original_media FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT ON public.academy_qsr_original_media TO service_role;
INSERT INTO public.academy_qsr_original_media(module_id,position,title,object_path,expected_bytes,duration_seconds)
VALUES
 ('90c7a7bd-6ce1-8720-b5e1-325bcf31738a'::uuid,1,'Promotion Is Not Preparation','Care & Stay QSR Leadership Academy _ Module 01 _ Promotion Is Not Preparation_1080p_caption.mp4',65000372,137),
 ('837e5de0-298c-8e5a-aee9-e53234e07f3b'::uuid,2,'Leading Yourself Before Leading Others','Care & Stay QSR Leadership Academy _ Module 02 _ Leading Yourself Before Leading Others_1080p_caption.mp4',64768928,137),
 ('52fe5b38-4200-8127-950f-58360d6fe641'::uuid,3,'The Power of a Better Question','Care & Stay QSR Leadership Academy _ Module 03 _ The Power of a Better Question_1080p_caption.mp4',115599120,146),
 ('85ac8c72-707e-8c37-b44c-6d2bd8fc1a54'::uuid,4,'Stop Solving. Start Developing.','Care & Stay QSR Leadership Academy _ Module 04 _ Stop Solving. Start Developing._1080p_caption.mp4',87665317,141),
 ('d0499d07-2c43-88c5-af6d-d658bb365648'::uuid,5,'From Conflict to Possibility','Care & Stay QSR Leadership Academy _ Module 05 _ From Conflict to Possibility_1080p_caption.mp4',63291934,147),
 ('0568aa40-8a0f-8d75-a589-75a931b35b67'::uuid,6,'Compassion and Accountability','Care & Stay QSR Leadership Academy _ Module 06 _ Compassion and Accountability_1080p_caption.mp4',113809806,155),
 ('af10d499-1d8a-8eeb-b9f7-89f3cd77b9e9'::uuid,7,'Creating a Place Where People Want to Stay','Care & Stay QSR Leadership Academy _ Module 07 _ Creating a Place Where People Want to Stay_1080p_caption.mp4',94247683,144),
 ('8f4821da-3d9a-882e-9d7d-41a6a9f6aa37'::uuid,8,'Developing Leaders, Not Followers','Care & Stay QSR Leadership Academy _ Module 08 _ Developing Leaders, Not Followers_1080p_caption.mp4',68157937,151);
-- The candidate rows intentionally exist before V2 import; they are visible only via an
-- exact matching published QSR V2 course/module and active location entitlement.
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
 UNION ALL
 SELECT e.id,e.position,o.title,o.object_path,o.duration_seconds,o.captioned
 FROM eligible e
 JOIN public.academy_qsr_original_media o ON o.module_id=e.id AND o.position=e.position
 JOIN public.academy_modules qm ON qm.id=e.id
 JOIN public.academy_courses qc ON qc.id=qm.course_id AND qc.slug='stay-culture-leadership-academy-qsr-v2'
 WHERE o.published AND o.captioned AND o.sha256 IS NOT NULL AND o.bytes_verified_at IS NOT NULL
 AND o.reviewed_at IS NOT NULL AND o.rights_reviewed_at IS NOT NULL
 AND NOT EXISTS(SELECT 1 FROM public.academy_module_media old WHERE old.module_id=e.id)
 AND NOT EXISTS(SELECT 1 FROM public.academy_shared_module_media old WHERE old.module_id=e.id)
 )
 SELECT id,title,object_path,duration_seconds,captioned FROM resolved ORDER BY position;
$$;
REVOKE ALL ON FUNCTION public.academy_module_media_for_enrollment(uuid,uuid) FROM public,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.academy_module_media_for_enrollment(uuid,uuid) TO service_role;

COMMIT;
