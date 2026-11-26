import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.49.4';
const db=createClient('https://vwxbqxmnggwaqwlwseco.supabase.co','sb_publishable_GhAB0t1YaRHaqrHPSUZwqQ_oHc2mDKW',{auth:{persistSession:false}});
const $=id=>document.getElementById(id), fields=['topic','discover','dream','design','destiny','measure','due_date','status'];let memberships=[],orgs=[],editing=null,epoch=0;
const say=t=>$('message').textContent=t;
const check=r=>{if(r.error)throw new Error(r.error.message);return r.data};
function reset(){editing=null;$('initiativeForm').reset();$('save').textContent='Save initiative';$('cancel').hidden=true}
function clear(){epoch++;clearEnrollment();memberships=[];orgs=[];$('agency').replaceChildren();$('initiatives').replaceChildren();$('dashboard').hidden=true;$('workspace').hidden=true;reset()}
async function load(){clear();$('login').hidden=true;const run=epoch;const user=check(await db.auth.getUser()).user;if(!user){$('login').hidden=false;say('Sign in to your agency account.');return}const m=check(await db.from('agency_portal_members').select('org_id,role').eq('user_id',user.id).eq('active',true));const o=check(await db.from('agency_portal_orgs').select('id,name,industry').order('name'));if(run!==epoch)return;memberships=m;orgs=o;$('workspace').hidden=false;if(!o.length){say('No active agency membership. Contact Care & Stay to request access.');return}for(const a of o){const opt=document.createElement('option');opt.value=a.id;opt.textContent=a.name;$('agency').append(opt)}await refresh()}
async function refresh(){const run=++epoch;reset();clearEnrollment();$('dashboard').hidden=true;$('initiatives').replaceChildren();const id=$('agency').value,a=orgs.find(x=>x.id===id);if(!a)return;const list=check(await db.from('agency_portal_initiatives').select('*').eq('org_id',id).order('created_at',{ascending:false}));const role=memberships.find(x=>x.org_id===id)?.role;let count='Restricted';if(['owner','admin'].includes(role)){const now=new Date().toISOString();const r=await db.from('agency_portal_sponsorships').select('id',{count:'exact',head:true}).eq('org_id',id).eq('status','active').lte('starts_at',now).gt('ends_at',now);if(r.error)throw r.error;count=r.count}if(run!==epoch)return;$('agencyName').textContent=a.name;$('industry').textContent=a.industry==='dd_services'?'Developmental disability services':'Home care';$('prompt').textContent=a.industry==='dd_services'?'Explore dignity, self-determination, inclusion, family collaboration and DSP development.':'Explore continuity of care, family confidence, communication and caregiver development.';$('initiativeCount').textContent=list.length;$('completeCount').textContent=list.filter(x=>x.status==='complete').length;$('sponsorCount').textContent=count;for(const item of list){const el=document.createElement('article');el.className='panel';const h=document.createElement('h4');h.textContent=item.topic;el.append(h);const p=document.createElement('p');p.textContent=item.status+(item.due_date?' · Review '+item.due_date:'');el.append(p);const b=document.createElement('button');b.type='button';b.textContent='View or edit';b.onclick=()=>{editing=item.id;for(const f of fields)$(f).value=item[f]??'';$('save').textContent='Update initiative';$('cancel').hidden=false;$('topic').focus()};el.append(b);$('initiatives').append(el)}if(!list.length)$('initiatives').textContent='No initiatives yet. Start with a shared affirmative topic.';$('dashboard').hidden=false;say('Signed in. Your agency workspace is ready.');await loadEnrollment(run,id,role)}
function fail(){say('Unable to complete this action. Please try again or contact Care & Stay.')}
$('loginForm').onsubmit=async e=>{e.preventDefault();const b=e.target.querySelector('button');b.disabled=true;try{check(await db.auth.signInWithPassword({email:$('email').value,password:$('password').value}));$('password').value='';await load()}catch(e){$('login').hidden=false;fail(e)}finally{b.disabled=false}};
$('logout').onclick=async()=>{clear();$('login').hidden=false;try{check(await db.auth.signOut());say('Signed out.')}catch(e){fail(e)}};
$('agency').onchange=()=>refresh().catch(fail);$('cancel').onclick=reset;
$('initiativeForm').onsubmit=async e=>{e.preventDefault();const id=$('agency').value,edit=editing,run=epoch;const v=Object.fromEntries(fields.map(f=>[f,$(f).value.trim()]));v.due_date=v.due_date||null;if(!v.topic)return say('Enter an affirmative topic.');$('save').disabled=true;$('agency').disabled=true;try{const q=edit?db.from('agency_portal_initiatives').update(v).eq('id',edit).eq('org_id',id):db.from('agency_portal_initiatives').insert({...v,org_id:id});const rows=check(await q.select('id'));if(!rows.length)throw new Error('No authorized rows changed');if(run===epoch)await refresh()}catch(e){if(run===epoch)fail(e)}finally{$('save').disabled=false;$('agency').disabled=false}};
$('login').hidden=false;say('Sign in to your agency account.');
function clearEnrollment(){
 $('locationControls').hidden=true;$('locationForm').hidden=true;$('enrollmentControls').hidden=true;
 $('locationList').replaceChildren();$('enrollmentList').replaceChildren();$('enrollmentLocation').replaceChildren();
 $('locationForm').reset();$('enrollmentForm').reset();$('requestEnrollment').disabled=true;
 $('enrollmentNotice').textContent='Checking availability…';
}
function entry(text){const p=document.createElement('p');p.textContent=text;return p}
function current(run,id){return run===epoch&&$('agency').value===id}
function canManage(id){return memberships.some(m=>m.org_id===id&&['owner','admin'].includes(m.role))}
async function loadEnrollment(run,id,role){
 const admin=['owner','admin'].includes(role);
 try{
  const locations=check(await db.from('agency_portal_locations').select('id,name,active').eq('org_id',id).order('name'));
  const requests=admin?check(await db.from('agency_portal_enrollment_requests').select('id,location_id,product,status,created_at').eq('org_id',id).order('created_at',{ascending:false}).limit(100)):[];
  if(!current(run,id))return;
  $('locationControls').hidden=false;$('locationForm').hidden=!admin;$('enrollmentControls').hidden=!admin;
  $('locationList').replaceChildren();$('enrollmentList').replaceChildren();$('enrollmentLocation').replaceChildren();
  const locNames=new Map(locations.map(l=>[l.id,l.name]));
  for(const loc of locations){
   const row=document.createElement('div');row.append(entry(loc.name+(loc.active?' · Active':' · Archived')));
   if(admin){const b=document.createElement('button');b.type='button';b.textContent=loc.active?'Archive location':'Restore location';
    b.onclick=async()=>{if(!current(run,id)||!canManage(id))return;b.disabled=true;try{
      const rows=check(await db.from('agency_portal_locations').update({active:!loc.active}).eq('org_id',id).eq('id',loc.id).select('id'));
      if(rows.length!==1)throw Error('No authorized location changed');
      if(current(run,id))await refresh();
    }catch{if(current(run,id))$('enrollmentNotice').textContent='Location change could not be confirmed.'}finally{b.disabled=false}};row.append(b)}
   $('locationList').append(row);
   if(loc.active){const opt=document.createElement('option');opt.value=loc.id;opt.textContent=loc.name;$('enrollmentLocation').append(opt)}
  }
  if(!locations.length)$('locationList').append(entry('No locations yet.'));
  for(const req of requests)$('enrollmentList').append(entry((locNames.get(req.location_id)||'Location')+' · '+req.status+' · '+new Date(req.created_at).toLocaleDateString()));
  if(!requests.length)$('enrollmentList').append(entry('No requests yet.'));
  $('requestEnrollment').disabled=!locations.some(l=>l.active);
  $('enrollmentNotice').textContent=admin?'Requests require Care & Stay review. No subscription is activated.':'Location access is read-only for quality leaders.';
 }catch{if(current(run,id)){clearEnrollment();$('enrollmentNotice').textContent='Location and enrollment tools are not available in this release.'}}
}
$('locationForm').onsubmit=async e=>{
 e.preventDefault();const run=epoch,id=$('agency').value,name=$('locationName').value.trim();if(!name||!current(run,id)||!canManage(id))return;
 $('addLocation').disabled=true;try{
  const rows=check(await db.from('agency_portal_locations').insert({org_id:id,name}).select('id'));
  if(rows.length!==1)throw Error('No authorized location created');
  if(current(run,id))await refresh();
 }catch{if(current(run,id))$('enrollmentNotice').textContent='Location creation could not be confirmed.'}finally{$('addLocation').disabled=false}
};
$('enrollmentForm').onsubmit=async e=>{
 e.preventDefault();const run=epoch,id=$('agency').value,location_id=$('enrollmentLocation').value,product=orgs.find(o=>o.id===id)?.industry;
 if(!location_id||!product||!current(run,id)||!canManage(id))return;$('requestEnrollment').disabled=true;
 try{
  const rows=check(await db.from('agency_portal_enrollment_requests').insert({org_id:id,location_id,product}).select('id'));
  if(rows.length!==1)throw Error('No authorized request created');
  if(current(run,id))await refresh();
 }catch{if(current(run,id)){$('enrollmentNotice').textContent='Request could not be confirmed. Review existing requests before retrying.';$('requestEnrollment').disabled=false}}
};
