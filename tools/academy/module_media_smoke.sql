\set ON_ERROR_STOP on
BEGIN;
insert into auth.users(id) values
 ('d1000000-0000-4000-8000-000000000001'),('d1000000-0000-4000-8000-000000000002'),('d1000000-0000-4000-8000-000000000003');
insert into public.academy_courses(id,slug,title,published) values
 ('d2000000-0000-4000-8000-000000000001','ci-video-v2','Fictional V2',true),
 ('d2000000-0000-4000-8000-000000000002','ci-video-unpublished','Unpublished',false);
insert into public.academy_modules(id,course_id,position,title) values
 ('d3000000-0000-4000-8000-000000000001','d2000000-0000-4000-8000-000000000001',1,'Reviewed media'),
 ('d3000000-0000-4000-8000-000000000002','d2000000-0000-4000-8000-000000000001',2,'Unreviewed media'),
 ('d3000000-0000-4000-8000-000000000003','d2000000-0000-4000-8000-000000000002',1,'Unpublished course'),
 ('d3000000-0000-4000-8000-000000000004','d2000000-0000-4000-8000-000000000002',2,'Shared media in second course'),
 ('d3000000-0000-4000-8000-000000000005','d2000000-0000-4000-8000-000000000001',3,'Shared media in first course');
insert into public.academy_lessons(module_id,position,title,body,published)
 select id,1,'Synthetic lesson','Synthetic reading',true from public.academy_modules where id::text like 'd3000000-%';
insert into public.academy_locations(id,name,billing_owner_id,subscription_status,current_period_end) values
 ('d4000000-0000-4000-8000-000000000001','Location A','d1000000-0000-4000-8000-000000000001','active',now()+interval '30 days'),
 ('d4000000-0000-4000-8000-000000000002','Location B','d1000000-0000-4000-8000-000000000001','active',now()+interval '30 days');
insert into public.academy_location_members(location_id,user_id,role,active) values
 ('d4000000-0000-4000-8000-000000000001','d1000000-0000-4000-8000-000000000001','owner',true),
 ('d4000000-0000-4000-8000-000000000001','d1000000-0000-4000-8000-000000000002','manager',true),
 ('d4000000-0000-4000-8000-000000000002','d1000000-0000-4000-8000-000000000001','owner',true),
 ('d4000000-0000-4000-8000-000000000002','d1000000-0000-4000-8000-000000000002','manager',true);
insert into public.academy_location_course_entitlements(location_id,course_id,active,source) values
 ('d4000000-0000-4000-8000-000000000001','d2000000-0000-4000-8000-000000000001',true,'internal_demo'),
 ('d4000000-0000-4000-8000-000000000001','d2000000-0000-4000-8000-000000000002',true,'internal_demo');
insert into public.academy_enrollments(id,user_id,course_id,location_id,status) values
 ('d5000000-0000-4000-8000-000000000001','d1000000-0000-4000-8000-000000000002','d2000000-0000-4000-8000-000000000001','d4000000-0000-4000-8000-000000000001','active'),
 ('d5000000-0000-4000-8000-000000000002','d1000000-0000-4000-8000-000000000002','d2000000-0000-4000-8000-000000000001','d4000000-0000-4000-8000-000000000002','active'),
 ('d5000000-0000-4000-8000-000000000003','d1000000-0000-4000-8000-000000000002','d2000000-0000-4000-8000-000000000002','d4000000-0000-4000-8000-000000000001','active');
insert into public.academy_module_media(module_id,title,object_path,duration_seconds,captioned,published,reviewed_at,sha256) values
 ('d3000000-0000-4000-8000-000000000001','Reviewed','d3000000-0000-4000-8000-000000000001/'||repeat('a',64)||'.mp4',140,true,true,now(),repeat('a',64)),
 ('d3000000-0000-4000-8000-000000000002','Not reviewed','d3000000-0000-4000-8000-000000000002/'||repeat('b',64)||'.mp4',140,true,false,null,repeat('b',64)),
 ('d3000000-0000-4000-8000-000000000003','Unpublished course','d3000000-0000-4000-8000-000000000003/'||repeat('c',64)||'.mp4',140,true,true,now(),repeat('c',64));
DO $$ BEGIN
 if has_table_privilege('anon','public.academy_module_media','SELECT') or has_table_privilege('authenticated','public.academy_module_media','SELECT')
 or has_function_privilege('authenticated','public.academy_module_media_for_enrollment(uuid,uuid)','EXECUTE')
 or has_function_privilege('anon','public.academy_module_media_for_enrollment(uuid,uuid)','EXECUTE')
 then raise exception 'Media manifest exposed'; end if;
 BEGIN
 update public.academy_module_media set published=true where module_id='d3000000-0000-4000-8000-000000000002';
 raise exception 'Unreviewed media allowed';
 EXCEPTION WHEN check_violation THEN NULL;
 END;
 BEGIN
 update public.academy_module_media set object_path='https://example.invalid/video.mp4' where module_id='d3000000-0000-4000-8000-000000000001';
 raise exception 'External playback path allowed';
 EXCEPTION WHEN check_violation THEN NULL;
 END;
END $$;
alter role service_role bypassrls;
SET LOCAL ROLE service_role;
DO $$ DECLARE learner uuid='d1000000-0000-4000-8000-000000000002'; ea uuid='d5000000-0000-4000-8000-000000000001'; eb uuid='d5000000-0000-4000-8000-000000000002'; BEGIN
 if (select count(*) from public.academy_module_media_for_enrollment(learner,ea))<>1 then raise exception 'Reviewed entitled module missing or unreviewed exposed'; end if;
 if exists(select 1 from public.academy_module_media_for_enrollment('d1000000-0000-4000-8000-000000000003',ea)) then raise exception 'Other user accessed media'; end if;
 if exists(select 1 from public.academy_module_media_for_enrollment(learner,eb)) then raise exception 'Other location borrowed entitlement'; end if;
 if exists(select 1 from public.academy_module_media_for_enrollment(learner,'d5000000-0000-4000-8000-000000000003')) then raise exception 'Unpublished course media exposed'; end if;
 update public.academy_location_course_entitlements set expires_at=now()-interval '1 minute' where location_id='d4000000-0000-4000-8000-000000000001';
 if exists(select 1 from public.academy_module_media_for_enrollment(learner,ea)) then raise exception 'Expired grant allowed'; end if;
 update public.academy_location_course_entitlements set expires_at=null where location_id='d4000000-0000-4000-8000-000000000001';
 update public.academy_locations set subscription_status='canceled' where id='d4000000-0000-4000-8000-000000000001';
 if exists(select 1 from public.academy_module_media_for_enrollment(learner,ea)) then raise exception 'Canceled location allowed'; end if;
 update public.academy_locations set subscription_status='active' where id='d4000000-0000-4000-8000-000000000001';
 update public.academy_location_members set active=false where location_id='d4000000-0000-4000-8000-000000000001' and user_id=learner;
 if exists(select 1 from public.academy_module_media_for_enrollment(learner,ea)) then raise exception 'Removed learner allowed'; end if;
END $$;
RESET ROLE;
-- Exercise the same asset through two courses against the real Academy schema.
update public.academy_location_members set active=true
 where location_id='d4000000-0000-4000-8000-000000000001';
update public.academy_courses set published=true
 where id='d2000000-0000-4000-8000-000000000002';
update public.academy_module_media set published=false
 where module_id='d3000000-0000-4000-8000-000000000003';
insert into public.academy_shared_media_assets
 (asset_key,title,sha256,object_path,duration_seconds,captioned,reviewed_at,rights_reviewed_at,published)
 values ('foundation-v1-m01','Shared Foundation',repeat('d',64),
  'shared/foundation-v1-m01/'||repeat('d',64)||'.mp4',150,true,now(),now(),true);
insert into public.academy_shared_module_media(module_id,asset_key,published)
 values
 ('d3000000-0000-4000-8000-000000000001','foundation-v1-m01',true),
 ('d3000000-0000-4000-8000-000000000002','foundation-v1-m01',true),
 ('d3000000-0000-4000-8000-000000000004','foundation-v1-m01',true),
 ('d3000000-0000-4000-8000-000000000005','foundation-v1-m01',false);
DO $$ BEGIN
 if has_table_privilege('anon','public.academy_shared_media_assets','SELECT')
 or has_table_privilege('authenticated','public.academy_shared_module_media','SELECT')
 then raise exception 'Shared manifest exposed'; end if;
 BEGIN
 update public.academy_shared_media_assets set rights_reviewed_at=null;
 raise exception 'Unreviewed shared asset allowed';
 EXCEPTION WHEN check_violation THEN NULL;
 END;
END $$;
SET LOCAL ROLE service_role;
DO $$
DECLARE
 learner uuid='d1000000-0000-4000-8000-000000000002';
 main_enrollment uuid='d5000000-0000-4000-8000-000000000001';
 other_enrollment uuid='d5000000-0000-4000-8000-000000000003';
 shared_path text='shared/foundation-v1-m01/'||repeat('d',64)||'.mp4';
BEGIN
 if (select array_agg(object_path) from public.academy_module_media_for_enrollment(learner,main_enrollment))
    is distinct from ARRAY['d3000000-0000-4000-8000-000000000001/'||repeat('a',64)||'.mp4']
 then raise exception 'Shared mapping overrode reviewed or withheld module-specific media'; end if;
 if (select array_agg(object_path) from public.academy_module_media_for_enrollment(learner,other_enrollment))
    is distinct from ARRAY[shared_path]
 then raise exception 'Shared asset missing for entitled course'; end if;
 update public.academy_shared_module_media set published=true
  where module_id='d3000000-0000-4000-8000-000000000005';
 if not exists(select 1 from public.academy_module_media_for_enrollment(learner,main_enrollment) where object_path=shared_path)
 then raise exception 'Shared asset cannot serve two courses'; end if;
 if exists(select 1 from public.academy_module_media_for_enrollment(learner,'d5000000-0000-4000-8000-000000000002'))
 then raise exception 'Shared asset crossed exact location entitlement'; end if;
 update public.academy_shared_module_media set published=false
  where module_id='d3000000-0000-4000-8000-000000000004';
 if exists(select 1 from public.academy_module_media_for_enrollment(learner,other_enrollment))
 then raise exception 'Unpublished shared mapping exposed'; end if;
END $$;
RESET ROLE;
ROLLBACK;
