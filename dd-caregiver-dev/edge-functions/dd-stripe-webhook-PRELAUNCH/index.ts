// DD Parent App — PRELAUNCH Stripe webhook receiver source.
// NOT DEPLOYED. Do not deploy/register with Stripe until secret configuration,
// tax registration, end-to-end sandbox testing and launch approvals are complete.
// Supabase Edge deployment must use verify_jwt:false ONLY because the signature is verified below.
import Stripe from "npm:stripe@22.0.0";
import {HANDLED_EVENTS,getSubscriptionId,getBillingSnapshot,isPaidEntitlement} from "./event-mapping.mjs";
const PROCESSING_RELEASE_APPROVED = false;
const PRICE_ID = "price_1Ubr0GHU2Vcv1mFQgOfj2Ww8";
const stripeCryptoProvider = Stripe.createSubtleCryptoProvider();
function no(message: string,status=503){return new Response(message,{status,headers:{"Cache-Control":"no-store"}})}
Deno.serve(async(req:Request)=>{
 if(!PROCESSING_RELEASE_APPROVED) return no("DD billing webhooks are not activated.");
 if(req.method!=="POST") return no("Method not allowed",405);
 const secret=Deno.env.get("STRIPE_SECRET_KEY"),webhookSecret=Deno.env.get("STRIPE_WEBHOOK_SIGNING_SECRET");
 const supabaseUrl=Deno.env.get("SUPABASE_URL"),serviceKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
 if(!secret||!webhookSecret||!supabaseUrl||!serviceKey)return no("Billing service unavailable");
 const signature=req.headers.get("Stripe-Signature");
 if(!signature)return no("Missing signature",400);
 const stripe=new Stripe(secret);
 let event:Stripe.Event;
 try {
  event=await stripe.webhooks.constructEventAsync(await req.text(),signature,webhookSecret,undefined,stripeCryptoProvider);
 }catch {return no("Invalid Stripe signature",400)}
 if(!HANDLED_EVENTS.has(event.type))return new Response("ignored",{status:200});
 try{
  const subId=getSubscriptionId(event);
  if(!subId)return no("Subscription reference unavailable",422);
  // Always retrieve the CURRENT subscription to avoid stale event payloads.
  const subscription=await stripe.subscriptions.retrieve(subId);
  const snapshot=getBillingSnapshot(subscription,PRICE_ID);
  if(!snapshot)return no("Subscription is not linked to exactly one approved DD price/account",422);
  // A completed Checkout page is not proof of a settled payment.
  // Fail closed for missing/unpaid invoices and do not confer trial access.
  const invoiceRef=subscription.latest_invoice;
  const invoiceId=typeof invoiceRef==="string"?invoiceRef:invoiceRef?.id;
  const invoice=invoiceId?await stripe.invoices.retrieve(invoiceId):null;
  const invoicePaid=Boolean(invoice?.status==="paid"&&invoice.paid);
  const paid=isPaidEntitlement(snapshot,invoicePaid);
  const recordedStatus=snapshot.status==="active"&&!paid?"past_due":
    snapshot.status==="trialing"?"incomplete":snapshot.status;
  const res=await fetch(supabaseUrl+"/rest/v1/rpc/dd_apply_verified_stripe_event",{
   method:"POST",
   headers:{apikey:serviceKey,authorization:"Bearer "+serviceKey,"Content-Type":"application/json"},
   body:JSON.stringify({
    p_event_id:event.id,p_event_type:event.type,p_event_created:event.created,
    p_owner_id:snapshot.ownerId,p_customer_id:snapshot.customerId,p_subscription_id:snapshot.subscriptionId,
    p_price_id:PRICE_ID,p_status:recordedStatus,p_period_end:snapshot.periodEnd,
    p_cancel_at_period_end:snapshot.cancelAtPeriodEnd
   })
  });
  if(!res.ok)return no("Billing event persistence unavailable",503);
  return new Response("ok",{status:200});
 }catch {
  // Stripe retries transient processing errors. Do not log raw webhook or customer info.
  return no("Billing event not processed",503);
 }
});
