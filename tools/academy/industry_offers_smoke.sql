\set ON_ERROR_STOP on
BEGIN;
DO $$
DECLARE c record; o uuid; v_owner uuid; v_learner uuid; v_other uuid; loc uuid; other_loc uuid; a uuid; v_course uuid;
 price text; product text; prefix text; session text; sub text; customer text; event text; res jsonb; v_enrollment uuid; n int:=0;
BEGIN
 if has_table_privilege('authenticated','public.academy_industry_offers','SELECT')
 or has_table_privilege('anon','public.academy_industry_location_offers','SELECT')
 or has_table_privilege('service_role','public.academy_industry_offers','UPDATE')
 or has_function_privilege('authenticated','public.academy_industry_reserve_checkout(uuid,uuid,text,boolean)','EXECUTE')
 then raise exception 'Industry offer authority leaked'; end if;
 FOR c IN SELECT * FROM (VALUES
 ('4e9d56db-6ece-8b5f-ac7c-8bd24f809617'::uuid,'senior-care'),
 ('01fa508f-2265-8915-9ed3-cd48611927ad'::uuid,'hospice'),
 ('6bec604c-2d3c-88ad-a04f-3f80c4471c5c'::uuid,'home-care'),
 ('2d90f628-dcc5-8d94-a5a3-6c343106187d'::uuid,'dd-services'),
 ('6f3d57ab-a581-880e-be45-8e6bc75ec481'::uuid,'hospitality')
 ) AS fixture(id,slug) LOOP
  insert into public.academy_courses(id,slug,title,published) values(c.id,'stay-culture-leadership-academy-'||c.slug||'-v2','Synthetic catalog course',true);
 END LOOP;
 FOR c IN SELECT id,slug FROM public.academy_courses WHERE id in ('4e9d56db-6ece-8b5f-ac7c-8bd24f809617','01fa508f-2265-8915-9ed3-cd48611927ad','6bec604c-2d3c-88ad-a04f-3f80c4471c5c','2d90f628-dcc5-8d94-a5a3-6c343106187d','6f3d57ab-a581-880e-be45-8e6bc75ec481') LOOP
  prefix:=replace(gen_random_uuid()::text,'-','');price:='price_synthetic_'||prefix;product:='prod_synthetic_'||prefix;
  session:='cs_test_synthetic_'||prefix;sub:='sub_synthetic_'||prefix;customer:='cus_synthetic_'||prefix;event:='evt_synthetic_'||prefix;
  o:=gen_random_uuid();loc:=gen_random_uuid();other_loc:=gen_random_uuid();v_owner:=gen_random_uuid();v_learner:=gen_random_uuid();v_other:=gen_random_uuid();
  SELECT id INTO v_course FROM public.academy_courses WHERE id<>c.id AND slug LIKE 'stay-culture-leadership-academy-%-v2' LIMIT 1;
  insert into auth.users(id) values(v_owner),(v_learner),(v_other);
  insert into public.academy_locations(id,name,billing_owner_id) values(loc,'Industry fixture',v_owner),(other_loc,'Unrelated fixture',v_other);
  insert into public.academy_location_members(location_id,user_id,role,active) values(loc,v_owner,'owner',true),(loc,v_learner,'manager',true),(other_loc,v_other,'owner',true);
  insert into public.academy_industry_offers(id,course_id,price_id,product_id,livemode,unit_amount,currency,tax_behavior,terms_version) values(o,c.id,price,product,false,100,'usd','exclusive','synthetic-only');
  insert into public.academy_industry_location_offers(location_id,offer_id) values(loc,o);
  if (public.academy_industry_reserve_checkout(loc,v_owner,'qa@example.invalid',false)->>'result')<>'unavailable' then raise exception 'Disabled offer reserved'; end if;
  begin update public.academy_industry_offers set price_id='price_wrong' where id=o; raise exception using errcode='PZ009',message='Price mutable'; exception when sqlstate 'P0001' then null; end;
  begin update public.academy_industry_location_offers set offer_id=o where location_id=loc; raise exception using errcode='PZ009',message='Route mutable'; exception when sqlstate 'P0001' then null; end;
  begin insert into public.academy_location_course_entitlements(location_id,course_id,active,source) values(loc,v_course,true,'internal_demo'); raise exception 'Cross-course grant allowed'; exception when insufficient_privilege then null; end;
  begin insert into public.academy_location_course_entitlements(location_id,course_id,active,source) values(loc,c.id,true,'internal_demo'); raise exception 'Unpaid grant allowed'; exception when insufficient_privilege then null; end;
  -- Legacy/QSR location without an industry route retains its original entitlement behavior.
  insert into public.academy_location_course_entitlements(location_id,course_id,active,source) values(other_loc,v_course,true,'internal_demo');
  begin insert into public.academy_industry_location_offers(location_id,offer_id) values(other_loc,o); raise exception using errcode='PZ009',message='Existing unrelated location re-routed'; exception when sqlstate 'P0001' then null; end;
  update public.academy_industry_offers set checkout_enabled=true where id=o;
  if (public.academy_industry_reserve_checkout(loc,v_owner,'qa@example.invalid',true)->>'result')<>'unavailable'
    or (public.academy_industry_reserve_checkout(loc,v_other,'qa@example.invalid',false)->>'result')<>'forbidden'
    or (public.academy_industry_reserve_checkout(other_loc,v_other,'qa@example.invalid',false)->>'result')<>'unavailable'
  then raise exception 'Wrong-mode, owner or route reservation'; end if;
  res:=public.academy_industry_reserve_checkout(loc,v_owner,'qa@example.invalid',false);
  if res->>'result'<>'reserved' or res->'attempt'->>'price_id'<>price then raise exception 'Correct reservation failed'; end if;
  a:=(res->'attempt'->>'id')::uuid;
  if (public.academy_industry_reserve_checkout(loc,v_owner,'qa@example.invalid',false)->'attempt'->>'id')::uuid<>a then raise exception 'Retry diverged'; end if;
  if exists(select 1 from public.academy_location_course_entitlements where location_id=loc) then raise exception 'Grant before verified Checkout'; end if;
  if not public.academy_record_checkout_session(a,session) then raise exception 'Session recording failed'; end if;
  if public.academy_industry_bind_checkout_atomic(loc,0,a,session,v_owner,'price_wrong',event||'_wrongprice','checkout.session.completed',sub,customer,'active',now()+interval '30 days',false)<>'mismatch'
   or public.academy_industry_bind_checkout_atomic(loc,0,a,session,v_owner,price,event||'_wrongmode','checkout.session.completed',sub,customer,'active',now()+interval '30 days',true)<>'mismatch'
   or public.academy_industry_bind_checkout_atomic(loc,0,a,'cs_test_wrong',v_owner,price,event||'_wrongsession','checkout.session.completed',sub,customer,'active',now()+interval '30 days',false)<>'mismatch'
   or public.academy_industry_bind_checkout_atomic(loc,9,a,session,v_owner,price,event||'_stale','checkout.session.completed',sub,customer,'active',now()+interval '30 days',false)<>'retry'
  then raise exception 'Invalid first binding accepted'; end if;
  if exists(select 1 from public.academy_location_course_entitlements where location_id=loc) then raise exception 'Unapplied grant leaked'; end if;
  -- Closing new sales does not strand an already reserved paid Checkout.
  update public.academy_industry_offers set checkout_enabled=false where id=o;
  if public.academy_industry_bind_checkout_atomic(loc,0,a,session,v_owner,price,event||'_paid','checkout.session.completed',sub,customer,'active',now()+interval '30 days',false)<>'applied'
   or public.academy_industry_bind_checkout_atomic(loc,0,a,session,v_owner,price,event||'_paid','checkout.session.completed',sub,customer,'active',now()+interval '30 days',false)<>'duplicate'
  then raise exception 'Valid paid binding or replay failed'; end if;
  if (select count(*) from public.academy_location_course_entitlements where location_id=loc and course_id=c.id and source='verified_subscription' and active)<>1
   or (select count(*) from public.academy_location_course_entitlements where location_id=loc)<>1
   or (select count(*) from public.academy_enrollments where location_id=loc and course_id=c.id and status='active')<>2
   or (select count(*) from public.academy_enrollments where location_id=loc)<>2
  then raise exception 'Incorrect paid entitlement'; end if;
  select id into v_enrollment from public.academy_enrollments where location_id=loc and user_id=v_learner and course_id=c.id;
  if public.academy_industry_reconcile_subscription_atomic(loc,1,event||'_otherprice','invoice.paid',sub,customer,'active',now()+interval '60 days','price_wrong',false)<>'mismatch'
   or public.academy_industry_reconcile_subscription_atomic(loc,1,event||'_othermode','invoice.paid',sub,customer,'active',now()+interval '60 days',price,true)<>'mismatch'
   or public.academy_industry_reconcile_subscription_atomic(loc,1,event||'_renew','invoice.paid',sub,customer,'active',now()+interval '60 days',price,false)<>'applied'
   or public.academy_industry_reconcile_subscription_atomic(loc,1,event||'_renew','invoice.paid',sub,customer,'active',now()+interval '60 days',price,false)<>'duplicate'
   or public.academy_industry_reconcile_subscription_atomic(loc,2,event||'_failure','invoice.payment_failed',sub,customer,'past_due',now()+interval '60 days',price,false)<>'applied'
  then raise exception 'Subscription route reconciliation failed'; end if;
  if exists(select 1 from public.academy_enrollments where location_id=loc and status='active') then raise exception 'Past-due access retained'; end if;
  if public.academy_industry_reconcile_subscription_atomic(loc,3,event||'_recover','invoice.paid',sub,customer,'active',now()+interval '60 days',price,false)<>'applied' then raise exception 'Recovery failed'; end if;
  if not exists(select 1 from public.academy_enrollments where id=v_enrollment and status='active') then raise exception 'Enrollment identity lost'; end if;
  if public.academy_industry_reconcile_subscription_atomic(loc,4,event||'_cancel','customer.subscription.deleted',sub,customer,'canceled',now(),price,false)<>'applied' then raise exception 'Cancel failed'; end if;
  if exists(select 1 from public.academy_enrollments where location_id=loc and status='active') or (select count(*) from public.academy_enrollments where location_id=loc)<>2 then raise exception 'Cancel/history failed'; end if;
  if not exists(select 1 from public.academy_location_course_entitlements where location_id=other_loc and course_id=v_course and active) then raise exception 'Unrelated location changed'; end if;
  n:=n+1;
 END LOOP;
 if n<>5 then raise exception 'Incomplete course coverage'; end if;
 raise notice 'PASS five independent industry price/contract bindings, disabled gates, exact grant, idempotency, rollback, renewal, failure, recovery, cancellation and unrelated-location isolation';
END $$;
ROLLBACK;
