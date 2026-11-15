import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "npm:stripe@20.2.0";

/**
 * DD Parent App Stripe webhook. Launch-safe default: DISABLED.
 * This endpoint never trusts event payload claims without Stripe signature
 * validation and a fresh server-to-server subscription lookup.
 *
 * Required launch secrets (not included in source):
 * STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, DD_BILLING_RELEASE_APPROVED=true
 *
 * Only activate after tax readiness, access enforcement and full sandbox tests.
 */
const PRICE_ID = Deno.env.get("DD_STRIPE_PRICE_ID") || "price_1Ubr0GHU2Vcv1mFQgOfj2Ww8";
const enabled = Deno.env.get("DD_BILLING_RELEASE_APPROVED") === "true";
// Sandbox requires its own Stripe test key, webhook secret and DD_STRIPE_PRICE_ID.
// This function is never activated merely by deployment.
const json = (code:number, body:Record<string,unknown>) =>
  new Response(JSON.stringify(body), { status:code, headers:{"Content-Type":"application/json","Cache-Control":"no-store"} });
const uuid = (v:unknown):v is string => typeof v === "string" &&
 /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(v);

Deno.serve(async (req:Request) => {
 if(req.method !== "POST") return json(405,{error:"Method not allowed"});
 if(!enabled) return json(503,{error:"DD subscriptions not launched"});
 const secret=Deno.env.get("STRIPE_WEBHOOK_SECRET");
 const key=Deno.env.get("STRIPE_SECRET_KEY");
 const url=Deno.env.get("SUPABASE_URL");
 const service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
 if(!secret||!key||!url||!service) return json(503,{error:"Billing not configured"});
 const stripe = new Stripe(key);
 const signature=req.headers.get("stripe-signature")||"";
 let event:Stripe.Event;
 try {
   event=await stripe.webhooks.constructEventAsync(await req.text(),signature,secret);
 } catch {return json(400,{error:"Invalid signature"});}
 const relevant = new Set([
 "checkout.session.completed","customer.subscription.created",
 "customer.subscription.updated","customer.subscription.deleted",
 "invoice.paid","invoice.payment_failed"
 ]);
 if(!relevant.has(event.type))return json(200,{received:true,ignored:true});
 // Only subscriptions created by the app with both a valid owner and price may
 // establish an entitlement. A customer ID or email alone never grants access.
 try {
  const obj=event.data.object as unknown as Record<string,unknown>;
  let subscriptionId:string|null=null;
  if(event.type.startsWith("customer.subscription.")) subscriptionId=String(obj.id||"");
  else if(event.type==="checkout.session.completed"){
    if(obj.mode!=="subscription") return json(200,{received:true,ignored:true});
    subscriptionId=typeof obj.subscription==="string"?obj.subscription:null;
  } else {
    const parent=obj.parent as {subscription_details?:{subscription?:string}}|undefined;
    subscriptionId=parent?.subscription_details?.subscription||
      (typeof obj.subscription==="string"?obj.subscription:null);
  }
  if(!subscriptionId?.startsWith("sub_"))return json(200,{received:true,ignored:true});
  const sub=await stripe.subscriptions.retrieve(subscriptionId);
  const owner=sub.metadata?.dd_owner_id;
  const rightPrice=sub.items.data.some(x=>x.price.id===PRICE_ID);
  if(!uuid(owner)||sub.metadata?.care_stay_product!=="dd_parent_app"||!rightPrice)
    return json(200,{received:true,ignored:true});
  const customer=typeof sub.customer==="string"?sub.customer:sub.customer.id;
  if(!customer.startsWith("cus_"))return json(200,{received:true,ignored:true});
  // Use the current subscription state rather than event order for recovery.
  const lastPeriod=Math.max(0,...sub.items.data.filter(x=>x.price.id===PRICE_ID).map(x=>x.current_period_end||0));
  const end=lastPeriod?new Date(lastPeriod*1000).toISOString():null;
  const hdr={apikey:service,Authorization:"Bearer "+service,"Content-Type":"application/json",
    Prefer:"resolution=merge-duplicates,return=minimal"};
  // Previous subscription ownership cannot be silently reassigned.
  const conflicts=await fetch(url+"/rest/v1/dd_subscription_entitlements?stripe_subscription_id=eq."+encodeURIComponent(sub.id)+"&select=owner_id",{headers:hdr});
  if(!conflicts.ok)throw Error("Cannot verify entitlement owner");
  const owners=await conflicts.json();
  if(owners.length && owners[0].owner_id!==owner)
    return json(409,{error:"Subscription ownership conflict"});
  const prior=await fetch(url+"/rest/v1/dd_subscription_entitlements?owner_id=eq."+encodeURIComponent(owner)+"&select=stripe_subscription_id",{headers:hdr});
  if(!prior.ok)throw Error("Cannot verify existing subscription");
  const existing=await prior.json();
  if(existing.length && existing[0].stripe_subscription_id && existing[0].stripe_subscription_id!==sub.id)
    return json(409,{error:"Existing subscription requires reconciliation"});
  const record={
   owner_id:owner,stripe_customer_id:customer,stripe_subscription_id:sub.id,
   stripe_price_id:PRICE_ID,status:sub.status,current_period_end:end,
   cancel_at_period_end:sub.cancel_at_period_end,updated_at:new Date().toISOString()
  };
  const update=await fetch(url+"/rest/v1/dd_subscription_entitlements?on_conflict=owner_id",
   {method:"POST",headers:hdr,body:JSON.stringify(record)});
  if(!update.ok)throw Error("Entitlement update failed");
  // Event log is diagnostic only; entitlement updates are idempotent.
  const logged=await fetch(url+"/rest/v1/dd_stripe_webhook_events?on_conflict=stripe_event_id",
   {method:"POST",headers:hdr,body:JSON.stringify({
      stripe_event_id:event.id,stripe_event_type:event.type,
      stripe_event_created:event.created,customer_id:customer,
      subscription_id:sub.id,outcome:"applied"
   })});
  if(!logged.ok)throw Error("Event log write failed");
  return json(200,{received:true});
 }catch(e){
  console.error("DD webhook reconciliation error",e instanceof Error?e.message:"unknown");
  return json(500,{error:"Reconciliation failed; Stripe should retry"});
 }
});
