// DD Parent App — PRELAUNCH Stripe webhook receiver source.
// NOT DEPLOYED. Do not deploy/register with Stripe until secret configuration,
// tax registration, end-to-end sandbox testing and launch approvals are complete.
// Supabase Edge deployment must use verify_jwt:false ONLY because the signature is verified below.
import Stripe from "npm:stripe@22.0.0";
const PROCESSING_RELEASE_APPROVED = false;
const PRICE_ID = "price_1Ubr0GHU2Vcv1mFQgOfj2Ww8";
const HANDLED = new Set([
 "checkout.session.completed","customer.subscription.created",
 "customer.subscription.updated","customer.subscription.deleted",
 "invoice.paid","invoice.payment_failed"
]);
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
 if(!HANDLED.has(event.type))return new Response("ignored",{status:200});
 try{
  const obj=event.data.object as unknown as Record<string,unknown>;
  let subId:string|undefined;
  if(event.type.startsWith("customer.subscription."))subId=typeof obj.id==="string"?obj.id:undefined;
  else if(event.type==="checkout.session.completed")subId=typeof obj.subscription==="string"?obj.subscription:undefined;
  else {
   const parent=obj.parent as Record<string,unknown>|undefined;
   const details=parent?.subscription_details as Record<string,unknown>|undefined;
   const sub=details?.subscription;
   subId=typeof sub==="string"?sub:(sub && typeof sub==="object"?String((sub as Record<string,unknown>).id||""):undefined);
  }
  if(!subId?.startsWith("sub_"))return no("Subscription reference unavailable",422);
  // Fetch current Stripe subscription to avoid stale out-of-order event payloads.
  const subscription=await stripe.subscriptions.retrieve(subId);
  const matching=subscription.items.data.find(item=>item.price.id===PRICE_ID);
  if(!matching)return no("Subscription price does not match DD approved price",422);
  const ownerId=subscription.metadata.dd_owner_id;
  if(!/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(ownerId||""))return no("Missing account link",422);
  const customerId=typeof subscription.customer==="string"?subscription.customer:subscription.customer.id;
  const currentPeriodEnd=matching.current_period_end;
  const periodEnd=typeof currentPeriodEnd==="number"?new Date(currentPeriodEnd*1000).toISOString():null;
  const res=await fetch(supabaseUrl+"/rest/v1/rpc/dd_apply_verified_stripe_event",{
   method:"POST",
   headers:{apikey:serviceKey,authorization:"Bearer "+serviceKey,"Content-Type":"application/json"},
   body:JSON.stringify({
    p_event_id:event.id,p_event_type:event.type,p_event_created:event.created,
    p_owner_id:ownerId,p_customer_id:customerId,p_subscription_id:subscription.id,
    p_price_id:PRICE_ID,p_status:subscription.status,p_period_end:periodEnd,
    p_cancel_at_period_end:subscription.cancel_at_period_end
   })
  });
  if(!res.ok)return no("Billing event persistence unavailable",503);
  return new Response("ok",{status:200});
 }catch {
  // Stripe retries transient processing errors. Do not log raw webhook or customer info.
  return no("Billing event not processed",503);
 }
});
