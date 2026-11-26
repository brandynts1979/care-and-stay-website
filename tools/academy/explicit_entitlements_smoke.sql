\set ON_ERROR_STOP on
BEGIN;
-- Synthetic fixture, rolled back. Existing legacy slug is the sole automatic grant.
insert into auth.users(id) values ('97000000-0000-4000-8000-000000000001'),('97000000-0000-4000-8000-000000000002');
insert into public.academy_courses(id,slug,title,published) values
 ('98000000-0000-4000-8000-000000000001','stay-culture-leadership-academy','Legacy CI',true)
 on conflict(slug) do update set published=true;
insert into public.academy_courses(id,slug,title,published) values
 ('98000000-0000-4000-8000-000000000002','fictional-v2-course-ci','New version CI',true),
 ('98000000-0000-4000-8000-000000000003','fictional-unpublished-ci','Unpublished CI',false);
insert into public.academy_modules(id,course_id,position,title) values
 ('98100000-0000-4000-8000-000000000002','98000000-0000-4000-8000-000000000002',1,'V2 module');
insert into public.academy_lessons(id,module_id,position,title,body,published) values
 ('98200000-0000-4000-8000-000000000002','98100000-0000-4000-8000-000000000002',1,'V2 lesson','Fictional',true);
insert into public.academy_locations(id,name,billing_owner_id,subscription_status,current_period_end) values
 ('98300000-0000-4000-8000-000000000001','Fictional A','97000000-0000-4000-8000-000000000001','active',now()+interval '1 month'),
 ('98300000-0000-4000-8000-000000000002','Fictional B','97000000-0000-4000-8000-000000000001','active',now()+interval '1 month');
insert into public.academy_location_members(location_id,user_id,role,active) values
 ('98300000-0000-4000-8000-000000000001','97000000-0000-4000-8000-000000000001','owner',true),
 ('98300000-0000-4000-8000-000000000002','97000000-0000-4000-8000-000000000001','owner',true);
insert into public.academy_location_course_entitlements(location_id,course_id,active,source) values
 ('98300000-0000-4000-8000-000000000001','98000000-0000-4000-8000-000000000002',true,'internal_demo'),
 ('98300000-0000-4000-8000-000000000001','98000000-0000-4000-8000-000000000003',true,'internal_demo');
insert into public.academy_enrollments(id,user_id,course_id,status,location_id) values
 ('98400000-0000-4000-8000-000000000001','97000000-0000-4000-8000-000000000001','98000000-0000-4000-8000-000000000002','active','98300000-0000-4000-8000-000000000001'),
 ('98400000-0000-4000-8000-000000000002','97000000-0000-4000-8000-000000000001','98000000-0000-4000-8000-000000000002','active','98300000-0000-4000-8000-000000000002'),
 ('98400000-0000-4000-8000-000000000003','97000000-0000-4000-8000-000000000001','98000000-0000-4000-8000-000000000003','active','98300000-0000-4000-8000-000000000001');
insert into public.academy_worksheet_templates(id,lesson_id,template_key,version,title,prompts,published)
 values
 ('98500000-0000-4000-8000-000000000001','98200000-0000-4000-8000-000000000002','ci-practice',1,'Fictional practice',ARRAY['What would you try?'],true),
 ('98500000-0000-4000-8000-000000000002','98200000-0000-4000-8000-000000000002','ci-practice',2,'Unreleased practice',ARRAY['What would you try?'],false);
insert into public.academy_location_members(location_id,user_id,role,active)
 values ('98300000-0000-4000-8000-000000000001','97000000-0000-4000-8000-000000000002','gm',true);
insert into public.academy_reviewer_assignments(reviewer_user_id,enrollment_id)
 values ('97000000-0000-4000-8000-000000000002','98400000-0000-4000-8000-000000000001');
DO $$ BEGIN
 if has_function_privilege('anon','public.academy_learner_available_enrollments()','EXECUTE') or not has_function_privilege('authenticated','public.academy_learner_available_enrollments()','EXECUTE') then raise exception 'Learner RPC privileges incorrect'; end if;
 if has_function_privilege('authenticated','public.academy_entitled_course_ids(uuid)','EXECUTE') or has_function_privilege('anon','public.academy_entitled_course_ids(uuid)','EXECUTE') then raise exception 'Provisioning RPC exposed'; end if;
 if has_table_privilege('authenticated','public.academy_location_course_entitlements','INSERT') or has_table_privilege('authenticated','public.academy_location_course_entitlements','UPDATE') or has_table_privilege('anon','public.academy_location_course_entitlements','SELECT') then raise exception 'Grant administration exposed'; end if;
END $$;
alter role service_role bypassrls;
SET LOCAL ROLE service_role;
DO $$ BEGIN
 if (select count(*) from public.academy_entitled_course_ids('98300000-0000-4000-8000-000000000001'))<>2 then raise exception 'Explicit A grant or legacy missing'; end if;
 if (select count(*) from public.academy_entitled_course_ids('98300000-0000-4000-8000-000000000002'))<>1 then raise exception 'Unrelated new course auto-granted to B'; end if;
 if exists(select 1 from public.academy_entitled_course_ids('98300000-0000-4000-8000-000000000001') where course_id='98000000-0000-4000-8000-000000000003') then raise exception 'Unpublished course provisioned'; end if;
END $$;
RESET ROLE;
SET LOCAL ROLE authenticated;
select set_config('request.jwt.claim.sub','97000000-0000-4000-8000-000000000001',true);
DO $$ BEGIN
 if (select count(*) from public.academy_learner_available_enrollments())<>1 or not exists(select 1 from public.academy_learner_available_enrollments() where id='98400000-0000-4000-8000-000000000001' and location_name='Fictional A') then raise exception 'Learner selector includes stale or hidden course'; end if;
 if not exists(select 1 from public.academy_courses where slug='fictional-v2-course-ci') then raise exception 'Explicit A enrollment hidden'; end if;
 if exists(select 1 from public.academy_courses where slug='fictional-unpublished-ci') then raise exception 'Unpublished course exposed'; end if;
 insert into public.academy_lesson_progress(enrollment_id,lesson_id) values('98400000-0000-4000-8000-000000000001','98200000-0000-4000-8000-000000000002');
 begin
  insert into public.academy_lesson_progress(enrollment_id,lesson_id) values('98400000-0000-4000-8000-000000000002','98200000-0000-4000-8000-000000000002');
  raise exception 'B can use A entitlement';
 exception when insufficient_privilege then null; end;
 begin
  insert into public.academy_private_reflections(enrollment_id,lesson_id,body) values('98400000-0000-4000-8000-000000000002','98200000-0000-4000-8000-000000000002','Forbidden');
  raise exception 'B reflection bypass';
 exception when insufficient_privilege then null; end;
 begin
  insert into public.academy_submissions(enrollment_id,lesson_id,body) values('98400000-0000-4000-8000-000000000002','98200000-0000-4000-8000-000000000002','Forbidden');
  raise exception 'B submission bypass';
 exception when insufficient_privilege then null; end;
END $$;
DO $$
DECLARE
  eligible uuid='98400000-0000-4000-8000-000000000001';
  other_location uuid='98400000-0000-4000-8000-000000000002';
  worksheet uuid='98500000-0000-4000-8000-000000000001';
BEGIN
  if (select count(*) from public.academy_worksheet_templates)<>1 then
    raise exception 'Unpublished worksheet exposed or active worksheet hidden';
  end if;
  perform public.academy_save_worksheet(eligible,worksheet,'{"1":"first draft"}');
  perform public.academy_save_worksheet(eligible,worksheet,'{"1":"updated draft"}');
  if (select answers->>'1' from public.academy_worksheet_responses where enrollment_id=eligible)
     is distinct from 'updated draft' then raise exception 'Worksheet draft update failed'; end if;
  begin
    perform public.academy_save_worksheet(other_location,worksheet,'{"1":"wrong location"}');
    raise exception 'Worksheet cross-location write allowed';
  exception when insufficient_privilege then null; end;
  begin
    perform public.academy_save_worksheet(eligible,worksheet,'{"2":"unknown prompt"}');
    raise exception 'Worksheet accepted unknown answer key';
  exception when insufficient_privilege then null; end;
  begin
    perform public.academy_save_worksheet(eligible,worksheet,'{"1":{"nested":true}}');
    raise exception 'Worksheet accepted a non-text answer';
  exception when insufficient_privilege then null; end;
END $$;
select set_config('request.jwt.claim.sub','97000000-0000-4000-8000-000000000002',true);
DO $$ BEGIN
 if exists(select 1 from public.academy_worksheet_responses) then
   raise exception 'GM or assigned reviewer accessed a private worksheet';
 end if;
END $$;
select set_config('request.jwt.claim.sub','97000000-0000-4000-8000-000000000001',true);
RESET ROLE;
update public.academy_location_course_entitlements set expires_at=now()-interval '1 minute' where location_id='98300000-0000-4000-8000-000000000001' and course_id='98000000-0000-4000-8000-000000000002';
SET LOCAL ROLE service_role;
DO $$ BEGIN
 if (select count(*) from public.academy_entitled_course_ids('98300000-0000-4000-8000-000000000001'))<>1 then raise exception 'Expired entitlement provisioned'; end if;
END $$;
RESET ROLE;
SET LOCAL ROLE authenticated;
DO $$ BEGIN
 if exists(select 1 from public.academy_learner_available_enrollments()) then raise exception 'Expired course remains selectable'; end if;
 if exists(select 1 from public.academy_worksheet_responses) then raise exception 'Expired grant exposed private worksheet'; end if;
 if exists(select 1 from public.academy_courses where slug='fictional-v2-course-ci') then raise exception 'Expired V2 grant still exposes course'; end if;
 if not exists(select 1 from public.academy_lesson_progress where enrollment_id='98400000-0000-4000-8000-000000000001') then raise exception 'Historical progress lost'; end if;
END $$;
RESET ROLE;
update public.academy_locations set subscription_status='canceled' where id='98300000-0000-4000-8000-000000000001';
SET LOCAL ROLE service_role;
DO $$ BEGIN
 if exists(select 1 from public.academy_entitled_course_ids('98300000-0000-4000-8000-000000000001')) then raise exception 'Canceled location still provisioned'; end if;
END $$;
RESET ROLE;
ROLLBACK;
