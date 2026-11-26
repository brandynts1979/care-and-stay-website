\set ON_ERROR_STOP on
BEGIN;
insert into auth.users(id) values ('e1000000-0000-4000-8000-000000000001'),('e1000000-0000-4000-8000-000000000002');
insert into public.academy_courses(slug,title,published) values('stay-culture-leadership-academy','CI legacy',true) on conflict(slug) do update set published=true;
insert into public.academy_locations(id,name,billing_owner_id,subscription_status) values ('e2000000-0000-4000-8000-000000000001','CI checkout','e1000000-0000-4000-8000-000000000001','pending');
insert into public.academy_location_members(location_id,user_id,role,active) values
('e2000000-0000-4000-8000-000000000001','e1000000-0000-4000-8000-000000000001','owner',true),
('e2000000-0000-4000-8000-000000000001','e1000000-0000-4000-8000-000000000002','manager',true);
alter role service_role bypassrls;
SET LOCAL ROLE service_role;
DO $$ DECLARE lid uuid='e2000000-0000-4000-8000-000000000001'; own uuid='e1000000-0000-4000-8000-000000000001'; aid uuid; result jsonb; period timestamptz=now()+interval '1 month'; BEGIN
 if public.academy_reserve_checkout(lid,'e1000000-0000-4000-8000-000000000002','manager@example.invalid','price_ci')->>'result'<>'forbidden' then raise exception 'Manager initiated checkout'; end if;
 result:=public.academy_reserve_checkout(lid,own,'owner@example.invalid','price_ci');
 aid:=(result->'attempt'->>'id')::uuid;
 if aid is null then raise exception 'Reservation failed'; end if;
 if (public.academy_reserve_checkout(lid,own,'owner@example.invalid','price_ci')->'attempt'->>'id')::uuid<>aid then raise exception 'Duplicate reservation'; end if;
 if public.academy_reserve_checkout(lid,own,'owner@example.invalid','price_other')->>'result'<>'review_required' then raise exception 'Price change silently accepted'; end if;
 if public.academy_bind_checkout_atomic(lid,0,aid,'cs_ci',own,'price_ci','evt_ci_bind','checkout.session.completed','sub_ci_bind','cus_ci_bind','active',period)<>'mismatch' then raise exception 'Unrecorded checkout allowed'; end if;
 if not public.academy_record_checkout_session(aid,'cs_ci') or public.academy_record_checkout_session(aid,'cs_other') then raise exception 'Session recording not idempotent'; end if;
 if public.academy_bind_checkout_atomic(lid,0,aid,'cs_ci',own,'price_ci','evt_ci_invoice','invoice.paid','sub_ci_bind','cus_ci_bind','active',period)<>'mismatch' then raise exception 'Invoice bound first subscription'; end if;
 if public.academy_bind_checkout_atomic(lid,0,aid,'cs_ci',own,'price_ci','evt_ci_bind','checkout.session.completed','sub_ci_bind','cus_ci_bind','active',period)<>'applied' then raise exception 'Authorized checkout not bound'; end if;
 if public.academy_bind_checkout_atomic(lid,0,aid,'cs_ci',own,'price_ci','evt_ci_bind','checkout.session.completed','sub_ci_bind','cus_ci_bind','active',period)<>'duplicate' then raise exception 'Duplicate binding not recognized'; end if;
 if (select count(*) from public.academy_enrollments where location_id=lid and status='active')<>2 then raise exception 'Owner/member grant mismatch'; end if;
 if public.academy_reserve_checkout(lid,own,'owner@example.invalid','price_ci')->>'result'<>'existing_subscription' then raise exception 'Duplicate checkout for linked location'; end if;
END $$;
RESET ROLE;
DO $$ BEGIN
 if has_table_privilege('authenticated','public.academy_checkout_attempts','SELECT') or has_function_privilege('authenticated','public.academy_reserve_checkout(uuid,uuid,text,text)','EXECUTE') then raise exception 'Checkout data exposed'; end if;
END $$;
ROLLBACK;
