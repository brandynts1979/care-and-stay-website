import { validModuleMediaPath } from "./media-path.mjs";
import { createClient } from "npm:@supabase/supabase-js@2.57.0";
import Stripe from "npm:stripe@17.7.0";
import { summarizeTeamProgress } from "./member-policy.mjs";

const env = (k: string) => Deno.env.get(k) || "";
const origin = (env("ACADEMY_SITE_ORIGIN") || "https://mycareandstay.com").replace(/\/$/,"");
const cors = { "Access-Control-Allow-Origin": origin, "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info, x-supabase-api-version", "Vary":"Origin" };
const json = (status:number, data:unknown) => new Response(JSON.stringify(data),{status,headers:{...cors,"Content-Type":"application/json","Cache-Control":"no-store"}});
const url=env("SUPABASE_URL"), pub=env("SUPABASE_ANON_KEY"), secret=env("SUPABASE_SERVICE_ROLE_KEY");
const admin=createClient(url,secret,{auth:{persistSession:false}});
const stripe=env("STRIPE_SECRET_KEY") ? new Stripe(env("STRIPE_SECRET_KEY")) : null;
const active=(status:string)=>["active","trialing"].includes(status);
const uuid=(s:unknown)=>typeof s==="string" && /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(s);
const cleanEmail=(s:unknown)=>String(s||"").trim().toLowerCase();
function fail(s:number,m:string):never { throw Object.assign(new Error(m),{http:s}); }
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
// Bounded, deterministic pages. A full page is not evidence that all rows were returned.
async function readAll(factory:(from:number,to:number)=>PromiseLike<any>):Promise<any[]> {
 const out:any[]=[]; const size=250;
 for(let from=0;from<10000;from+=size){
   const {data,error}=await factory(from,from+size-1);
   if(error)throw error;
   const rows=data||[];out.push(...rows);
   if(rows.length<size)return out;
 }
 fail(503,"Team progress is temporarily too large to summarize; contact support.");
}
async function byIds(ids:string[],factory:(batch:string[],from:number,to:number)=>PromiseLike<any>):Promise<any[]> {
 const unique=[...new Set(ids)];
 const rows:any[]=[];
 for(let i=0;i<unique.length;i+=50){
   const batch=unique.slice(i,i+50);
   rows.push(...await readAll((from,to)=>factory(batch,from,to)));
 }
 return rows;
}
async function teamProgress(locationId:string,members:any[]){
 const memberIds=members.filter(m=>m.active).map(m=>m.user_id);
 const enrollments=await byIds(memberIds,(batch,from,to)=>admin.from("academy_enrollments")
   .select("id,user_id,location_id,course_id,status").eq("location_id",locationId).in("user_id",batch)
   .order("id").range(from,to));
 const courseIds=enrollments.map(e=>e.course_id);
 const courses=await byIds(courseIds,(batch,from,to)=>admin.from("academy_courses")
   .select("id,title").in("id",batch).order("id").range(from,to));
 const modules=await byIds(courseIds,(batch,from,to)=>admin.from("academy_modules")
   .select("id,course_id").in("course_id",batch).order("id").range(from,to));
 const lessons=await byIds(modules.map(m=>m.id),(batch,from,to)=>admin.from("academy_lessons")
   .select("id,module_id,published").in("module_id",batch).eq("published",true).order("id").range(from,to));
 const progress=await byIds(enrollments.map(e=>e.id),(batch,from,to)=>admin.from("academy_lesson_progress")
   .select("enrollment_id,lesson_id").in("enrollment_id",batch)
   .order("enrollment_id").order("lesson_id").range(from,to));
 // Deliberately never query private reflections, scenario answers, or review narratives.
 return summarizeTeamProgress(locationId,members,enrollments,courses,modules,lessons,progress);
}
async function location(id:string){
 const row=unwrap(await admin.from("academy_locations").select("*").eq("id",id).single()) as any;
 if(!row)fail(404,"Location not found");
 return row;
}
async function grant(userId:string,locationId:string){
 const {data,error}=await admin.rpc("academy_grant_member_atomic",{p_location:locationId,p_user:userId});
 if(error)throw error;
 if(data==="inactive"||data==="forbidden")fail(403,"Active location membership required");
 if(data==="not_found")fail(404,"Location not found");
 if(data!=="granted")fail(503,"Approved Academy course unavailable");
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
  // Only authorized learners receive temporary access to reviewed private files.
  // Never accept a bucket name, object path, user id or a signed URL from a client.
  if(action==="list_module_media" || action==="play_module_media"){
    const enrollmentId=String(body.enrollment_id||"");
    const moduleId=String(body.module_id||"");
    if(!uuid(enrollmentId)||(action==="play_module_media"&&!uuid(moduleId)))fail(400,"Invalid module or enrollment");
    const {data:rows,error:mediaError}=await admin.rpc("academy_module_media_for_enrollment",{
      p_user:user.id,p_enrollment:enrollmentId
    });
    if(mediaError)throw mediaError;
    const media=rows||[];
    if(action==="list_module_media"){
      return json(200,{modules:media.map((m:any)=>({module_id:m.module_id,title:m.title,duration_seconds:m.duration_seconds,captioned:m.captioned}))});
    }
    const selected=media.find((m:any)=>m.module_id===moduleId);
    if(!selected)fail(403,"Module video is unavailable for this enrollment");
    // Defense in depth: ensure the bucket has not been made public accidentally.
    const {data:bucket,error:bucketError}=await admin.storage.getBucket("academy-module-media");
    if(bucketError||!bucket||bucket.public!==false)fail(503,"Secure module video storage is unavailable");
    if(!validModuleMediaPath(moduleId,selected.object_path))fail(503,"Module video configuration invalid");
    const seconds=600;
    const {data:signed,error:signError}=await admin.storage.from("academy-module-media").createSignedUrl(selected.object_path,seconds);
    if(signError||!signed?.signedUrl)fail(503,"Module video temporarily unavailable");
    return json(200,{url:signed!.signedUrl,expires_in:seconds,title:selected.title});
  }
  if(action==="demo_status" || action==="activate_demo"){
    const email=cleanEmail(user.email);
    const {data:allowed,error:allowError}=await admin.from("academy_demo_authorized")
       .select("email,enabled,location_id,expires_at").eq("email",email).maybeSingle();
    if(allowError)throw allowError;
    if(!allowed?.enabled){
      if(action==="demo_status")return json(200,{eligible:false,active:false});
      fail(403,"This is a restricted Care & Stay internal demo");
    }
    const stillActive=!!allowed.location_id && !!allowed.expires_at && Date.parse(allowed.expires_at)>Date.now();
    if(action==="demo_status")return json(200,{eligible:true,active:stillActive,expires_at:allowed.expires_at});
    if(stillActive){
      const {data:existingMembership,error:membershipError}=await admin.from("academy_location_members")
        .select("active").eq("location_id",allowed.location_id).eq("user_id",user.id).maybeSingle();
      if(membershipError)throw membershipError;
      if(!existingMembership?.active)fail(403,"This demo was activated by another account");
      return json(200,{activated:true,already_active:true,expires_at:allowed.expires_at});
    }
    if(allowed.location_id)fail(403,"This demo invitation has expired. Contact Care & Stay to renew.");
    const expires=new Date(Date.now()+30*86400000).toISOString();
    const {data:loc,error:locError}=await admin.from("academy_locations")
       .insert({name:"Care & Stay Internal Academy Demo",billing_owner_id:user.id,
         subscription_status:"active",current_period_end:expires})
       .select("id").single();
    if(locError)throw locError;
    const {error:membershipError}=await admin.from("academy_location_members")
       .insert({location_id:loc.id,user_id:user.id,role:"owner"});
    if(membershipError)throw membershipError;
    const {data:claimed,error:claimError}=await admin.from("academy_demo_authorized")
       .update({location_id:loc.id,activated_by:user.id,activated_at:new Date().toISOString(),expires_at:expires})
       .eq("email",email).is("location_id",null).select("email").maybeSingle();
    if(claimError)throw claimError;
    if(!claimed)fail(409,"Demo already activated; refresh to see your account");
    await grant(user.id,loc.id);
    await admin.from("academy_audit_log").insert({actor_id:user.id,action:"internal_demo_activated",target:loc.id});
    return json(200,{activated:true,expires_at:expires});
  }
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
    if(!stripe)fail(503,"Stripe billing is not yet configured");
    const price=env("ACADEMY_STRIPE_PRICE_ID");
    const reservation=unwrap(await admin.rpc("academy_reserve_checkout",{p_location:id,p_owner:user.id,p_email:user.email!,p_price:price})) as any;
    if(reservation?.result==="forbidden")fail(403,"Active billing owner required");
    if(reservation?.result!=="reserved")fail(409,"Existing or unresolved subscription; use billing portal or contact support");
    const attempt=reservation.attempt;
    let session:Stripe.Checkout.Session;
    if(attempt.stripe_session_id){
      session=await stripe!.checkout.sessions.retrieve(attempt.stripe_session_id);
      if(session.status==="expired"){
        const {error}=await admin.from("academy_checkout_attempts").update({state:"expired"}).eq("id",attempt.id).eq("state","pending").eq("stripe_session_id",session.id);
        if(error)throw error;
        fail(409,"Previous Checkout expired. Select Subscribe again.");
      }
      if(session.status!=="open")fail(409,"Checkout already submitted; awaiting payment confirmation");
    }else{
      // A durable attempt survives request retries. Never reuse an unknown
      // Stripe idempotency key outside a conservative retry window.
      if(Date.now()-Date.parse(attempt.created_at)>15*60*1000)fail(409,"Checkout recovery requires support review");
      const metadata={academy_location_id:id,academy_owner_id:user.id,academy_checkout_attempt_id:attempt.id};
      session=await stripe!.checkout.sessions.create({
        mode:"subscription",line_items:[{price:attempt.price_id,quantity:1}],
        client_reference_id:id,...(attempt.customer_id?{customer:attempt.customer_id}:{customer_email:attempt.owner_email}),
        automatic_tax:{enabled:true},billing_address_collection:"required",tax_id_collection:{enabled:true},
        subscription_data:{metadata},metadata,
        success_url:origin+"/academy/learn/?checkout=success",cancel_url:origin+"/academy/learn/?checkout=cancel"
      },{idempotencyKey:"academy-checkout-"+attempt.id});
      const recorded=unwrap(await admin.rpc("academy_record_checkout_session",{p_attempt:attempt.id,p_session:session.id}));
      if(recorded!==true)fail(409,"Checkout recording failed; contact support");
    }
    if(session.status!=="open"||!session.url)fail(409,"Checkout unavailable");
    return json(200,{checkout_url:session.url});
  }
  if(action==="billing_portal"){
    const id=String(body.location_id||"");if(!uuid(id))fail(400,"Invalid location");
    const loc=await location(id);
    if(loc.billing_owner_id!==user.id)fail(403,"Only the billing owner can manage billing");
    if(!loc.stripe_customer_id)fail(404,"No billing customer linked");
    if(!stripe)fail(503,"Stripe billing is not yet configured");
    const session=await stripe!.billingPortal.sessions.create({customer:loc.stripe_customer_id,return_url:origin+"/academy/learn/"});
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
    const {data:createdInvite,error}=await admin.from("academy_invitations").insert({
      location_id:id,invited_email:email,intended_role:intendedRole,invited_by:user.id,
      token_digest:digest,expires_at:new Date(Date.now()+7*86400000).toISOString()
    }).select("id").single();
    if(error?.code==="23505")fail(409,"A pending invitation already exists for this email");
    if(error)throw error;
    // Supabase sends the email for new users. Existing users can sign in and accept pending invitations.
    const invite=await admin.auth.admin.inviteUserByEmail(email,{redirectTo:origin+"/academy/learn/"});
    await admin.from("academy_audit_log").insert({actor_id:user.id,action:"invite_created",target:id});
    return json(200,{invited:true,email,invitation_url:origin+"/academy/learn/?invitation="+encodeURIComponent(createdInvite.id),invitation_email_sent:!invite.error,
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
    const {data,error}=await admin.rpc("academy_accept_invitation_atomic",{
      p_invitation:inviteId,p_user:user.id,p_verified_email:cleanEmail(user.email)
    });
    if(error)throw error;
    if(data?.result==="invalid"||data?.result==="forbidden")fail(403,"Invitation invalid or expired");
    if(data?.result==="inactive")fail(403,"Location billing inactive");
    if(data?.result==="no_course")fail(503,"Approved Academy course unavailable");
    if(!["joined","already_joined"].includes(data?.result))fail(503,"Unable to confirm invitation acceptance");
    return json(200,{joined:true,already_joined:data.result==="already_joined",location_id:data.location_id});
  }
  if(action==="list_members"){
    const id=String(body.location_id||"");if(!uuid(id))fail(400,"Invalid location");
    await permission(user.id,id);
    const page=body.page===undefined?0:Number(body.page);
    if(!Number.isSafeInteger(page)||page<0||page>100000)fail(400,"Invalid team page");
    const size=25,offset=page*size;
    const {data,error}=await admin.from("academy_location_members")
      .select("user_id,role,active,added_at").eq("location_id",id)
      .order("added_at").order("user_id").range(offset,offset+size);
    if(error)throw error;
    const rows=data||[],members=await teamProgress(id,rows.slice(0,size));
    return json(200,{members,page,has_more:rows.length>size});
  }
  if(action==="deactivate_member"){
    const id=String(body.location_id||""),target=String(body.user_id||"");
    if(!uuid(id)||!uuid(target))fail(400,"Invalid user or location");
    // Atomic service-only RPC repeats actor and target role checks under row locks.
    // Apply the staged SQL before deploying this Edge Function.
    const {data:result,error}=await admin.rpc("academy_deactivate_member_atomic",{
      p_actor:user.id,p_location:id,p_target:target
    });
    if(error)throw error;
    if(result==="not_found")fail(404,"Team member or location not found");
    if(result==="forbidden")fail(403,"Not authorized to remove this team member");
    if(result!=="deactivated")fail(503,"Unable to confirm member removal");
    return json(200,{deactivated:true});
  }
  return json(400,{error:"Unknown action"});
 }catch(e:any){console.error("Academy manager action",e?.message);return json(e?.http||500,{error:e?.http?e.message:"Unable to complete action"});}
});
