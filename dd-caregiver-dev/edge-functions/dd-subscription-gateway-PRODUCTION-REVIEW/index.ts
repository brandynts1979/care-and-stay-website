// DD Parent App — production-capable checkout draft. NOT DEPLOYED.
// The deployed dd-subscription-gateway has checkout disabled. This file is
// retained for security/legal/tax review and end-to-end sandbox integration.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "npm:stripe@22.0.0";

const CHECKOUT_RELEASE_APPROVED = false; // Mandatory fail-closed release gate.
const PRICE_ID = "price_1Ubr0GHU2Vcv1mFQgOfj2Ww8";
const BASE = "https://mycareandstay.com";
const ORIGIN = "https://care-and-stay-dd-caregiver-dev.onrender.com";
const cors = {
  "Access-Control-Allow-Origin":ORIGIN,
  "Access-Control-Allow-Headers":"apikey,authorization,content-type",
  "Access-Control-Allow-Methods":"POST,OPTIONS",
  "Cache-Control":"no-store","Vary":"Origin","Content-Type":"application/json"
};
function result(code:number, obj:Record<string,unknown>) {
 return new Response(JSON.stringify(obj),{status:code,headers:cors});
}
const idPattern=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
Deno.serve(async(req:Request)=>{
 if(req.headers.get("origin")!==ORIGIN)return result(403,{error:"Unapproved origin"});
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers:cors});
 if(req.method!=="POST")return result(405,{error:"Unsupported method"});
 const jwt=req.headers.get("authorization")||"";
 if(!jwt.startsWith("Bearer "))return result(401,{error:"Sign-in required"});
 const url=Deno.env.get("SUPABASE_URL");
 const anon=Deno.env.get("SUPABASE_ANON_KEY");
 const service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
 if(!url||!anon||!service)return result(503,{error:"Billing service unavailable"});
 try{
  const auth=await fetch(url+"/auth/v1/user",{headers:{apikey:anon,authorization:jwt}});
  if(!auth.ok)return result(401,{error:"Invalid or expired session"});
  const user=await auth.json();
  if(!idPattern.test(user.id||"")||!user.email_confirmed_at)return result(401,{error:"Verified account required"});
  const input=await req.json().catch(()=>null);
  if(!input||!["status","checkout","portal"].includes(input.action))return result(400,{error:"Invalid action"});
  const serviceHeaders={apikey:service,authorization:"Bearer "+service};
  const lookup=await fetch(url+"/rest/v1/dd_subscription_entitlements?owner_id=eq."+user.id+"&select=status,stripe_customer_id,stripe_price_id,current_period_end,cancel_at_period_end&limit=1",{headers:serviceHeaders});
  if(!lookup.ok)return result(503,{error:"Billing state unavailable"});
  const rows=await lookup.json();
  const record=rows?.[0]||null;
  const current=record?.current_period_end && new Date(record.current_period_end).getTime()>Date.now();
  const entitled=CHECKOUT_RELEASE_APPROVED&&record?.stripe_price_id===PRICE_ID&&Boolean(current)&&["active","trialing"].includes(record?.status);
  if(input.action==="status")return result(200,{subscription_status:record?.status||"none",entitled,checkout_enabled:CHECKOUT_RELEASE_APPROVED});
  // Release gate checked BEFORE any request to Stripe: cannot create customer,
  // Checkout Session, card-collection URL or billing portal in development.
  if(!CHECKOUT_RELEASE_APPROVED)return result(503,{error:"Subscriptions are not available yet",checkout_enabled:false});

  const stripeKey=Deno.env.get("STRIPE_SECRET_KEY");
  if(!stripeKey||!stripeKey.startsWith("sk_live_"))return result(503,{error:"Live payment credentials not configured"});
  const stripe=new Stripe(stripeKey);
  let customerId=record?.stripe_customer_id;
  if(customerId){
    const customer=await stripe.customers.retrieve(customerId);
    if((customer as Stripe.DeletedCustomer).deleted)return result(409,{error:"Billing customer no longer exists"});
    if((customer as Stripe.Customer).metadata?.dd_owner_id!==user.id)return result(403,{error:"Billing account mismatch"});
  }
  if(input.action==="portal"){
    if(!customerId)return result(404,{error:"No billing account exists"});
    const portal=await stripe.billingPortal.sessions.create({customer:customerId,return_url:BASE+"/dd-family-care/"});
    return result(200,{url:portal.url});
  }
  if(record && ["active","trialing","past_due","unpaid","incomplete"].includes(record.status)){
    return result(409,{error:"Subscription already exists; use billing management"});
  }
  if(!customerId){
    // Never take customer identifier from the browser.
    const c=await stripe.customers.create({email:user.email,metadata:{dd_owner_id:user.id,care_stay_product:"dd_parent_app"}});
    customerId=c.id;
    const saved=await fetch(url+"/rest/v1/dd_subscription_entitlements",{
      method:"POST",headers:{...serviceHeaders,"Content-Type":"application/json",Prefer:"resolution=merge-duplicates,return=minimal"},
      body:JSON.stringify({owner_id:user.id,stripe_customer_id:customerId,status:"none",stripe_price_id:PRICE_ID})
    });
    if(!saved.ok)return result(503,{error:"Unable to link billing account"});
  }
  const price=await stripe.prices.retrieve(PRICE_ID);
  if(!price.active||price.unit_amount!==3900||price.currency!=="usd"||
     price.type!=="recurring"||price.recurring?.interval!=="month"||
     price.product!=="prod_Vcl3ez86uLhNFb"||price.tax_behavior!=="exclusive"){
    return result(503,{error:"Approved subscription price is not active"});
  }
  const checkout=await stripe.checkout.sessions.create({
    mode:"subscription",customer:customerId,
    line_items:[{price:PRICE_ID,quantity:1}],
    automatic_tax:{enabled:true},billing_address_collection:"required",
    subscription_data:{metadata:{dd_owner_id:user.id,care_stay_product:"dd_parent_app"}},
    client_reference_id:user.id,
    success_url:BASE+"/dd-family-care/?checkout=complete&session_id={CHECKOUT_SESSION_ID}",
    cancel_url:BASE+"/dd-family-care/?checkout=cancelled"
  });
  return result(200,{url:checkout.url});
 }catch {
  return result(503,{error:"Billing action temporarily unavailable"});
 }
});
