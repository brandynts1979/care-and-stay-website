\set ON_ERROR_STOP on
BEGIN;
-- Test-only data. No Storage objects, real learner identities or review claims.
INSERT INTO auth.users(id) VALUES ('e1000000-0000-4000-8000-000000000001'),('e1000000-0000-4000-8000-000000000002');
INSERT INTO public.academy_courses(id,slug,title,published) VALUES ('e2000000-0000-4000-8000-000000000001','stay-culture-leadership-academy-qsr-v2','Synthetic QSR',true);
INSERT INTO public.academy_modules(id,course_id,position,title) SELECT module_id,'e2000000-0000-4000-8000-000000000001',position,title FROM public.academy_qsr_original_media;
INSERT INTO public.academy_lessons(module_id,position,title,body,published) SELECT module_id,1,'Synthetic lesson','Synthetic reading',true FROM public.academy_qsr_original_media;
INSERT INTO public.academy_locations(id,name,billing_owner_id,subscription_status,current_period_end) VALUES
 ('e4000000-0000-4000-8000-000000000001','Synthetic A','e1000000-0000-4000-8000-000000000001','active',now()+interval '30 days'),
 ('e4000000-0000-4000-8000-000000000002','Synthetic B','e1000000-0000-4000-8000-000000000001','active',now()+interval '30 days');
INSERT INTO public.academy_location_members(location_id,user_id,role,active) VALUES
 ('e4000000-0000-4000-8000-000000000001','e1000000-0000-4000-8000-000000000001','owner',true),
 ('e4000000-0000-4000-8000-000000000002','e1000000-0000-4000-8000-000000000001','owner',true);
INSERT INTO public.academy_location_course_entitlements(location_id,course_id,active,source) VALUES
 ('e4000000-0000-4000-8000-000000000001','e2000000-0000-4000-8000-000000000001',true,'internal_demo');
INSERT INTO public.academy_enrollments(id,user_id,course_id,location_id,status) VALUES
 ('e5000000-0000-4000-8000-000000000001','e1000000-0000-4000-8000-000000000001','e2000000-0000-4000-8000-000000000001','e4000000-0000-4000-8000-000000000001','active'),
 ('e5000000-0000-4000-8000-000000000002','e1000000-0000-4000-8000-000000000001','e2000000-0000-4000-8000-000000000001','e4000000-0000-4000-8000-000000000002','active');
DO $$ BEGIN
 IF (SELECT count(*) FROM public.academy_qsr_original_media)<>8 OR EXISTS(SELECT 1 FROM public.academy_qsr_original_media WHERE published OR sha256 IS NOT NULL) THEN RAISE EXCEPTION 'Original candidates must start unpublished and unverified'; END IF;
 IF has_table_privilege('anon','public.academy_qsr_original_media','SELECT') OR has_table_privilege('authenticated','public.academy_qsr_original_media','SELECT') OR has_table_privilege('service_role','public.academy_qsr_original_media','UPDATE') THEN RAISE EXCEPTION 'Original manifest access unsafe'; END IF;
 BEGIN
 UPDATE public.academy_qsr_original_media SET published=true;
 RAISE EXCEPTION 'Unreviewed original media allowed';
 EXCEPTION WHEN check_violation THEN NULL;
 END;
END $$;
ALTER ROLE service_role BYPASSRLS;
SET LOCAL ROLE service_role;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM public.academy_module_media_for_enrollment('e1000000-0000-4000-8000-000000000001','e5000000-0000-4000-8000-000000000001')) THEN RAISE EXCEPTION 'Unverified original visible'; END IF;
END $$;
RESET ROLE;
-- Fictional review evidence exists only in this disposable transaction.
UPDATE public.academy_qsr_original_media SET sha256=repeat('a',64),bytes_verified_at=now(),reviewed_at=now(),rights_reviewed_at=now(),review_reference='Synthetic fixture only',captioned=true,published=true WHERE position=1;
SET LOCAL ROLE service_role;
DO $$ DECLARE learner uuid='e1000000-0000-4000-8000-000000000001'; enrollment uuid='e5000000-0000-4000-8000-000000000001'; BEGIN
 IF (SELECT count(*) FROM public.academy_module_media_for_enrollment(learner,enrollment))<>1 THEN RAISE EXCEPTION 'Reviewed original missing or other originals exposed'; END IF;
 IF EXISTS(SELECT 1 FROM public.academy_module_media_for_enrollment('e1000000-0000-4000-8000-000000000002',enrollment)) THEN RAISE EXCEPTION 'Other user obtained original'; END IF;
 IF EXISTS(SELECT 1 FROM public.academy_module_media_for_enrollment(learner,'e5000000-0000-4000-8000-000000000002')) THEN RAISE EXCEPTION 'Other location obtained original'; END IF;
 UPDATE public.academy_location_course_entitlements SET active=false WHERE location_id='e4000000-0000-4000-8000-000000000001';
 IF EXISTS(SELECT 1 FROM public.academy_module_media_for_enrollment(learner,enrollment)) THEN RAISE EXCEPTION 'Revoked location grant obtained original'; END IF;
END $$;
RESET ROLE;
ROLLBACK;
