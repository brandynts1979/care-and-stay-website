\set ON_ERROR_STOP on
BEGIN;
insert into auth.users(id) values ('f1000000-0000-4000-8000-000000000001');
insert into public.academy_locations(id,name,billing_owner_id,subscription_status,stripe_subscription_id,stripe_customer_id) values
('f2000000-0000-4000-8000-000000000001','Synthetic Risk Location','f1000000-0000-4000-8000-000000000001','active','sub_ci_risk','cus_ci_risk');
alter role service_role bypassrls;
SET LOCAL ROLE service_role;
DO $$ BEGIN
 if public.academy_record_billing_risk('evt_ci_risk1','charge.dispute.created','ch_ci','in_ci','sub_ci_risk','cus_ci_risk')<>'matched' then raise exception 'Known risk not matched'; end if;
 if public.academy_record_billing_risk('evt_ci_risk1','charge.dispute.created','ch_ci','in_ci','sub_ci_risk','cus_ci_risk')<>'duplicate' then raise exception 'Risk replay not idempotent'; end if;
 if public.academy_record_billing_risk('evt_ci_risk2','charge.refunded','ch_ci2','in_ci2','sub_ci_risk','cus_other')<>'unresolved' then raise exception 'Wrong customer matched'; end if;
 if public.academy_record_billing_risk('evt_ci_risk3','radar.early_fraud_warning.created','ch_ci3',null,null,'cus_ci_risk')<>'unresolved' then raise exception 'Customer-only association allowed'; end if;
 if public.academy_record_billing_risk('evt_ci_risk4','charge.refunded','ch_ci4','in_ci4','sub_other','cus_ci_risk')<>'unresolved' then raise exception 'Unknown subscription matched'; end if;
 if (select count(*) from public.academy_billing_risk_cases where location_id='f2000000-0000-4000-8000-000000000001')<>1 then raise exception 'Wrong location association'; end if;
 if (select count(*) from public.academy_billing_risk_cases where review_status='open')<>4 then raise exception 'Risk case lost'; end if;
 if (select subscription_status from public.academy_locations where id='f2000000-0000-4000-8000-000000000001')<>'active' then raise exception 'Unapproved cancellation'; end if;
END $$;
RESET ROLE;
DO $$ BEGIN
 if has_table_privilege('authenticated','public.academy_billing_risk_cases','SELECT') or has_function_privilege('authenticated','public.academy_record_billing_risk(text,text,text,text,text,text)','EXECUTE') then raise exception 'Risk inbox exposed'; end if;
END $$;
ROLLBACK;
