// Release-only isolated static preview; no production deployment or credentials.
// Before publishing: disable public Auth signup in staging, verify staging CORS, and authorize destination. UI hiding/noindex are not access controls.
import {readFileSync,writeFileSync,mkdirSync,existsSync} from "node:fs";
import {dirname,join} from "node:path";
function buildPreview(src,key,locked){
 if(locked&&key)throw Error("Locked preview must not receive a key");
 if(!locked&&!/^sb_publishable_[A-Za-z0-9_-]{20,}$/.test(key))throw Error("Staging publishable key required; secret/legacy keys rejected");
 const output={};
 for(const path of ["styles.css","academy/learn/index.html","academy/learn/app.js","academy/learn/goal-maps.js"]){
  if(typeof src[path]!=="string"||!src[path].length)throw Error("Missing expected input "+path);
  if(/seaxmxrnblivtjmlmtsn|sb_secret_[A-Za-z0-9_-]{20,}|(?:sk|rk)_live_[A-Za-z0-9]{16,}/.test(src[path]))throw Error("Production or privileged config value in "+path);
  output[path]=src[path];
 }
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
