// Release-only isolated static preview; no production deployment or credentials.
// Before publishing: disable public Auth signup in staging, verify staging CORS, and authorize destination. UI hiding/noindex are not access controls.
import {readFileSync,writeFileSync,mkdirSync,existsSync} from "node:fs";
import {dirname,join} from "node:path";
import {createHash} from "node:crypto";
import {Script} from "node:vm";
function buildPreview(src,key,locked){
 if(locked&&key)throw Error("Locked preview must not receive a key");
 if(!locked&&!/^sb_publishable_[A-Za-z0-9_-]{20,}$/.test(key))throw Error("Staging publishable key required; secret/legacy keys rejected");
 const output={};
 for(const path of ["styles.css","academy/learn/index.html","academy/learn/app.js","academy/learn/goal-maps.js"]){
  if(typeof src[path]!=="string"||!src[path].length)throw Error("Missing expected input "+path);
  if(/seaxmxrnblivtjmlmtsn|sb_secret_[A-Za-z0-9_-]{20,}|(?:sk|rk)_live_[A-Za-z0-9]{16,}/.test(src[path]))throw Error("Production or privileged config value in "+path);
  output[path]=src[path];
 }
 // Preview-only commercial safeguards; leave shared application sources untouched.
 // Do not expose a standalone price or a usable billing portal when QA billing is off.
 const previewAppPath="academy/learn/app.js";
 const previewReplacements=[
  [
    "Create a restaurant location to set up an owner subscription. No charge occurs until you complete Stripe Checkout.",
    "Create a synthetic restaurant location for QA. Checkout is disabled in this preview."
  ],
  [
    "Location created. Add a subscription to activate manager invitations.",
    "Synthetic location created. An authorized operator must approve its test entitlement before invitations are enabled."
  ],
  [
    "Subscribe — $199/month",
    "QSR founding partner — $99/location/month (sandbox only)"
  ],
  [
    "else if(['active','trialing'].includes(loc.subscription_status)) item.append(button('Manage billing'",
    "else if(cfg.billingEnabled===true&&['active','trialing'].includes(loc.subscription_status)) item.append(button('Manage billing'"
  ]
];
 for(const [before,after] of previewReplacements){
  if(output[previewAppPath].split(before).length!==2)throw Error("QSR preview commercial UI changed; review the exact replacement");
  output[previewAppPath]=output[previewAppPath].replace(before,after);
 }
 if(output[previewAppPath].includes("Subscribe — $199/month"))throw Error("Standalone price leaked into QSR preview");
 new Script(output[previewAppPath],{filename:"QSR preview app.js"});
 if(!output[previewAppPath].includes("QSR founding partner — $99/location/month (sandbox only)")||!output[previewAppPath].includes("else if(cfg.billingEnabled===true&&['active','trialing'].includes(loc.subscription_status))"))throw Error("QSR preview billing guard absent");
 console.log("Verified preview-specific commercial copy, disabled billing guard and JavaScript syntax.");
 const path="academy/learn/index.html";
 const h=output[path];
 if(!h.includes('id="register"')||!h.includes('id="reset"')||!h.includes("<head>"))throw Error("Expected learner markup changed");
 output[path]=h.replace("<head>",'<head><meta name="robots" content="noindex,nofollow"><style>#register,#reset{display:none!important}</style>').replace(/<body([^>]*)>/,'<body$1><div role="status" style="padding:12px;background:#fff4d8;color:#342600;text-align:center">QA PREVIEW — synthetic accounts only. No real customer data or payments.</div>').replace('href="/academy/"','href="/"');
 if(locked)output[path]=output[path].replace("QA PREVIEW — synthetic accounts only. No real customer data or payments.","QA PREVIEW — sign-in locked pending staging security configuration. No real customer data or payments.");
 if(!output[path].includes("QA PREVIEW"))throw Error("Missing preview banner");
 output["academy/learn/config.js"]="// Staging publishable configuration only. Billing disabled.\nwindow.CARE_STAY_ACADEMY_CONFIG=Object.freeze("+JSON.stringify({supabaseUrl:locked?"":"https://dvdvjzqiiekakxzkhora.supabase.co",publishableKey:locked?"":key,billingEnabled:false})+");\n";
 output["index.html"]='<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Care &amp; Stay — QA preview</title><link rel="stylesheet" href="/styles.css"></head><body><main class="container" style="padding:3rem 1rem"><h1>QSR Academy — QA preview</h1><p>Authorized synthetic test accounts only. Do not enter real customer data. Payments are disabled.</p><p><a href="/academy/learn/">Open the learner portal</a></p></main></body></html>';
 if(locked)output["index.html"]=output["index.html"].replace("Authorized synthetic test accounts only.","Sign-in is temporarily locked pending staging security configuration.");
 return output;
}
const files=["styles.css","academy/learn/index.html","academy/learn/app.js","academy/learn/goal-maps.js"];
const sources=Object.fromEntries(files.map(p=>[p,readFileSync(p,"utf8")]));
const locked=process.env.QSR_PREVIEW_AUTH_READY!=="true";
async function verifyStagingActivation(key,request=fetch,timeout=()=>AbortSignal.timeout(12000)){
 const base="https://dvdvjzqiiekakxzkhora.supabase.co";
 const origin="https://care-and-stay-qsr-staging.onrender.com";
 if(!/^sb_publishable_[A-Za-z0-9_-]{20,}$/.test(key))throw Error("Staging publishable key required");
 const safe=(url,options={})=>request(url,{...options,redirect:"error",signal:timeout()});
 const [settings,allowed,foreign,denied]=await Promise.all([
  safe(base+"/auth/v1/settings",{headers:{apikey:key}}),
  safe(base+"/functions/v1/academy-manager",{method:"OPTIONS",headers:{Origin:origin,"Access-Control-Request-Method":"POST","Access-Control-Request-Headers":"authorization,apikey,content-type"}}),
  safe(base+"/functions/v1/academy-manager",{method:"OPTIONS",headers:{Origin:"https://example.com","Access-Control-Request-Method":"POST","Access-Control-Request-Headers":"authorization,apikey,content-type"}}),
  safe(base+"/functions/v1/academy-manager",{method:"POST",headers:{Origin:origin,apikey:key,"content-type":"application/json"},body:JSON.stringify({action:"list_locations"})})
 ]);
 if(!settings.ok)throw Error("Staging Auth settings endpoint unavailable");
 const config=await settings.json();
 if(config.disable_signup!==true)throw Error("Staging Auth has not verified disabled public signup");
 if(!allowed.ok||allowed.headers.get("access-control-allow-origin")!==origin)throw Error("Staging manager exact-origin preflight failed");
 if(foreign.headers.get("access-control-allow-origin")!==origin&&foreign.headers.get("access-control-allow-origin")!==null)throw Error("Staging manager allowed an unexpected origin");
 if(![401,403].includes(denied.status))throw Error("Staging manager did not reject anonymous request");
 // Independent operator acceptance against the hosted preview that is already live.
 // No synthetic passwords, secret keys or user writes are involved.
 const page=await safe(origin+"/academy/learn/");
 if(!page.ok)throw Error("Existing hosted preview unavailable");
 const html=await page.text();
 if(!/noindex,nofollow/i.test(html)||!/synthetic accounts only/i.test(html))throw Error("Existing hosted preview not isolated");
 const hosted=await safe(origin+"/academy/learn/config.js");
 if(!hosted.ok)throw Error("Existing hosted config unavailable");
 const configMatch=(await hosted.text()).match(/Object\.freeze\((\{[^\r\n]+\})\)/);
 if(!configMatch)throw Error("Unexpected hosted configuration");
 const previous=JSON.parse(configMatch[1]);
 if(previous.supabaseUrl!==base||previous.publishableKey!==key||previous.billingEnabled!==false)throw Error("Existing hosted configuration differs");
 const payload={enrollment_id:"00000000-0000-4000-8000-000000000001",module_id:"00000000-0000-4000-8000-000000000001",location_id:"00000000-0000-4000-8000-000000000001"};
 const actions=["create_checkout","list_module_media","play_module_media"];
 const results=await Promise.all(actions.map(action=>safe(base+"/functions/v1/academy-manager",{method:"POST",headers:{Origin:origin,apikey:key,"content-type":"application/json"},body:JSON.stringify({...payload,action})})));
 for(let i=0;i<actions.length;i++){
  if(![401,403].includes(results[i].status))throw Error("Anonymous request not denied: "+actions[i]);
  console.log("Hosted anonymous denial verified: "+actions[i]);
 }
 for(const [name,signature] of [["unsigned",null],["forged","t=1,v1=invalid"]]){
  const headers={"content-type":"application/json"};if(signature)headers["stripe-signature"]=signature;
  const response=await safe(base+"/functions/v1/academy-stripe-webhook",{method:"POST",headers,body:JSON.stringify({type:"checkout.session.completed",livemode:false})});
  if(response.status!==400)throw Error("Unexpected webhook rejection status: "+name+" "+response.status);
  console.log("Hosted webhook denial verified: "+name);
 }
 console.log("Existing hosted preview config and five independent public denial checks verified.");
 // One-time acceptance observation for the approved temporary QSR recipients.
 // No keys, identities, customer data or signed requests. Never enable a receiver.
 for(const [label,ref] of [["Organizational 360","qozjqacjxboqcswybbqq"],["Individual 360","vjwdwdjxbwqjkdbemuwo"]]){
  const url="https://"+ref+".supabase.co/functions/v1/qsr-bundle-receiver";
  const response=await safe(url,{method:"POST",headers:{"content-type":"application/json"},body:"{}"});
  const noStore=response.headers.get("cache-control")?.includes("no-store");
  const body=await response.text();
  console.log("New QSR recipient "+label+" unsigned request HTTP "+response.status+"; expected disabled handler: "+(response.status===503&&noStore&&body==="{}"));
  if(response.ok)throw Error("Unexpected unsigned receiver success: "+label);
 }

 // Independent public release integrity: compare actual official-site bytes to
 // the verified live production deploy 3f201a7, not an unverified branch.
 // Observational only; no credentials, registration, form submit or billing.
 const publicBase="https://mycareandstay.com";
 const expected=[
 ["/stay-culture-360/qsr/","5eadc1dac08b964f0316736f8ba211ee4d5f70ad"],
 ["/employer-login/","90f9efbe3b85dd6f1aae5ce2fc82f9d1a0d2ff8a"],
 ["/individual-login/","c6b7f1d131fe36cd4078d3fed1cb8970edb12d5a"],
 ["/academy/learn/","42861a1d2bc15316c1f17194f658a4b6c834cf32"],
 ["/client-portal/","7ae4ce03227660a14e0f02dd6165efce11fba089"]
 ];
 for(const [route,blob] of expected){
  try{
   const response=await safe(publicBase+route);
   if(!response.ok){console.log("Production observation "+route+" HTTP "+response.status);continue;}
   const bytes=Buffer.from(await response.arrayBuffer());
   const actual=createHash("sha1").update("blob "+bytes.length+"\0").update(bytes).digest("hex");
   console.log("Production observation "+route+" HTTP "+response.status+" git-blob "+(actual===blob?"matches recorded release":"differs; inspect new live revision"));
   const html=bytes.toString("utf8");
   if(route==="/stay-culture-360/qsr/"){
    console.log("Public QSR invitation-only price and no-payment notice: "+(/\$99/.test(html)&&/No payment is collected on this page/.test(html)&&/Invitation-only/.test(html)?"verified":"not verified"));
    console.log("Public QSR six-month assessment inclusions: "+(html.includes("one organizational assessment per subscribed location every six months")&&html.includes("one Individual Leadership 360 assessment per GM every six months")?"verified":"not verified"));
   }
   if(route==="/individual-login/")console.log("Individual 360 public route points to test host: "+html.includes("care-and-stay-individual-360-test.onrender.com"));
  }catch{console.log("Production observation "+route+" unavailable; no production assertion made.");}
 }
 return true;
}
const out=buildPreview(sources,process.env.QSR_STAGING_PUBLISHABLE_KEY||"",locked);
if(!locked){
 await verifyStagingActivation(process.env.QSR_STAGING_PUBLISHABLE_KEY||"");
 console.log("Verified staging Auth signup disabled, exact preflight origin and anonymous denial before publishing backend configuration.");
}
const root=".qsr-preview-dist";
if(existsSync(root))throw Error("Refusing to overwrite an existing output directory; use a clean checkout");
for(const [p,content] of Object.entries(out)){const target=join(root,p);mkdirSync(dirname(target),{recursive:true});writeFileSync(target,content,{flag:"wx"});}
console.log("QSR staging preview built: "+Object.keys(out).length+" allowlisted files; billing disabled.");
