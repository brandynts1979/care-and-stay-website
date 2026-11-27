import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const API='https://iqgytijuufgkvnzolvqz.supabase.co',origin='http://127.0.0.1:4173';
const owner='11111111-1111-4111-8111-111111111111',profile='22222222-2222-4222-8222-222222222222',doc='33333333-3333-4333-8333-333333333333',reference='44444444-4444-4444-8444-444444444444';
const session={access_token:'fixture-token',refresh_token:'fixture-refresh',user:{id:owner,email:'fictional@example.invalid'}};
const pdf=Buffer.from('%PDF-1.4\nfictional archive bytes\n');
function json(route,body,status=200){return route.fulfill({status,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'},body:JSON.stringify(body)})}
async function setup(page,variant,enabled,options={}){
 const dir=variant==='dev'?'dd-caregiver-dev':'dd-family-care/app',path='/'+dir+'/',key=variant==='dev'?'dd_dev_session':'dd_family_session';
 const html=await readFile(resolve(process.cwd(),dir,'index.html'),'utf8');
 expect(html).toContain('const DD_PRIVACY_ARCHIVE_ENABLED=false;');
 const state={calls:[],deletion:'pending',release:null};
 await page.route('**/*',route=>route.request().url().startsWith(origin)?route.continue():route.abort());
 await page.route(origin+path,route=>route.fulfill({contentType:'text/html',body:enabled?html.replace('const DD_PRIVACY_ARCHIVE_ENABLED=false;','const DD_PRIVACY_ARCHIVE_ENABLED=true;'):html}));
 await page.route(API+'/**',async route=>{
  const req=route.request(),p=new URL(req.url()).pathname;
  if(p.startsWith('/auth/v1/token'))return json(route,session);
  if(p==='/auth/v1/logout')return json(route,{});
  if(p.startsWith('/rest/v1/'))return json(route,[]);
  if(p!=='/functions/v1/dd-owner-archive-staging')return json(route,{error:'Fixture unavailable'},503);
  if(req.method()==='OPTIONS')return route.fulfill({status:204,headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, apikey, content-type','Access-Control-Allow-Methods':'POST,OPTIONS'}});
  const body=JSON.parse(req.postData()||'{}');state.calls.push(body);
  if(options.delay&&body.kind==='profiles')await new Promise(r=>state.release=r);
  if(body.kind==='download')return route.fulfill({status:200,contentType:'application/pdf',headers:{'Access-Control-Allow-Origin':'*','Access-Control-Expose-Headers':'Content-Length','Content-Length':String(pdf.length)},body:pdf});
  if(body.kind==='deletion_request'){
   if(body.action==='cancel')state.deletion='cancelled';
   return json(route,{request_id:reference,state:state.deletion,requested_at:'2026-11-27T00:00:00Z',updated_at:'2026-11-27T00:00:00Z'});
  }
  const records=body.kind==='profiles'?[{id:profile,display_name:'Fictional profile'}]:body.kind==='documents'?[{id:doc,document_name:'Fictional.pdf'}]:[];
  return json(route,{kind:body.kind,records,next_after:body.kind==='profiles'&&body.after===null?profile:null});
 });
 await page.addInitScript(({key,session})=>sessionStorage.setItem(key,JSON.stringify(session)),{key,session});
 await page.goto(origin+path);await expect(page.locator('#dashboard')).toBeVisible();
 return state;
}
for(const variant of ['dev','public']){
 test(variant+' release-locked source hides archive and makes no calls',async({page})=>{
  const state=await setup(page,variant,false);
  await expect(page.locator('#openPrivacyArchive')).toBeHidden();expect(state.calls).toHaveLength(0);
 });
 test(variant+' expired-owner archive loads, downloads and pages without paid profile records',async({page})=>{
  const state=await setup(page,variant,true);
  await page.locator('#openPrivacyArchive').click();await page.locator('#archiveLoad').click();
  await expect(page.locator('#archiveCount')).toContainText('1 record(s)');
  await expect(page.locator('#deletionProfile')).toContainText('Fictional profile');
  const [download]=await Promise.all([page.waitForEvent('download'),page.locator('#archiveSave').click()]);
  expect(download.suggestedFilename()).toBe('dd-profiles-page.json');
  const data=JSON.parse(await readFile(await download.path(),'utf8'));expect(data.records[0].id).toBe(profile);
  await page.locator('#archiveNext').click();await expect(page.locator('#archiveCount')).toContainText('end of current results');
  expect(state.calls[1]).toEqual({kind:'profiles',after:profile,limit:25});
  await page.locator('#archiveKind').selectOption('documents');await page.locator('#archiveLoad').click();await page.locator('#archiveDocument').selectOption(doc);
  const [file]=await Promise.all([page.waitForEvent('download'),page.locator('#archiveDownload').click()]);
  expect(file.suggestedFilename()).toBe('document.pdf');expect(await readFile(await file.path())).toEqual(pdf);
 });
 test(variant+' reviewed deletion requires explicit consent and supports pending cancellation',async({page})=>{
  const state=await setup(page,variant,true);await page.locator('#openPrivacyArchive').click();await page.locator('#archiveLoad').click();
  await page.locator('#deletionProfile').selectOption(profile);await expect(page.locator('#deletionSubmit')).toBeDisabled();
  await page.locator('#deletionConfirm').check();await page.locator('#deletionSubmit').click();await expect(page.locator('#deletionNotice')).toContainText('Awaiting privacy review');
  expect(state.calls[1]).toMatchObject({kind:'deletion_request',action:'submit',confirmed:true,person_id:profile});
  await expect(page.locator('#deletionReference')).toHaveValue(reference);await page.locator('#deletionCancel').click();
  await expect(page.locator('#deletionNotice')).toContainText('cancelled');await expect(page.locator('#deletionCancel')).toBeDisabled();
 });
}
test('leaving privacy module and signing out cancels late archive response',async({page})=>{
 const state=await setup(page,'dev',true,{delay:true});await page.locator('#openPrivacyArchive').click();await page.locator('#archiveLoad').click();
 await expect.poll(()=>!!state.release).toBe(true);
 await page.locator('#signout').click();await expect(page.locator('#auth')).toBeVisible();
 state.release();await page.waitForTimeout(100);
 await expect(page.locator('#archiveCount')).toHaveText('');await expect(page.locator('#privacyArchiveModule')).toBeHidden();await expect(page.locator('#deletionReference')).toHaveValue('');
});
