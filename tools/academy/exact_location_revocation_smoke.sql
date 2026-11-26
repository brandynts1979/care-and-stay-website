\set ON_ERROR_STOP on
-- Disposable test: no live records. All fixture writes roll back.
BEGIN;
insert into auth.users(id) values
 ('91000000-0000-4000-8000-000000000001'),('91000000-0000-4000-8000-000000000002'),
 ('91000000-0000-4000-8000-000000000003'),('91000000-0000-4000-8000-000000000004');
insert into public.academy_courses(id,slug,title,published) values
 ('92000000-0000-4000-8000-000000000001','fictional-multi-location-ci','Fictional CI',true);
insert into public.academy_modules(id,course_id,position,title) values
 ('93000000-0000-4000-8000-000000000001','92000000-0000-4000-8000-000000000001',1,'CI module');
insert into public.academy_lessons(id,module_id,position,title,body,published) values
 ('94000000-0000-4000-8000-000000000001','93000000-0000-4000-8000-000000000001',1,'CI lesson','Fictional content',true),
 ('94000000-0000-4000-8000-000000000002','93000000-0000-4000-8000-000000000001',2,'CI lesson 2','Fictional content',true);
insert into public.academy_locations(id,name,billing_owner_id,subscription_status,current_period_end) values
 ('95000000-0000-4000-8000-000000000001','Fictional A','91000000-0000-4000-8000-000000000001','active',now()+interval '1 month'),
 ('95000000-0000-4000-8000-000000000002','Fictional B','91000000-0000-4000-8000-000000000004','active',now()+interval '1 month');
insert into public.academy_location_members(location_id,user_id,role,active) values
 ('95000000-0000-4000-8000-000000000001','91000000-0000-4000-8000-000000000001','owner',true),
 ('95000000-0000-4000-8000-000000000001','91000000-0000-4000-8000-000000000002','gm',true),
 ('95000000-0000-4000-8000-000000000001','91000000-0000-4000-8000-000000000003','manager',true),
 ('95000000-0000-4000-8000-000000000002','91000000-0000-4000-8000-000000000004','owner',true),
 ('95000000-0000-4000-8000-000000000002','91000000-0000-4000-8000-000000000003','manager',false);
insert into public.academy_enrollments(id,user_id,course_id,status,location_id) values
 ('96000000-0000-4000-8000-000000000001','91000000-0000-4000-8000-000000000003','92000000-0000-4000-8000-000000000001','active','95000000-0000-4000-8000-000000000001'),
 ('96000000-0000-4000-8000-000000000002','91000000-0000-4000-8000-000000000003','92000000-0000-4000-8000-000000000001','active','95000000-0000-4000-8000-000000000002');
insert into public.academy_private_reflections(enrollment_id,lesson_id,body) values
 ('96000000-0000-4000-8000-000000000002','94000000-0000-4000-8000-000000000002','Historical private reflection');
DO $$ BEGIN
 if has_function_privilege('anon','public.academy_deactivate_member_atomic(uuid,uuid,uuid)','EXECUTE')
    or has_function_privilege('authenticated','public.academy_deactivate_member_atomic(uuid,uuid,uuid)','EXECUTE')
    or not has_function_privilege('service_role','public.academy_deactivate_member_atomic(uuid,uuid,uuid)','EXECUTE')
 then raise exception 'Wrong revocation RPC privileges'; end if;
END $$;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000003',true);
DO $$ DECLARE changed integer; BEGIN
 if not exists(select 1 from public.academy_courses where slug='fictional-multi-location-ci') then raise exception 'Active location A lost course visibility'; end if;
 insert into public.academy_lesson_progress(enrollment_id,lesson_id) values ('96000000-0000-4000-8000-000000000001','94000000-0000-4000-8000-000000000001');
 insert into public.academy_private_reflections(enrollment_id,lesson_id,body) values ('96000000-0000-4000-8000-000000000001','94000000-0000-4000-8000-000000000001','Active A note');
 insert into public.academy_submissions(enrollment_id,lesson_id,body) values ('96000000-0000-4000-8000-000000000001','94000000-0000-4000-8000-000000000001','Active A evidence');
 begin
   insert into public.academy_lesson_progress(enrollment_id,lesson_id) values ('96000000-0000-4000-8000-000000000002','94000000-0000-4000-8000-000000000001');
   raise exception 'Stale B progress insert permitted';
 exception when insufficient_privilege then null; end;
 begin
   insert into public.academy_private_reflections(enrollment_id,lesson_id,body) values ('96000000-0000-4000-8000-000000000002','94000000-0000-4000-8000-000000000001','Forbidden B note');
   raise exception 'Stale B reflection insert permitted';
 exception when insufficient_privilege then null; end;
 begin
   insert into public.academy_submissions(enrollment_id,lesson_id,body) values ('96000000-0000-4000-8000-000000000002','94000000-0000-4000-8000-000000000001','Forbidden B evidence');
   raise exception 'Stale B submission insert permitted';
 exception when insufficient_privilege then null; end;
 update public.academy_private_reflections set body='Forbidden edit' where enrollment_id='96000000-0000-4000-8000-000000000002';
 get diagnostics changed=row_count;
 if changed<>0 then raise exception 'Stale B reflection update permitted'; end if;
 if not exists(select 1 from public.academy_private_reflections where enrollment_id='96000000-0000-4000-8000-000000000002' and body='Historical private reflection') then raise exception 'Historical own reflection no longer readable'; end if;
END $$;
RESET ROLE;
-- Restore B membership to prove A removal does not affect a different restaurant.
update public.academy_location_members set active=true where location_id='95000000-0000-4000-8000-000000000002' and user_id='91000000-0000-4000-8000-000000000003';
-- Hosted service_role is BYPASSRLS; emulate its existing behavior only in this disposable transaction.
alter role service_role bypassrls;
SET LOCAL ROLE service_role;
DO $$ BEGIN
 if public.academy_deactivate_member_atomic('91000000-0000-4000-8000-000000000002','95000000-0000-4000-8000-000000000001','91000000-0000-4000-8000-000000000001')<>'forbidden' then raise exception 'GM can remove owner'; end if;
 if public.academy_deactivate_member_atomic('91000000-0000-4000-8000-000000000003','95000000-0000-4000-8000-000000000001','91000000-0000-4000-8000-000000000002')<>'forbidden' then raise exception 'Manager can remove GM'; end if;
 if public.academy_deactivate_member_atomic('91000000-0000-4000-8000-000000000001','95000000-0000-4000-8000-000000000002','91000000-0000-4000-8000-000000000003')<>'forbidden' then raise exception 'Owner can remove outside location'; end if;
 if public.academy_deactivate_member_atomic('91000000-0000-4000-8000-000000000001','95000000-0000-4000-8000-000000000001','91000000-0000-4000-8000-000000000003')<>'deactivated' then raise exception 'Owner removal failed'; end if;
 if public.academy_deactivate_member_atomic('91000000-0000-4000-8000-000000000001','95000000-0000-4000-8000-000000000001','91000000-0000-4000-8000-000000000003')<>'deactivated' then raise exception 'Removal retry failed'; end if;
 if exists(select 1 from public.academy_location_members where location_id='95000000-0000-4000-8000-000000000001' and user_id='91000000-0000-4000-8000-000000000003' and active) then raise exception 'Membership not revoked'; end if;
 if not exists(select 1 from public.academy_enrollments where id='96000000-0000-4000-8000-000000000001' and status='revoked') then raise exception 'Enrollment not revoked'; end if;
 if not exists(select 1 from public.academy_enrollments where id='96000000-0000-4000-8000-000000000002' and status='active') then raise exception 'Other location enrollment changed'; end if;
 if not exists(select 1 from public.academy_location_members where location_id='95000000-0000-4000-8000-000000000002' and user_id='91000000-0000-4000-8000-000000000003' and active) then raise exception 'Other location membership changed'; end if;
 if (select count(*) from public.academy_audit_log where actor_id='91000000-0000-4000-8000-000000000001' and action='member_deactivated' and target='95000000-0000-4000-8000-000000000001')<>1 then raise exception 'Audit not exactly once'; end if;
END $$;
RESET ROLE;
ROLLBACK;
