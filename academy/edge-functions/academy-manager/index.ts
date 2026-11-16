import { createClient } from "npm:@supabase/supabase-js@2.57.0";
import Stripe from "npm:stripe@17.7.0";

const env = (k: string) => Deno.env.get(k) || "";
const origin = env("ACADEMY_SITE_ORIGIN").replace(/\/$/,"");
const cors = { "Access-Control-Allow-Origin": origin, "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "authorization, apikey, content-type", "Vary":"Origin" };
const json = (status:number, data:unknown) => new Response(JSON.stringify(data),{status,headers:{...cors,"Content-Type":"application/json","Cache-Control":"no-store"}});
const url=env("SUPABASE_URL"), pub=env("SUPABASE_ANON_KEY"), secret=env("SUPABASE_SERVICE_ROLE_KEY");
const admin=createClient(url,secret,{auth:{persistSession:false}});
const stripe=new Stripe(env("STRIPE_SECRET_KEY"));
const active=(status:string)=>["active","trialing"].includes(status);
const uuid=(s:unknown)=>typeof s==="string" && /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(s);
const cleanEmail=(s:unknown)=>String(s||"").trim().toLowerCase();
const fail=(s:number,m:string):never=>{throw Object.assign(new Error(m),{http:s});};
const unwrap=<T>(r:{data:T|null,error:any})=>{if(r.error)throw r.error;return r.data as T;};
async function authenticate(req:Request){
 const token=(req.headers.get("authorization")||"").replace(/^Bearer\s+/i,"");
 if(!token)fail(401,"Sign in required");
 const {data:{user},error}=await admin.auth.getUser(token);
 if(error||!user||!user.email||!user.email_confirmed_at)fail(401,"Verified email required");
 return user!;
}
async function permission(userId:string,locationId:string){
 const row=unwrap(await admin.from("academy_location_members").select("role,active").eq("user_id",userId).eq("location_id",locationId).maybeSingle()) as {role:string,active:boolean}|null;
 if(!row||!row.active||!["owner","gm"].includes(row.role))fail(403,"Owner or GM permission required");
 return row!.role;
}
async function location(id:string){
 const row=unwrap(await admin.from("academy_locations").select("*").eq("id",id).single()) as any;
 if(!row)fail(404,"Location not found");
 return row;
}
async function grant(userId:string,locationId:string){
 const loc=await location(locationId);
 if(!active(loc.subscription_status))fail(403,"Location subscription not active");
 const {data:courses,error}=await admin.from("academy_courses").select("id").eq("published",true);
 if(error)throw error;
 for(const course of courses||[]){
   const {data:existing,error:readError}=await admin.from("academy_enrollments")
     .select("id,status").eq("location_id",locationId).eq("user_id",userId).eq("course_id",course.id).maybeSingle();
   if(readError)throw readError;
   if(existing){
     const {error:upError}=await admin.from("academy_enrollments").update({
       status:existing.status==="completed"?"completed":"active",
       stripe_subscription_id:loc.stripe_subscription_id,expires_at:null
     }).eq("id",existing.id);
     if(upError)throw upError;
   }else{
     const {error:insError}=await admin.from("academy_enrollments").insert({
       user_id:userId,course_id:course.id,location_id:locationId,
       status:"active",stripe_subscription_id:loc.stripe_subscription_id,granted_at:new Date().toISOString()
     });
     if(insError)throw insError;
   }
 }
}
Deno.serve(async(req:Request)=>{
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers:cors});
 if(req.method!=="POST")return json(405,{error:"Method not allowed"});
 if(!origin || req.headers.get("origin")!==origin)return json(403,{error:"Origin not allowed"});
 if(!url||!pub||!secret)return json(503,{error:"Academy backend is not configured"});
 try{
  const user=await authenticate(req);
  const body=await req.json();
  const action=String(body.action||"");
  if(action==="create_location"){
    const name=String(body.name||"").trim();
    if(name.length<2||name.length>150)fail(400,"Location name required");
    const {data:created,error}=await admin.from("academy_locations").insert({name,billing_owner_id:user.id}).select("id").single();
    if(error)throw error;
    const {error:memError}=await admin.from("academy_location_members").insert({location_id:created.id,user_id:user.id,role:"owner"});
    if(memError)throw memError;
    return json(200,{location_id:created.id,status:"pending"});
  }
  if(action==="list_locations"){
    const {data:members,error}=await admin.from("academy_location_members").select("location_id,role").eq("user_id",user.id).eq("active",true);
    if(error)throw error;
    const ids=(members||[]).map(x=>x.location_id);
    const {data:locs,error:locErr}=ids.length?await admin.from("academy_locations").select("id,name,subscription_status,current_period_end").in("id",ids):{data:[],error:null};
    if(locErr)throw locErr;
    return json(200,{locations:(locs||[]).map(l=>({...l,role:members?.find(m=>m.location_id===l.id)?.role}))});
  }
  if(action==="create_checkout"){
    const id=String(body.location_id||"");
    if(!uuid(id))fail(400,"Invalid location");
    const loc=await location(id);
    if(loc.billing_owner_id!==user.id)fail(403,"Only the billing owner can subscribe");
    if(active(loc.subscription_status))fail(409,"Already subscribed");
    if(env("ACADEMY_BILLING_ENABLED")!=="true")fail(503,"Academy billing is not yet enabled");
    if(!env("ACADEMY_STRIPE_PRICE_ID")||!env("STRIPE_SECRET_KEY"))fail(503,"Billing not configured");
    const session=await stripe.checkout.sessions.create({
      mode:"subscription",line_items:[{price:env("ACADEMY_STRIPE_PRICE_ID"),quantity:1}],
      client_reference_id:id,customer_email:user.email,automatic_tax:{enabled:true},
      billing_address_collection:"required",tax_id_collection:{enabled:true},
      subscription_data:{metadata:{academy_location_id:id}},
      metadata:{academy_location_id:id,academy_owner_id:user.id},
      success_url:origin+"/academy/learn/?checkout=success",
      cancel_url:origin+"/academy/learn/?checkout=cancel"
    },{idempotencyKey:"academy-checkout-"+id+"-"+user.id+"-"+Math.floor(Date.now()/300000)});
    return json(200,{checkout_url:session.url});
  }
  if(action==="billing_portal"){
    const id=String(body.location_id||"");if(!uuid(id))fail(400,"Invalid location");
    const loc=await location(id);
    if(loc.billing_owner_id!==user.id)fail(403,"Only the billing owner can manage billing");
    if(!loc.stripe_customer_id)fail(404,"No billing customer linked");
    const session=await stripe.billingPortal.sessions.create({customer:loc.stripe_customer_id,return_url:origin+"/academy/learn/"});
    return json(200,{portal_url:session.url});
  }
  if(action==="invite"){
    const id=String(body.location_id||"");
    if(!uuid(id))fail(400,"Invalid location");
    const role=await permission(user.id,id);
    const loc=await location(id);
    if(!active(loc.subscription_status))fail(403,"Activate the location subscription first");
    const email=cleanEmail(body.email),intendedRole=String(body.role||"manager");
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254)fail(400,"Valid email required");
    if(!["gm","manager","shift_leader"].includes(intendedRole))fail(400,"Invalid manager role");
    if(role==="gm"&&intendedRole==="gm")fail(403,"Only owners may designate a GM");
    const token=crypto.randomUUID()+crypto.randomUUID();
    const digest=Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(token)))).map(x=>x.toString(16).padStart(2,"0")).join("");
    const {error}=await admin.from("academy_invitations").insert({
      location_id:id,invited_email:email,intended_role:intendedRole,invited_by:user.id,
      token_digest:digest,expires_at:new Date(Date.now()+7*86400000).toISOString()
    });
    if(error?.code==="23505")fail(409,"A pending invitation already exists for this email");
    if(error)throw error;
    // Supabase sends the email for new users. Existing users can sign in and accept pending invitations.
    const invite=await admin.auth.admin.inviteUserByEmail(email,{redirectTo:origin+"/academy/learn/"});
    await admin.from("academy_audit_log").insert({actor_id:user.id,action:"invite_created",target:id});
    return json(200,{invited:true,email,invitation_email_sent:!invite.error,
      message:invite.error?"Invitation recorded. Ask the existing user to sign in and accept it.":"Invitation email sent."});
  }
  if(action==="pending_invites"){
    const email=cleanEmail(user.email);
    const {data,error}=await admin.from("academy_invitations").select("id,location_id,intended_role,expires_at")
      .eq("invited_email",email).is("accepted_at",null).is("revoked_at",null).gt("expires_at",new Date().toISOString());
    if(error)throw error;
    const ids=(data||[]).map(x=>x.location_id);
    const {data:locs}=ids.length?await admin.from("academy_locations").select("id,name,subscription_status").in("id",ids):{data:[]};
    return json(200,{invitations:(data||[]).filter(i=>locs?.some(l=>l.id===i.location_id&&active(l.subscription_status))).map(i=>({
      ...i,location_name:locs?.find(l=>l.id===i.location_id)?.name
    }))});
  }
  if(action==="accept_invite"){
    const inviteId=String(body.invitation_id||"");if(!uuid(inviteId))fail(400,"Invalid invitation");
    const invite=unwrap(await admin.from("academy_invitations").select("*").eq("id",inviteId).single()) as any;
    if(cleanEmail(invite.invited_email)!==cleanEmail(user.email) || invite.accepted_at || invite.revoked_at
       || Date.parse(invite.expires_at)<Date.now())fail(403,"Invitation invalid or expired");
    const loc=await location(invite.location_id);if(!active(loc.subscription_status))fail(403,"Location billing inactive");
    const {data:existingMember,error:existingError}=await admin.from("academy_location_members")
      .select("role").eq("location_id",invite.location_id).eq("user_id",user.id).maybeSingle();
    if(existingError)throw existingError;
    // An invitation must never demote an owner or existing GM.
    const safeRole=existingMember&&["owner","gm"].includes(existingMember.role)?existingMember.role:invite.intended_role;
    const {error:memberError}=await admin.from("academy_location_members").upsert({
      location_id:invite.location_id,user_id:user.id,role:safeRole,active:true
    },{onConflict:"location_id,user_id"});if(memberError)throw memberError;
    const {error:upError}=await admin.from("academy_invitations").update({accepted_by:user.id,accepted_at:new Date().toISOString()}).eq("id",inviteId).is("accepted_at",null);
    if(upError)throw upError;
    await grant(user.id,invite.location_id);
    await admin.from("academy_audit_log").insert({actor_id:user.id,action:"invite_accepted",target:invite.location_id});
    return json(200,{joined:true,location_id:invite.location_id});
  }
  if(action==="list_members"){
    const id=String(body.location_id||"");if(!uuid(id))fail(400,"Invalid location");
    await permission(user.id,id);
    const {data,error}=await admin.from("academy_location_members").select("user_id,role,active,added_at").eq("location_id",id).order("added_at");
    if(error)throw error;
    return json(200,{members:data||[]});
  }
  if(action==="deactivate_member"){
    const id=String(body.location_id||""),target=String(body.user_id||"");
    if(!uuid(id)||!uuid(target))fail(400,"Invalid user or location");
    await permission(user.id,id);
    const loc=await location(id);
    if(target===loc.billing_owner_id)fail(403,"Cannot deactivate billing owner");
    const {error}=await admin.from("academy_location_members").update({active:false}).eq("location_id",id).eq("user_id",target);
    if(error)throw error;
    await admin.from("academy_enrollments").update({status:"revoked"}).eq("location_id",id).eq("user_id",target).neq("status","completed");
    await admin.from("academy_audit_log").insert({actor_id:user.id,action:"member_deactivated",target:id});
    return json(200,{deactivated:true});
  }
  return json(400,{error:"Unknown action"});
 }catch(e:any){console.error("Academy manager action",e?.message);return json(e?.http||500,{error:e?.http?e.message:"Unable to complete action"});}
});
