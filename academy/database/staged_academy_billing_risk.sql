-- Staged service-only review inbox. No automatic refund, cancellation or access mutation.
BEGIN;
create table public.academy_billing_risk_cases(
 stripe_event_id text primary key references public.academy_billing_events(stripe_event_id),
 event_type text not null check(event_type in ('charge.dispute.created','charge.refunded','radar.early_fraud_warning.created')),
 charge_id text not null,
 invoice_id text,
 subscription_id text,
 location_id uuid references public.academy_locations(id),
 match_state text not null check(match_state in ('matched','unresolved')),
 reason_code text not null check(reason_code in ('linked_subscription','no_invoice','no_subscription','no_matching_location','customer_mismatch')),
 review_status text not null default 'open' check(review_status in ('open','reviewed')),
 created_at timestamptz not null default now(),
 reviewed_at timestamptz,
 check((match_state='matched')=(location_id is not null))
);
alter table public.academy_billing_risk_cases enable row level security;
revoke all on public.academy_billing_risk_cases from public,anon,authenticated;
grant all on public.academy_billing_risk_cases to service_role;
create function public.academy_record_billing_risk(p_event text,p_type text,p_charge text,p_invoice text,p_subscription text,p_customer text)
returns text language plpgsql security invoker set search_path=pg_catalog,public as $$
declare loc public.academy_locations%rowtype; event_done timestamptz; reason text;
begin
 if p_event is null or p_charge is null or p_type is null or p_type not in ('charge.dispute.created','charge.refunded','radar.early_fraud_warning.created') then return 'invalid'; end if;
 if p_invoice is null then reason:='no_invoice';
 elsif p_subscription is null then reason:='no_subscription';
 else
   select * into loc from public.academy_locations where stripe_subscription_id=p_subscription for update;
   if not found then reason:='no_matching_location';
   elsif p_customer is null or loc.stripe_customer_id is distinct from p_customer then reason:='customer_mismatch'; loc.id:=null;
   else reason:='linked_subscription';
   end if;
 end if;
 insert into public.academy_billing_events(stripe_event_id,event_type) values(p_event,p_type) on conflict(stripe_event_id) do nothing;
 select processed_at into event_done from public.academy_billing_events where stripe_event_id=p_event for update;
 if event_done is not null then return 'duplicate'; end if;
 insert into public.academy_billing_risk_cases(stripe_event_id,event_type,charge_id,invoice_id,subscription_id,location_id,match_state,reason_code)
 values(p_event,p_type,p_charge,p_invoice,p_subscription,loc.id,case when loc.id is null then 'unresolved' else 'matched' end,reason);
 update public.academy_billing_events set processed_at=now(),processing_error=null where stripe_event_id=p_event;
 return case when loc.id is null then 'unresolved' else 'matched' end;
end $$;
revoke all on function public.academy_record_billing_risk(text,text,text,text,text,text) from public,anon,authenticated;
grant execute on function public.academy_record_billing_risk(text,text,text,text,text,text) to service_role;
COMMIT;
