import { createClient } from "npm:@supabase/supabase-js@2.57.0";
import Stripe from "npm:stripe@17.7.0";

const env=(k:string)=>Deno.env.get(k)||"";
const admin=createClient(env("SUPABASE_URL"),env("SUPABASE_SERVICE_ROLE_KEY"),{auth:{persistSession:false}});
const stripe=new Stripe(env("STRIPE_SECRET_KEY"));
const respond=(status:number,payload:unknown)=>new Response(JSON.stringify(payload),{status,headers:{"Content-Type":"application/json","Cache-Control":"no-store"}});
const active=(status:string)=>["active","trialing"].includes(status);
const subEnd=(s:any)=>s.current_period_end?new Date(s.current_period_end*1000).toISOString():null;
async function updateLocation(subscription:any){
 const locationId=subscription.metadata?.academy_location_id;
 if(!locationId || !/^[0-9a-f-]{36}$/i.test(locationId))throw new Error("Subscription missing Academy location reference");
 const {data:location,error:findError}=await admin.from("academy_locations").select("id,billing_owner_id,stripe_subscription_id").eq("id",locationId).single();
 if(findError||!location)throw new Error("Academy location not found");
 if(location.stripe_subscription_id && location.stripe_subscription_id!==subscription.id)throw new Error("Subscription does not match existing location");
 const {error}=await admin.from("academy_locations").update({
  stripe_customer_id:typeof subscription.customer==="string"?subscription.customer:subscription.customer?.id,
  stripe_subscription_id:subscription.id,subscription_status:subscription.status,
  current_period_end:subEnd(subscription)
 }).eq("id",locationId);
 if(error)throw error;
 const {data:enrollments,error:readError}=await admin.from("academy_enrollments").select("id,status").eq("location_id",locationId);
 if(readError)throw readError;
 if(!active(subscription.status)){
  for(const e of enrollments||[]){
   if(e.status==="completed")continue;
   const {error:revokeError}=await admin.from("academy_enrollments").update({
    status:"revoked",expires_at:subEnd(subscription)||new Date().toISOString()
   }).eq("id",e.id);
   if(revokeError)throw revokeError;
  }
  return;
 }
 // One owner subscription funds any number of employees at this one location.
 const {data:members,error:memberError}=await admin.from("academy_location_members").select("user_id")
   .eq("location_id",locationId).eq("active",true);
 if(memberError)throw memberError;
 const {data:courses,error:courseError}=await admin.from("academy_courses").select("id").eq("published",true);
 if(courseError)throw courseError;
 for(const member of members||[])for(const course of courses||[]){
  const {data:existing,error:exError}=await admin.from("academy_enrollments").select("id,status")
   .eq("location_id",locationId).eq("user_id",member.user_id).eq("course_id",course.id).maybeSingle();
  if(exError)throw exError;
  if(existing){
   const {error:upError}=await admin.from("academy_enrollments").update({
    status:existing.status==="completed"?"completed":"active",expires_at:null,
    stripe_subscription_id:subscription.id
   }).eq("id",existing.id);
   if(upError)throw upError;
  }else{
   const {error:inError}=await admin.from("academy_enrollments").insert({
    location_id:locationId,user_id:member.user_id,course_id:course.id,
    stripe_subscription_id:subscription.id,status:"active",
    granted_at:new Date().toISOString()
   });
   if(inError)throw inError;
  }
 }
}
Deno.serve(async(req:Request)=>{
 if(req.method!=="POST")return respond(405,{error:"Method not allowed"});
 const sig=req.headers.get("stripe-signature");
 if(!sig||!env("STRIPE_WEBHOOK_SECRET")||!env("STRIPE_SECRET_KEY"))
   return respond(400,{error:"Webhook signature unavailable"});
 let event:Stripe.Event;
 try{
  const raw=await req.text();
  event=await stripe.webhooks.constructEventAsync(raw,sig,env("STRIPE_WEBHOOK_SECRET"),undefined,Stripe.createSubtleCryptoProvider());
 }catch(e){console.error("Invalid Academy Stripe signature");return respond(400,{error:"Invalid signature"});}
 // Only events from a subscription tagged with a location ID can affect an Academy location.
 try{
  const {data:existing,error:lookup}=await admin.from("academy_billing_events").select("processed_at").eq("stripe_event_id",event.id).maybeSingle();
  if(lookup)throw lookup;
  if(existing?.processed_at)return respond(200,{received:true,duplicate:true});
  if(!existing){
   const {error:insertError}=await admin.from("academy_billing_events").insert({stripe_event_id:event.id,event_type:event.type});
   if(insertError?.code==="23505")return respond(409,{error:"Event already being processed"});
   if(insertError)throw insertError;
  }
  let subscription:Stripe.Subscription|null=null;
  switch(event.type){
   case "checkout.session.completed":{
    const session=event.data.object as Stripe.Checkout.Session;
    if(session.mode==="subscription"&&session.subscription)
     subscription=await stripe.subscriptions.retrieve(typeof session.subscription==="string"?session.subscription:session.subscription.id);
    break;
   }
   case "customer.subscription.created":
   case "customer.subscription.updated":
   case "customer.subscription.deleted":
    subscription=event.data.object as Stripe.Subscription;break;
   case "invoice.paid":
   case "invoice.payment_failed":{
    const invoice=event.data.object as Stripe.Invoice;
    const id=(invoice as any).subscription;
    if(id)subscription=await stripe.subscriptions.retrieve(typeof id==="string"?id:id.id);
    break;
   }
  }
  if(subscription && subscription.metadata?.academy_location_id){
    // Retrieve current state to avoid older webhook events reinstating expired access.
    const current=await stripe.subscriptions.retrieve(subscription.id);
    await updateLocation(current);
  }
  const {error:finish}=await admin.from("academy_billing_events")
   .update({processed_at:new Date().toISOString(),processing_error:null})
   .eq("stripe_event_id",event.id);
  if(finish)throw finish;
  return respond(200,{received:true});
 }catch(e:any){
  console.error("Academy webhook processing failed",e?.message);
  await admin.from("academy_billing_events").update({processing_error:String(e?.message||"failed").slice(0,300)})
   .eq("stripe_event_id",event.id);
  return respond(500,{error:"Retry webhook delivery"});
 }
});
