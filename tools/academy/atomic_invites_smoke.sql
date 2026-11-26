\set ON_ERROR_STOP on
BEGIN;
-- Independent synthetic fixture; never run against hosted customer data.
insert into auth.users(id) values
 ('a1000000-0000-4000-8000-000000000001'),('a1000000-0000-4000-8000-000000000002'),
 ('a1000000-0000-4000-8000-000000000003'),('a1000000-0000-4000-8000-000000000004');
insert into public.academy_courses(id,slug,title,published) values
 ('a2000000-0000-4000-8000-000000000001','stay-culture-leadership-academy','Legacy CI',true)
 on conflict(slug) do update set published=true;
insert into public.academy_locations(id,name,billing_owner_id,subscription_status,current_period_end) values
 ('a3000000-0000-4000-8000-000000000001','Fictional A','a1000000-0000-4000-8000-000000000001','active',now()+interval '1 month'),
 ('a3000000-0000-4000-8000-000000000002','Fictional B','a1000000-0000-4000-8000-000000000001','active',now()-interval '1 minute');
insert into public.academy_location_members(location_id,user_id,role,active) values
 ('a3000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000001','owner',true),
 ('a3000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000002','gm',true),
 ('a3000000-0000-4000-8000-000000000002','a1000000-0000-4000-8000-000000000001','owner',true);
insert into public.academy_invitations(id,location_id,invited_email,intended_role,invited_by,token_digest,expires_at) values
 ('a4000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000001','learner@example.invalid','manager','a1000000-0000-4000-8000-000000000001','ci-atomic-1',now()+interval '1 day'),
 ('a4000000-0000-4000-8000-000000000002','a3000000-0000-4000-8000-000000000001','other@example.invalid','gm','a1000000-0000-4000-8000-000000000002','ci-atomic-2',now()+interval '1 day'),
 ('a4000000-0000-4000-8000-000000000003','a3000000-0000-4000-8000-000000000002','other@example.invalid','manager','a1000000-0000-4000-8000-000000000001','ci-atomic-3',now()+interval '1 day');
DO $$ BEGIN
 if has_function_privilege('anon','public.academy_accept_invitation_atomic(uuid,uuid,text)','EXECUTE')
 or has_function_privilege('authenticated','public.academy_accept_invitation_atomic(uuid,uuid,text)','EXECUTE')
 or has_function_privilege('authenticated','public.academy_grant_member_atomic(uuid,uuid)','EXECUTE')
 then raise exception 'Privileged invitation RPC exposed'; end if;
END $$;
alter role service_role bypassrls;
SET LOCAL ROLE service_role;
DO $$ DECLARE result jsonb; original_id uuid; BEGIN
 result=public.academy_accept_invitation_atomic('a4000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000004','wrong@example.invalid');
 if result->>'result'<>'invalid' then raise exception 'Wrong email accepted'; end if;
 if public.academy_accept_invitation_atomic('a4000000-0000-4000-8000-000000000002','a1000000-0000-4000-8000-000000000004','other@example.invalid')->>'result'<>'forbidden' then raise exception 'GM elevated another GM'; end if;
 if public.academy_accept_invitation_atomic('a4000000-0000-4000-8000-000000000003','a1000000-0000-4000-8000-000000000004','other@example.invalid')->>'result'<>'inactive' then raise exception 'Expired paid period accepted'; end if;
 if public.academy_accept_invitation_atomic('a4000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000003','LEARNER@example.invalid')->>'result'<>'joined' then raise exception 'Valid invitation failed'; end if;
 select id into strict original_id from public.academy_enrollments where location_id='a3000000-0000-4000-8000-000000000001' and user_id='a1000000-0000-4000-8000-000000000003';
 if public.academy_accept_invitation_atomic('a4000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000003','learner@example.invalid')->>'result'<>'already_joined' then raise exception 'Idempotent replay failed'; end if;
 update public.academy_enrollments set status='completed' where id=original_id;
 if public.academy_grant_member_atomic('a3000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000003')<>'granted' then raise exception 'Repeat grant failed'; end if;
 if not exists(select 1 from public.academy_enrollments where id=original_id and status='completed') then raise exception 'Completion lost on regrant'; end if;
 if (select count(*) from public.academy_enrollments where location_id='a3000000-0000-4000-8000-000000000001' and user_id='a1000000-0000-4000-8000-000000000003')<>1 then raise exception 'Duplicate enrollment'; end if;
 if (select count(*) from public.academy_audit_log where actor_id='a1000000-0000-4000-8000-000000000003' and action='invite_accepted')<>1 then raise exception 'Duplicate invite audit'; end if;
 if public.academy_deactivate_member_atomic('a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000003')<>'deactivated' then raise exception 'Removal failed'; end if;
 if public.academy_accept_invitation_atomic('a4000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000003','learner@example.invalid')->>'result'<>'invalid' then raise exception 'Replay after removal restored access'; end if;
 if public.academy_grant_member_atomic('a3000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000003')<>'forbidden' then raise exception 'Removed member grant accepted'; end if;
 if exists(select 1 from public.academy_location_members where location_id='a3000000-0000-4000-8000-000000000001' and user_id='a1000000-0000-4000-8000-000000000003' and active) then raise exception 'Removed member active'; end if;
 if exists(select 1 from public.academy_invitations where id in ('a4000000-0000-4000-8000-000000000002','a4000000-0000-4000-8000-000000000003') and accepted_at is not null) then raise exception 'Denied invitations consumed'; end if;
END $$;
RESET ROLE;
ROLLBACK;
