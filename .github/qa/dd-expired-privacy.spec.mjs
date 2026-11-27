import { test, expect } from '@playwright/test';

const API = 'https://iqgytijuufgkvnzolvqz.supabase.co';
const owner = '11111111-1111-4111-8111-111111111111';
const personId = '22222222-2222-4222-8222-222222222222';
const member = '33333333-3333-4333-8333-333333333333';
const session = { access_token:'mock-access-token',refresh_token:'mock-refresh-token',user:{id:owner,email:'fictional-owner@example.test'} };

function reply(route, body, status=200){
 return route.fulfill({status,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify(body)});
}
async function fakeBackend(page){
 const state={people:[],strengths:[],goals:[],steps:[],notes:[],invites:[],tasks:[],docs:[],supportRecords:[],files:new Map(),next:0,uploads:0,removals:0,failMetadataOnce:false};
 const id=()=>('00000000-0000-4000-8000-'+String(++state.next).padStart(12,'0'));
 await page.route(API+'/**', async route=>{
  const req=route.request(),url=new URL(req.url()),pathname=url.pathname,method=req.method();
  if(pathname.startsWith('/auth/v1/token'))return reply(route,session);
  if(pathname==='/auth/v1/logout')return reply(route,{});
  if(pathname==='/functions/v1/dd-validated-document-upload' && method==='POST'){
   const raw=req.postDataBuffer()?.toString('latin1')||'';
   const field=name=>{
    const section=raw.split('name="'+name+'"')[1];
    return section?.split(/\r?\n\r?\n/)[1]?.split(/\r?\n/)[0]||'';
   };
   const profile=field('person_id'),name=field('document_name'),category=field('category'),notes=field('notes');
   const fileSection=raw.split('name="file"')[1]||'';
   const type=fileSection.split('Content-Type: ')[1]?.split(/\r?\n/)[0]||'';
   if(!state.people.some(p=>p.id===profile))return reply(route,{message:'You cannot upload to this profile.'},403);
   if(!name||!type)return reply(route,{message:'Bad upload form'},400);
   const ext=type==='image/png'?'png':type==='image/jpeg'?'jpg':'pdf';
   const key=owner+'/'+profile+'/'+id()+'.'+ext;
   state.uploads++;state.files.set(key,Buffer.from('%PDF-1.4\\nfictional test content\\n'));
   if(state.failMetadataOnce){
    state.failMetadataOnce=false;state.files.delete(key);state.removals++;
    return reply(route,{message:'Document metadata could not be saved.'},502);
   }
   state.docs.push({id:id(),owner_id:owner,person_id:profile,document_name:name,category,file_path:key,media_type:type,file_size:50,notes});
   return reply(route,{ok:true},201);
  }
  if(pathname==='/storage/v1/object/dd-private-documents' && method==='DELETE'){
   const {prefixes}=JSON.parse(req.postData());
   for(const key of prefixes)state.files.delete(key);
   return reply(route,{});
  }
  if(pathname.startsWith('/storage/v1/object/dd-private-documents/') || pathname.startsWith('/storage/v1/object/authenticated/dd-private-documents/')){
   const key=decodeURIComponent(pathname.split('/dd-private-documents/')[1]);
   if(method==='POST'){state.files.set(key,await req.postDataBuffer());return reply(route,{Key:key});}
   if(method==='GET'){const bytes=state.files.get(key);return bytes?route.fulfill({status:200,body:bytes,contentType:'application/pdf'}):reply(route,{message:'Missing'},404);}
  }
  const table=pathname.split('/rest/v1/')[1];
  const mapping={dd_people:'people',dd_strengths:'strengths',dd_goals:'goals',dd_goal_steps:'steps',dd_progress_notes:'notes',dd_team_invitations:'invites',dd_care_tasks:'tasks',dd_documents:'docs',dd_support_records:'supportRecords'};
  if(!mapping[table])return reply(route,{message:'Unexpected API call: '+pathname},404);
  const rows=state[mapping[table]];
  if(method==='GET'){
    let result=[...rows];
    for(const key of ['person_id','goal_id','id','status','category']){
      const value=url.searchParams.get(key);
      if(value?.startsWith('eq.'))result=result.filter(r=>r[key]===value.slice(3));
    }
    return reply(route,result);
  }
  if(method==='POST'){
    const payload=JSON.parse(req.postData());
    const record={id:id(),owner_id:owner,created_at:new Date().toISOString(),status:'open',...payload};
    rows.push(record);return reply(route,[record],201);
  }
  if(method==='PATCH'){
    const value=url.searchParams.get('id')?.slice(3),row=rows.find(r=>r.id===value);
    if(row)Object.assign(row,JSON.parse(req.postData()));
    return reply(route,[]);
  }
  if(method==='DELETE'){
    const value=url.searchParams.get('id')?.slice(3),at=rows.findIndex(r=>r.id===value);
    if(at>=0)rows.splice(at,1);
    return reply(route,[]);
  }
  return reply(route,{message:'Unhandled method'},405);
 });
 return state;
}
async function signin(page){
 await page.addInitScript(session=>{sessionStorage.setItem('dd_dev_session',JSON.stringify(session));},session);
 await page.goto('/');
 await expect(page.locator('#dashboard')).toBeVisible();
}

test('expired owner can revoke supporter even when paid profiles are inaccessible',async({page})=>{
 const db=await fakeBackend(page);
 const invite={id:member,owner_id:owner,person_id:personId,invitee_email:'fictional-supporter@example.test',role:'caregiver',status:'accepted'};
 db.invites.push(invite);
 let deletion=null;
 await page.route(API+'/rest/v1/dd_people**',route=>reply(route,[],200));
 await page.route(API+'/rest/v1/dd_team_invitations**',async route=>{
  if(route.request().method()==='DELETE'){
   deletion={url:route.request().url(),prefer:route.request().headers().prefer};
   db.invites.length=0;return reply(route,[{id:member}]);
  }
  return reply(route,db.invites);
 });
 await signin(page);await page.locator('#openTeam').click();
 await expect(page.locator('#teamSent')).toContainText('Shared profile');
 await expect(page.locator('#sendTeamInvite')).toBeDisabled();
 await page.getByRole('button',{name:'Revoke access',exact:true}).click();
 await page.getByRole('button',{name:'Confirm revoke access',exact:true}).click();
 await expect(page.locator('#notice')).toContainText('Invitation or access revoked.');
 await expect(page.locator('#teamSent')).toContainText('No invitations created yet.');
 expect(deletion.prefer).toBe('return=representation');
 expect(new URL(deletion.url).searchParams.get('id')).toBe('eq.'+member);
});
test('zero-row deletion does not falsely confirm revocation',async({page})=>{
 const db=await fakeBackend(page);
 db.invites.push({id:member,owner_id:owner,person_id:personId,invitee_email:'fictional-supporter@example.test',role:'caregiver',status:'accepted'});
 await page.route(API+'/rest/v1/dd_team_invitations**',route=>reply(route,route.request().method()==='DELETE'?[]:db.invites));
 await signin(page);await page.locator('#openTeam').click();
 await page.getByRole('button',{name:'Revoke access',exact:true}).click();
 await page.getByRole('button',{name:'Confirm revoke access',exact:true}).click();
 await expect(page.locator('#notice')).toContainText('Revocation could not be confirmed.');
 await expect(page.locator('#teamSent')).toContainText('fictional-supporter@example.test');
 expect(db.invites).toHaveLength(1);
});
test('profile request failure does not disable existing privacy controls',async({page})=>{
 const db=await fakeBackend(page);
 db.invites.push({id:member,owner_id:owner,person_id:personId,invitee_email:'fictional-supporter@example.test',role:'caregiver',status:'accepted'});
 await page.route(API+'/rest/v1/dd_people**',route=>reply(route,{message:'Fictional paid access unavailable'},403));
 await signin(page);await page.locator('#openTeam').click();
 await expect(page.locator('#teamSent')).toContainText('Shared profile');
 await expect(page.locator('#sendTeamInvite')).toBeDisabled();
 await expect(page.getByRole('button',{name:'Revoke access',exact:true})).toBeVisible();
});
