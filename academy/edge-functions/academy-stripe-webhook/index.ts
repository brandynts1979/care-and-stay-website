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
async function updateLocation(subscription:Stripe.Subscription,event:Stripe.Event){
 const approvedPrice=env("ACADEMY_STRIPE_PRICE_ID");
 // Resolve linked subscription first; metadata is only the initial binding fallback.
 const {data:linked,error:linkError}=await admin.from("academy_locations").select("id,billing_revision,stripe_subscription_id").eq("stripe_subscription_id",subscription.id).maybeSingle();
 if(linkError)throw linkError;
 const locationId=linked?.id||subscription.metadata?.academy_location_id;
 if(!locationId)return false;
 if(!/^[0-9a-f-]{36}$/i.test(locationId))throw new Error("Invalid Academy location reference");
 const {data:loc,error:locError}=await admin.from("academy_locations").select("id,billing_revision,stripe_subscription_id").eq("id",locationId).single();
 if(locError||!loc)throw new Error("Academy location not found");
 if(loc.stripe_subscription_id&&loc.stripe_subscription_id!==subscription.id)throw new Error("Subscription does not match existing location");
 // Read the revision before fetching current Stripe state; a competing update forces a retry.
 const current=await stripe!.subscriptions.retrieve(subscription.id);
 if(current.metadata?.academy_location_id&&current.metadata.academy_location_id!==locationId)throw new Error("Subscription location mismatch");
 if(!approvedPrice||!(current.items?.data||[]).some((item:any)=>item.price?.id===approvedPrice)){
   // A linked subscription that loses the approved product must not keep access.
   if(!linked)throw new Error("Stripe subscription does not contain the approved Academy price");
 }
 const hasPrice=(current.items?.data||[]).some((item:any)=>item.price?.id===approvedPrice);
 const status=!hasPrice||current.status==="incomplete_expired"?"canceled":current.status;
 const {data:result,error}=await admin.rpc("academy_reconcile_subscription_atomic",{
   p_location:locationId,p_revision:loc.billing_revision,p_event_id:event.id,p_event_type:event.type,
   p_subscription:current.id,p_customer:typeof current.customer==="string"?current.customer:current.customer.id,
   p_status:status,p_period_end:subEnd(current,approvedPrice)
 });
 if(error)throw error;
 if(result!=="applied"&&result!=="duplicate")throw new Error("Academy reconciliation: "+String(result));
 return true;
}
Deno.serve(async(req:Request)=>{
 if(req.method!=="POST")return respond(405,{error:"Method not allowed"});
 const sig=req.headers.get("stripe-signature");
 if(!sig||!env("STRIPE_WEBHOOK_SECRET")||!stripe||!env("ACADEMY_STRIPE_PRICE_ID"))
   return respond(400,{error:"Webhook signature unavailable"});
 let event:Stripe.Event;
 try{
  const raw=await req.text();
  event=await stripe!.webhooks.constructEventAsync(raw,sig,env("STRIPE_WEBHOOK_SECRET"),undefined,Stripe.createSubtleCryptoProvider());
 }catch(e){console.error("Invalid Academy Stripe signature");return respond(400,{error:"Invalid signature"});}
 // Only events from a subscription tagged with a location ID can affect an Academy location.
 try{
  const {data:existing,error:lookup}=await admin.from("academy_billing_events").select("processed_at").eq("stripe_event_id",event.id).maybeSingle();
  if(lookup)throw lookup;
  if(existing?.processed_at)return respond(200,{received:true,duplicate:true});
  let subscription:Stripe.Subscription|null=null;
  switch(event.type){
   case "checkout.session.completed":
   case "checkout.session.async_payment_succeeded":{
    const session=event.data.object as Stripe.Checkout.Session;
    if(session.mode==="subscription"&&session.subscription&&["paid","no_payment_required"].includes(session.payment_status))
     subscription=await stripe!.subscriptions.retrieve(typeof session.subscription==="string"?session.subscription:session.subscription.id);
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
  if(subscription&&await updateLocation(subscription,event))return respond(200,{received:true});
  // A non-Academy or unsupported event must not mutate the enrollment system.
  // Do not claim it was reconciled or consume the event ID before a relevant event is applied.
  return respond(200,{received:true});
 }catch(e:any){
  console.error("Academy webhook processing failed",e?.message);
  // The transaction owns successful event completion. Retryable failures are not marked processed.
  return respond(500,{error:"Retry webhook delivery"});
 }
});
