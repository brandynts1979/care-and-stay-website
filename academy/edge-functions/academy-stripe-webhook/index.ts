import { acceptsWebhookMode, isQsrSandbox, validSandboxSubscription } from "../_shared/qsr-sandbox-policy.mjs";
import { industryOfferForLocation, acceptsIndustryWebhookMode, validIndustrySubscription, validIndustryCheckoutConsent } from "../_shared/industry-offer-policy.mjs";
import { createClient } from "npm:@supabase/supabase-js@2.57.0";
import Stripe from "npm:stripe@17.7.0";

const env=(k:string)=>Deno.env.get(k)||"";
const admin=createClient(env("SUPABASE_URL"),env("SUPABASE_SERVICE_ROLE_KEY"),{auth:{persistSession:false}});
const stripe=env("STRIPE_SECRET_KEY") ? new Stripe(env("STRIPE_SECRET_KEY")) : null;
const respond=(status:number,payload:unknown)=>new Response(JSON.stringify(payload),{status,headers:{"Content-Type":"application/json","Cache-Control":"no-store"}});
const subEnd=(s:any,approvedPrice:string)=>{
 const matching=(s.items?.data||[]).filter((item:any)=>item.price?.id===approvedPrice);
 const values=matching.map((item:any)=>item.current_period_end??s.current_period_end);
 if(!values.length||values.some((v:any)=>!Number.isSafeInteger(v)||v<=0))return null;
 return new Date(Math.min(...values)*1000).toISOString();
};
async function updateLocation(subscription:Stripe.Subscription,event:Stripe.Event,session:Stripe.Checkout.Session|null){
 // Resolve linked subscriptions first. Initial binding requires recorded paid Checkout, never metadata alone.
 const {data:linked,error:linkError}=await admin.from("academy_locations").select("id,billing_revision,stripe_subscription_id").eq("stripe_subscription_id",subscription.id).maybeSingle();
 if(linkError)throw linkError;
 const locationId=linked?.id||session?.metadata?.academy_location_id;
 if(!linked&&!session)return false;
 if(!locationId)return false;
 if(!/^[0-9a-f-]{36}$/i.test(locationId))throw new Error("Invalid Academy location reference");
 const {data:loc,error:locError}=await admin.from("academy_locations").select("id,billing_revision,stripe_subscription_id").eq("id",locationId).single();
 if(locError||!loc)throw new Error("Academy location not found");
 if(loc.stripe_subscription_id&&loc.stripe_subscription_id!==subscription.id)throw new Error("Subscription does not match existing location");
 const offer=await industryOfferForLocation(admin,locationId);
 if(offer?!acceptsIndustryWebhookMode(env,event)||offer.livemode!==event.livemode:!acceptsWebhookMode(env,event))throw new Error("Stripe event not enabled for this route");
 const approvedPrice=offer?offer.price_id:env("ACADEMY_STRIPE_PRICE_ID");
 if(!approvedPrice)throw new Error("Approved Academy price not configured");
 // Read the revision before fetching current Stripe state; a competing update forces a retry.
 const current=await stripe!.subscriptions.retrieve(subscription.id);
 if(current.metadata?.academy_location_id&&current.metadata.academy_location_id!==locationId)throw new Error("Subscription location mismatch");
 if(!approvedPrice||!(current.items?.data||[]).some((item:any)=>item.price?.id===approvedPrice)){
   // A linked subscription that loses the approved product must not keep access.
   if(!linked)throw new Error("Stripe subscription does not contain the approved Academy price");
 }
 const hasPrice=offer?validIndustrySubscription(current,offer):(current.items?.data||[]).some((item:any)=>item.price?.id===approvedPrice) && (!isQsrSandbox(env)||validSandboxSubscription(current));
 if(!hasPrice&&!linked)throw new Error("Unverified subscription price or quantity");
 const status=!hasPrice||current.status==="incomplete_expired"?"canceled":current.status;
 const args={
   p_location:locationId,p_revision:loc.billing_revision,p_event_id:event.id,p_event_type:event.type,
   p_subscription:current.id,p_customer:typeof current.customer==="string"?current.customer:current.customer.id,
   p_status:status,p_period_end:subEnd(current,approvedPrice)
 };
 let reconciliation;
 if(!linked){
   const meta=session!.metadata||{};
   const sessionCustomer=typeof session!.customer==="string"?session!.customer:session!.customer?.id;
   if(!sessionCustomer||sessionCustomer!==args.p_customer||session!.client_reference_id!==locationId||!meta.academy_checkout_attempt_id||!meta.academy_owner_id||current.metadata?.academy_checkout_attempt_id!==meta.academy_checkout_attempt_id||current.metadata?.academy_owner_id!==meta.academy_owner_id)throw new Error("Unverified Academy Checkout binding");
   if(offer&&!validIndustryCheckoutConsent(session,current,offer))throw new Error("Unverified industry offer or terms acceptance");
   const binding={...args,p_attempt:meta.academy_checkout_attempt_id,p_session:session!.id,p_owner:meta.academy_owner_id,p_price:approvedPrice};
   reconciliation=offer?await admin.rpc("academy_industry_bind_checkout_atomic",{...binding,p_livemode:event.livemode}):await admin.rpc("academy_bind_checkout_atomic",binding);
 }else reconciliation=offer?await admin.rpc("academy_industry_reconcile_subscription_atomic",{...args,p_price:approvedPrice,p_livemode:event.livemode}):await admin.rpc("academy_reconcile_subscription_atomic",args);
 const {data:result,error}=reconciliation;
 if(error)throw error;
 if(result!=="applied"&&result!=="duplicate")throw new Error("Academy reconciliation: "+String(result));
 return true;
}

// Resolve risk signals from authoritative Stripe objects. Pinned legacy SDK invoice
// linkage is supported; unresolvable links go to operator review, never metadata guessing.
const objectId=(v:any):string|null=>typeof v==="string"?v:typeof v?.id==="string"?v.id:null;
async function recordRisk(event:Stripe.Event){
 const object=event.data.object as any;
 const chargeId=event.type==="charge.refunded"?objectId(object):objectId(object.charge);
 if(!chargeId)throw new Error("Stripe risk signal missing charge ID");
 const charge=await stripe!.charges.retrieve(chargeId);
 let invoiceId=objectId((charge as any).invoice);
 if(!invoiceId&&charge.payment_intent){
   const intent=await stripe!.paymentIntents.retrieve(objectId(charge.payment_intent)!);
   invoiceId=objectId((intent as any).invoice);
 }
 let subscriptionId:string|null=null;
 let customerId=objectId(charge.customer);
 if(invoiceId){
   const invoice=await stripe!.invoices.retrieve(invoiceId);
   subscriptionId=objectId((invoice as any).parent?.subscription_details?.subscription??(invoice as any).subscription);
   const invoiceCustomer=objectId(invoice.customer);
   if(!customerId||!invoiceCustomer||customerId!==invoiceCustomer)customerId=null;
 }
 const {data,error}=await admin.rpc("academy_record_billing_risk",{
   p_event:event.id,p_type:event.type,p_charge:chargeId,p_invoice:invoiceId,p_subscription:subscriptionId,p_customer:customerId
 });
 if(error)throw error;
 if(!["matched","unresolved","duplicate"].includes(String(data)))throw new Error("Risk inbox reconciliation failed");
 if(data!=="duplicate")console.warn("Academy billing risk review required",event.id,String(data));
}

Deno.serve(async(req:Request)=>{
 if(req.method!=="POST")return respond(405,{error:"Method not allowed"});
 const sig=req.headers.get("stripe-signature");
 if(!sig||!env("STRIPE_WEBHOOK_SECRET")||!stripe)
   return respond(400,{error:"Webhook signature unavailable"});
 let event:Stripe.Event;
 try{
  const raw=await req.text();
  event=await stripe!.webhooks.constructEventAsync(raw,sig,env("STRIPE_WEBHOOK_SECRET"),undefined,Stripe.createSubtleCryptoProvider());
 }catch(e){console.error("Invalid Academy Stripe signature");return respond(400,{error:"Invalid signature"});}
 if(!acceptsWebhookMode(env,event)&&!acceptsIndustryWebhookMode(env,event))return respond(400,{error:"Stripe event mode not enabled"});
 // Only events from a subscription tagged with a location ID can affect an Academy location.
 try{
  const {data:existing,error:lookup}=await admin.from("academy_billing_events").select("processed_at").eq("stripe_event_id",event.id).maybeSingle();
  if(lookup)throw lookup;
  if(existing?.processed_at)return respond(200,{received:true,duplicate:true});
  if(["charge.dispute.created","charge.refunded","radar.early_fraud_warning.created"].includes(event.type)){
    await recordRisk(event);return respond(200,{received:true,risk_review:true});
  }
  let subscription:Stripe.Subscription|null=null;
  let checkout:Stripe.Checkout.Session|null=null;
  switch(event.type){
   case "checkout.session.completed":
   case "checkout.session.async_payment_succeeded":{
    const session=event.data.object as Stripe.Checkout.Session;
    if(session.mode==="subscription"&&session.subscription&&["paid","no_payment_required"].includes(session.payment_status)){
     const verified=await stripe!.checkout.sessions.retrieve(session.id);
     if(verified.livemode!==event.livemode||verified.mode!=="subscription"||verified.status!=="complete"||!verified.subscription||!["paid","no_payment_required"].includes(verified.payment_status))throw new Error("Checkout payment not verified");
     checkout=verified;subscription=await stripe!.subscriptions.retrieve(typeof verified.subscription==="string"?verified.subscription:verified.subscription.id);
    }
    break;
   }
   case "customer.subscription.created":
   case "customer.subscription.updated":
   case "customer.subscription.deleted":
    subscription=event.data.object as Stripe.Subscription;break;
   case "invoice.paid":
   case "invoice.payment_failed":{
    const invoice=event.data.object as Stripe.Invoice;
    const id=(invoice as any).parent?.subscription_details?.subscription??(invoice as any).subscription;
    if(id)subscription=await stripe.subscriptions.retrieve(typeof id==="string"?id:id.id);
    break;
   }
  }
  if(subscription&&await updateLocation(subscription,event,checkout))return respond(200,{received:true});
  // A non-Academy or unsupported event must not mutate the enrollment system.
  // Do not claim it was reconciled or consume the event ID before a relevant event is applied.
  return respond(200,{received:true});
 }catch(e:any){
  console.error("Academy webhook processing failed",e?.message);
  // The transaction owns successful event completion. Retryable failures are not marked processed.
  return respond(500,{error:"Retry webhook delivery"});
 }
});
