\set ON_ERROR_STOP on
begin;
insert into auth.users(id) values ('fa100000-0000-4000-8000-000000000001'),('fa100000-0000-4000-8000-000000000002');
insert into public.academy_courses(slug,title,published) values ('stay-culture-leadership-academy','Synthetic Academy',true)
on conflict(slug) do update set published=true;
insert into public.academy_locations(id,name,billing_owner_id,subscription_status) values
 ('fa200000-0000-4000-8000-000000000001','Bundle location','fa100000-0000-4000-8000-000000000001','pending'),
 ('fa200000-0000-4000-8000-000000000002','Unrelated location','fa100000-0000-4000-8000-000000000001','pending');
insert into public.academy_location_members(location_id,user_id,role,active)
select id,billing_owner_id,'owner',true from public.academy_locations where id in
 ('fa200000-0000-4000-8000-000000000001','fa200000-0000-4000-8000-000000000002');
insert into public.academy_qsr_bundle_routes values
 ('fa200000-0000-4000-8000-000000000001','organizational_360','fa300000-0000-4000-8000-000000000001'),
 ('fa200000-0000-4000-8000-000000000001','individual_360','fa300000-0000-4000-8000-000000000002');
insert into public.academy_location_members(location_id,user_id,role,active)
values ('fa200000-0000-4000-8000-000000000001','fa100000-0000-4000-8000-000000000002','gm',true);
insert into public.academy_qsr_assessment_cycles(id,location_id,starts_at,ends_at)
values ('fa400000-0000-4000-8000-000000000001','fa200000-0000-4000-8000-000000000001',
 ((now() at time zone 'UTC')-interval '1 month') at time zone 'UTC',
 (((now() at time zone 'UTC')-interval '1 month')+interval '6 months') at time zone 'UTC');
insert into public.academy_qsr_assessment_gms
values ('fa400000-0000-4000-8000-000000000001','fa100000-0000-4000-8000-000000000002');
alter role service_role bypassrls;
set local role service_role;
do $$
declare
 loc uuid='fa200000-0000-4000-8000-000000000001';
 outside uuid='fa200000-0000-4000-8000-000000000002';
 owner_id uuid='fa100000-0000-4000-8000-000000000001';
 target uuid='fa300000-0000-4000-8000-000000000001';
 price text='price_1UgSjtHJxPBidfhbyvsfGsM6';
 period_end timestamptz=now()+interval '1 month';
 attempt uuid;
 cycle uuid='fa400000-0000-4000-8000-000000000001';
 gm uuid='fa100000-0000-4000-8000-000000000002';
 issued_org uuid;
 issued_gm uuid;
begin
 attempt:=(public.academy_reserve_checkout(loc,owner_id,'fixture@example.invalid',price)->'attempt'->>'id')::uuid;
 if not public.academy_record_checkout_session(attempt,'cs_bundle_fixture') then raise exception 'Session reservation failed'; end if;
 if public.academy_bind_checkout_atomic(loc,0,attempt,'cs_bundle_fixture',owner_id,price,'evt_bundle_create','checkout.session.completed','sub_bundle','cus_bundle','active',period_end)<>'applied'
 then raise exception 'Bundle binding failed'; end if;
 if (select count(*) from public.academy_qsr_bundle_delivery where location_id=loc and revision=1 and desired_active and acknowledged_at is null)<>2
 then raise exception 'Bundle delivery missing'; end if;
 if not exists(select 1 from public.academy_enrollments where location_id=loc and status='active')
 then raise exception 'Academy grant missing'; end if;
 if public.academy_ack_qsr_bundle_delivery(loc,'organizational_360','fa300000-0000-4000-8000-000000000002',1)
 then raise exception 'Wrong recipient acknowledged delivery'; end if;
 if not public.academy_ack_qsr_bundle_delivery(loc,'organizational_360',target,1)
 then raise exception 'Delivery acknowledgement failed'; end if;
 if public.academy_issue_qsr_assessment(loc,cycle,'individual_360',owner_id,gm) is not null
 then raise exception 'Unacknowledged recipient issued assessment'; end if;
 if not public.academy_ack_qsr_bundle_delivery(loc,'individual_360','fa300000-0000-4000-8000-000000000002',1)
 then raise exception 'Individual delivery acknowledgement failed'; end if;
 if public.academy_issue_qsr_assessment(loc,cycle,'organizational_360',gm) is not null
 or public.academy_issue_qsr_assessment(outside,cycle,'organizational_360',owner_id) is not null
 then raise exception 'Invalid role or location issued assessment'; end if;
 issued_org:=public.academy_issue_qsr_assessment(loc,cycle,'organizational_360',owner_id);
 issued_gm:=public.academy_issue_qsr_assessment(loc,cycle,'individual_360',owner_id,gm);
 if issued_org is null or issued_gm is null
 or public.academy_issue_qsr_assessment(loc,cycle,'individual_360',owner_id,gm) is distinct from issued_gm
 then raise exception 'Assessment issuance or retry failed'; end if;

 if public.academy_reconcile_subscription_atomic(outside,0,'evt_other','invoice.paid','sub_other','cus_other','active',period_end)<>'applied'
 then raise exception 'Unrelated subscription failed'; end if;
 if exists(select 1 from public.academy_qsr_bundle_delivery where location_id=outside)
 then raise exception 'Unrelated subscription entered bundle'; end if;
 if public.academy_reconcile_subscription_atomic(loc,1,'evt_bundle_fail','invoice.payment_failed','sub_bundle','cus_bundle','past_due',period_end)<>'applied'
 then raise exception 'Failure snapshot did not apply'; end if;
 if public.academy_ack_qsr_bundle_delivery(loc,'organizational_360',target,1)
 then raise exception 'Stale delivery acknowledged current revision'; end if;
 if (select count(*) from public.academy_qsr_bundle_delivery where location_id=loc and revision=2 and not desired_active and acknowledged_at is null)<>2
 then raise exception 'Revocation not queued'; end if;
 if public.academy_reconcile_subscription_atomic(loc,2,'evt_bundle_renew','invoice.paid','sub_bundle','cus_bundle','active',period_end+interval '1 month')<>'applied'
 then raise exception 'Renewal did not apply'; end if;
 if (select count(*) from public.academy_qsr_bundle_delivery where location_id=loc and revision=3 and desired_active and acknowledged_at is null)<>2
 then raise exception 'Renewal not queued'; end if;
 if not public.academy_ack_qsr_bundle_delivery(loc,'organizational_360',target,3)
 then raise exception 'Renewal acknowledgement failed'; end if;
 if public.academy_issue_qsr_assessment(loc,cycle,'organizational_360',owner_id) is distinct from issued_org
 then raise exception 'Monthly billing revision duplicated assessment'; end if;

 if public.academy_reconcile_subscription_atomic(loc,3,'evt_bundle_renew','invoice.paid','sub_bundle','cus_bundle','active',period_end)<>'duplicate'
 then raise exception 'Replay not idempotent'; end if;
 if public.academy_reconcile_subscription_atomic(loc,3,'evt_bundle_cancel','customer.subscription.deleted','sub_bundle','cus_bundle','canceled',period_end)<>'applied'
 then raise exception 'Cancellation did not apply'; end if;
 if (select count(*) from public.academy_qsr_bundle_delivery where location_id=loc and revision=4 and not desired_active)<>2
 or not exists(select 1 from public.academy_enrollments where location_id=outside and status='active')
 then raise exception 'Cancellation lost revocation or affected unrelated access'; end if;
 if public.academy_issue_qsr_assessment(loc,cycle,'organizational_360',owner_id) is not null
 or (select count(*) from public.academy_qsr_assessment_issuances where cycle_id=cycle)<>2
 then raise exception 'Cancellation allowed new issuance or erased history'; end if;

end $$;
reset role;
do $$ begin
 if has_table_privilege('authenticated','public.academy_qsr_assessment_issuances','SELECT')
 or has_function_privilege('authenticated','public.academy_issue_qsr_assessment(uuid,uuid,text,uuid,uuid)','EXECUTE')
 or has_table_privilege('anon','public.academy_qsr_bundle_routes','SELECT')
 or has_table_privilege('authenticated','public.academy_qsr_bundle_delivery','SELECT')
 or has_function_privilege('authenticated','public.academy_ack_qsr_bundle_delivery(uuid,text,uuid,bigint)','EXECUTE')
 then raise exception 'Bundle state is browser accessible'; end if;
end $$;
rollback;
