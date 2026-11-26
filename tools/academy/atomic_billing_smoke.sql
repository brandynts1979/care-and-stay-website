\set ON_ERROR_STOP on
BEGIN;
insert into auth.users(id) values ('b1000000-0000-4000-8000-000000000001'),('b1000000-0000-4000-8000-000000000002'),('b1000000-0000-4000-8000-000000000003');
insert into public.academy_courses(id,slug,title,published) values
 ('b2000000-0000-4000-8000-000000000001','stay-culture-leadership-academy','Legacy CI',true)
 on conflict(slug) do update set published=true;
insert into public.academy_locations(id,name,billing_owner_id,subscription_status) values
 ('b3000000-0000-4000-8000-000000000001','Fictional paid location','b1000000-0000-4000-8000-000000000001','pending'),
 ('b3000000-0000-4000-8000-000000000002','Fictional other location','b1000000-0000-4000-8000-000000000001','active');
insert into public.academy_location_members(location_id,user_id,role,active) values
 ('b3000000-0000-4000-8000-000000000001','b1000000-0000-4000-8000-000000000001','owner',true),
 ('b3000000-0000-4000-8000-000000000001','b1000000-0000-4000-8000-000000000002','manager',true),
 ('b3000000-0000-4000-8000-000000000001','b1000000-0000-4000-8000-000000000003','manager',false),
 ('b3000000-0000-4000-8000-000000000002','b1000000-0000-4000-8000-000000000001','owner',true);
DO $$ BEGIN
 if has_function_privilege('anon','public.academy_reconcile_subscription_atomic(uuid,bigint,text,text,text,text,text,timestamptz)','EXECUTE')
 or has_function_privilege('authenticated','public.academy_reconcile_subscription_atomic(uuid,bigint,text,text,text,text,text,timestamptz)','EXECUTE')
 or not has_function_privilege('service_role','public.academy_reconcile_subscription_atomic(uuid,bigint,text,text,text,text,text,timestamptz)','EXECUTE')
 then raise exception 'Billing RPC privilege failure'; end if;
END $$;
alter role service_role bypassrls;
SET LOCAL ROLE service_role;
DO $$ DECLARE lid uuid='b3000000-0000-4000-8000-000000000001'; period timestamptz=now()+interval '30 days'; original uuid; BEGIN
 if public.academy_grant_member_atomic('b3000000-0000-4000-8000-000000000002','b1000000-0000-4000-8000-000000000001')<>'granted' then raise exception 'Other location setup failed'; end if;
 if public.academy_reconcile_subscription_atomic(lid,0,'evt_ci_active','invoice.paid','sub_ci','cus_ci','active',null)<>'invalid' then raise exception 'Unbounded paid period allowed'; end if;
 if public.academy_reconcile_subscription_atomic(lid,0,'evt_ci_active','invoice.paid','sub_ci','cus_ci','active',period)<>'applied' then raise exception 'Activation failed'; end if;
 if (select count(*) from public.academy_enrollments where location_id=lid and status='active')<>2 then raise exception 'Active member grants wrong'; end if;
 select id into strict original from public.academy_enrollments where location_id=lid and user_id='b1000000-0000-4000-8000-000000000001';
 update public.academy_enrollments set status='completed' where id=original;
 if public.academy_reconcile_subscription_atomic(lid,0,'evt_ci_active','invoice.paid','sub_ci','cus_ci','active',period)<>'duplicate' then raise exception 'Duplicate event not recognized'; end if;
 if public.academy_reconcile_subscription_atomic(lid,0,'evt_ci_cancel','customer.subscription.deleted','sub_ci','cus_ci','canceled',period)<>'retry' then raise exception 'Stale revision was accepted'; end if;
 if (select processed_at from public.academy_billing_events where stripe_event_id='evt_ci_cancel') is not null then raise exception 'Stale event marked processed'; end if;
 if public.academy_reconcile_subscription_atomic(lid,1,'evt_ci_bad','invoice.paid','sub_other','cus_ci','active',period)<>'mismatch' then raise exception 'Other subscription bound'; end if;
 if public.academy_reconcile_subscription_atomic(lid,1,'evt_ci_bad','invoice.paid','sub_ci','cus_other','active',period)<>'mismatch' then raise exception 'Other customer bound'; end if;
 if public.academy_reconcile_subscription_atomic(lid,1,'evt_ci_cancel','customer.subscription.deleted','sub_ci','cus_ci','canceled',period)<>'applied' then raise exception 'Cancellation retry failed'; end if;
 if exists(select 1 from public.academy_enrollments where location_id=lid and status='active') then raise exception 'Cancellation left active enrollment'; end if;
 if not exists(select 1 from public.academy_enrollments where id=original and status='completed') then raise exception 'Cancellation erased completed enrollment'; end if;
 if not exists(select 1 from public.academy_enrollments where location_id='b3000000-0000-4000-8000-000000000002' and status='active') then raise exception 'Other location access lost'; end if;
 if public.academy_reconcile_subscription_atomic(lid,1,'evt_ci_stale','invoice.paid','sub_ci','cus_ci','active',period)<>'retry' then raise exception 'Older concurrent snapshot restored access'; end if;
 if (select billing_revision from public.academy_locations where id=lid)<>2 then raise exception 'Revision changed on retry/duplicate'; end if;
 if (select count(*) from public.academy_billing_events where stripe_event_id in ('evt_ci_active','evt_ci_cancel') and processed_at is not null)<>2 then raise exception 'Successful events not durably completed'; end if;
END $$;
RESET ROLE;
ROLLBACK;
