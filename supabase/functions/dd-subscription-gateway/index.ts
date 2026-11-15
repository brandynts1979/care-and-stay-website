import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "npm:stripe@20.2.0";

/** DD billing gateway: checkout is fail-closed until explicitly approved. */
const ORIGINS = new Set([
  "https://care-and-stay-dd-caregiver-dev.onrender.com",
  "https://care-and-stay-website.onrender.com",
  "https://mycareandstay.com",
  "https://www.mycareandstay.com"
]);
const LIVE_PRICE = "price_1Ubr0GHU2Vcv1mFQgOfj2Ww8";
const release = Deno.env.get("DD_BILLING_RELEASE_APPROVED") === "true";
const priceId = Deno.env.get("DD_STRIPE_PRICE_ID") || LIVE_PRICE;
function answer(code:number, data:Record<string,unknown>, origin:string){
 return new Response(JSON.stringify(data),{status:code,headers:{
  "Content-Type":"application/json","Cache-Control":"no-store","Vary":"Origin",
  ...(ORIGINS.has(origin)?{"Access-Control-Allow-Origin":origin}:{})
 }});
}
async function backend(base:string,key:string,path:string,method="GET",body?:unknown){
 const r=await fetch(base+path,{method,headers:{apikey:key,Authorization:"Bearer "+key,"Content-Type":"application/json",
   Prefer:"resolution=merge-duplicates,return=representation"},
   body:body===undefined?undefined:JSON.stringify(body)});
 if(!r.ok)throw Error("Private database request failed");
 return r.status===204?null:await r.json();
}
function returnUrl(origin:string){
 if(origin==="https://mycareandstay.com"||origin==="https://www.mycareandstay.com")return "https://mycareandstay.com/dd-family-care/";
 if(origin==="https://care-and-stay-website.onrender.com")return origin+"/dd-caregiver-dev/";
 return "https://care-and-stay-dd-caregiver-dev.onrender.com/";
}
Deno.serve(async(req:Request)=>{
 const origin=req.headers.get("origin")||"";
 if(!ORIGINS.has(origin))return answer(403,{error:"Origin not permitted"},origin);
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers:{
  "Access-Control-Allow-Origin":origin,"Access-Control-Allow-Headers":"authorization, apikey, content-type",
  "Access-Control-Allow-Methods":"POST, OPTIONS","Vary":"Origin"}});
 if(req.method!=="POST")return answer(405,{error:"Method not allowed"},origin);
 const auth=req.headers.get("authorization")||"";
 if(!/^Bearer\s+[^\s]+$/.test(auth))return answer(401,{error:"Authentication required"},origin);
 const base=Deno.env.get("SUPABASE_URL");
 const anon=Deno.env.get("SUPABASE_ANON_KEY");
 const service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
 if(!base||!anon||!service)return answer(503,{error:"Billing service unavailable"},origin);
 try{
  const check=await fetch(base+"/auth/v1/user",{headers:{apikey:anon,Authorization:auth}});
  if(!check.ok)return answer(401,{error:"Session invalid"},origin);
  const user=await check.json() as {id?:string,email?:string,email_confirmed_at?:string};
  if(!user.id||!user.email_confirmed_at)return answer(403,{error:"Verified account required"},origin);
  let action:unknown;
  try{const request=await req.json();action=request?.action;}catch{return answer(400,{error:"Invalid request"},origin);}
  if(action!=="status"&&action!=="checkout"&&action!=="portal")return answer(400,{error:"Unsupported action"},origin);
  const records=await backend(base,service,"/rest/v1/dd_subscription_entitlements?owner_id=eq."+
   encodeURIComponent(user.id)+"&select=stripe_customer_id,stripe_subscription_id,stripe_price_id,status,current_period_end,cancel_at_period_end&limit=1");
  const record=Array.isArray(records)?records[0]:null;
  const validPrice=record?.stripe_price_id===priceId;
  const current=typeof record?.current_period_end==="string"&&Date.parse(record.current_period_end)>Date.now();
  const entitled=release&&validPrice&&current&&["active","trialing"].includes(record?.status||"");
  if(action==="status")return answer(200,{product:"dd_parent_app",monthly_price_usd:39,
   tax_behavior:"exclusive",checkout_enabled:release,subscription_status:record?.status||"none",
   cancel_at_period_end:Boolean(record?.cancel_at_period_end),entitled:Boolean(entitled)},origin);
  if(!release)return answer(503,{error:"Subscriptions are not yet available",checkout_enabled:false},origin);
  const secret=Deno.env.get("STRIPE_SECRET_KEY");
  if(!secret)return answer(503,{error:"Billing processor unavailable"},origin);
  const stripe=new Stripe(secret);
  // Validate that the configured price is a currently active $39 monthly DD price
  // in the same Stripe account/mode before allowing a charge.
  const price=await stripe.prices.retrieve(priceId);
  if(!price.active||price.currency!=="usd"||price.unit_amount!==3900||
     price.recurring?.interval!=="month"||price.recurring?.interval_count!==1||
     price.tax_behavior!=="exclusive")
    return answer(503,{error:"Approved price unavailable"},origin);
  if(action==="portal"){
   if(!record?.stripe_customer_id)return answer(409,{error:"No active billing profile"},origin);
   const customer=await stripe.customers.retrieve(record.stripe_customer_id);
   if(customer.deleted||customer.metadata?.dd_owner_id!==user.id)
     return answer(403,{error:"Billing profile mismatch"},origin);
   const portal=await stripe.billingPortal.sessions.create({customer:customer.id,return_url:returnUrl(origin)});
   return answer(200,{url:portal.url},origin);
  }
  if(record?.stripe_subscription_id&&["active","trialing","past_due","unpaid","incomplete"].includes(record?.status||""))
   return answer(409,{error:"An existing subscription must be managed, not duplicated"},origin);
  let customerId=record?.stripe_customer_id;
  if(customerId){
   const customer=await stripe.customers.retrieve(customerId);
   if(customer.deleted||customer.metadata?.dd_owner_id!==user.id)
     return answer(403,{error:"Billing profile mismatch"},origin);
  }else{
   const customer=await stripe.customers.create({email:user.email,
     metadata:{dd_owner_id:user.id,care_stay_product:"dd_parent_app"}},
     {idempotencyKey:"dd-customer-"+user.id});
   customerId=customer.id;
   await backend(base,service,"/rest/v1/dd_subscription_entitlements?on_conflict=owner_id","POST",
     {owner_id:user.id,stripe_customer_id:customerId,status:"none"});
  }
  const session=await stripe.checkout.sessions.create({
    mode:"subscription",customer:customerId,
    client_reference_id:user.id,
    line_items:[{price:priceId,quantity:1}],
    automatic_tax:{enabled:true},billing_address_collection:"required",
    customer_update:{address:"auto"},
    subscription_data:{metadata:{dd_owner_id:user.id,care_stay_product:"dd_parent_app"}},
    success_url:returnUrl(origin)+"?billing=success",
    cancel_url:returnUrl(origin)+"?billing=cancelled",
  },{idempotencyKey:"dd-checkout-"+user.id+"-"+Math.floor(Date.now()/300000)});
  return answer(200,{url:session.url},origin);
 }catch(e){console.error("DD billing gateway:",e instanceof Error?e.message:"unknown");
  return answer(503,{error:"Billing temporarily unavailable"},origin);}
});
