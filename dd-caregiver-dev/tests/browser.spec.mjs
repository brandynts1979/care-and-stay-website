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
test('dashboard routes to modules and signs out cleanly',async({page})=>{
 await fakeBackend(page);await signin(page);
 for(const [open,module] of [['openStrengths','strengthsModule'],['openTeam','teamModule'],['openTasks','tasksModule'],['openDocuments','documentsModule']]){
  await page.locator('#'+open).click();await expect(page.locator('#'+module)).toBeVisible();
  const back={strengthsModule:'backHome',teamModule:'teamBackHome',tasksModule:'tasksBackHome',documentsModule:'documentsBackHome'}[module];
  await page.locator('#'+back).click();await expect(page.locator('#dashboard')).toBeVisible();
 }
 await page.locator('#signout').click();
 await expect(page.locator('#auth')).toBeVisible();
});
test('fictional profile, strengths, goal and progress work end-to-end in UI',async({page})=>{
 const db=await fakeBackend(page);await signin(page);
 await page.locator('#openStrengths').click();
 await page.locator('#personName').fill('Alex Sample');
 await page.locator('#communication').fill('Visual choices');
 await page.locator('#savePerson').click();
 await expect(page.locator('#details')).toBeVisible();
 await page.locator('#addStrength').click();
 await expect.poll(()=>db.strengths.length).toBe(1);
 await page.locator('#addGoal').click();
 await expect.poll(()=>db.goals.length).toBe(1);
 await page.locator('#activeGoal').selectOption(db.goals[0].id);
 await page.locator('#step').fill('Choose snack');
 await page.locator('#addStep').click();
 await page.locator('#observation').fill('Prepared snack together');
 await page.locator('#addNote').click();
 await expect.poll(()=>db.notes.length).toBe(1);
});
test('fictional file can upload download and delete through documents interface',async({page})=>{
 const db=await fakeBackend(page);await signin(page);
 await page.locator('#openStrengths').click();
 await page.locator('#personName').fill('Alex Sample');
 await page.locator('#savePerson').click();
 await page.locator('#backHome').click();
 await page.locator('#openDocuments').click();
 await page.locator('#docPerson').selectOption(db.people[0].id);
 await page.locator('#docName').fill('Sample.pdf');
 await page.locator('#docFile').setInputFiles({name:'sample.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-1.4\nfictional test content\n')});
 await page.locator('#uploadDocument').click();
 await expect.poll(()=>db.docs.length).toBe(1);
 await expect.poll(()=>db.files.size).toBe(1);
 const downloadPromise=page.waitForEvent('download');
 await page.getByRole('button',{name:'Download'}).click();
 const download=await downloadPromise;
 expect(download.suggestedFilename()).toBe('Sample.pdf');
 await page.getByRole('button',{name:'Delete document'}).click();
 await expect(page.getByRole('button',{name:'Confirm delete document'})).toBeVisible();
 expect(db.docs).toHaveLength(1);
 expect(db.files.size).toBe(1);
 await page.getByRole('button',{name:'Confirm delete document'}).click();
 await expect.poll(()=>db.docs.length).toBe(0);
 await expect.poll(()=>db.files.size).toBe(0);
});
test('owner can create a task and update its status',async({page})=>{
 const db=await fakeBackend(page);await signin(page);
 await page.locator('#openStrengths').click();
 await page.locator('#personName').fill('Alex Sample');
 await page.locator('#savePerson').click();
 await page.locator('#backHome').click();
 await page.locator('#openTasks').click();
 await page.locator('#taskPerson').selectOption(db.people[0].id);
 await page.locator('#taskTitle').fill('Prepare fictional snack');
 await page.locator('#createTask').click();
 await expect.poll(()=>db.tasks.length).toBe(1);
 await page.locator('#taskList select').selectOption('completed');
 await expect.poll(()=>db.tasks[0].status).toBe('completed');
 await page.getByRole('button',{name:'Delete task'}).click();
 await expect(page.getByRole('button',{name:'Confirm delete task'})).toBeVisible();
 expect(db.tasks).toHaveLength(1);
 await page.getByRole('button',{name:'Confirm delete task'}).click();
 await expect.poll(()=>db.tasks.length).toBe(0);
});

test('owner can create and revoke a fictional family invitation',async({page})=>{
 const db=await fakeBackend(page);await signin(page);
 await page.locator('#openStrengths').click();
 await page.locator('#personName').fill('Alex Sample');
 await page.locator('#savePerson').click();
 await expect.poll(()=>db.people.length).toBe(1);
 await page.locator('#backHome').click();
 await page.locator('#openTeam').click();
 await page.locator('#teamPerson').selectOption(db.people[0].id);
 await page.locator('#teamEmail').fill('fictional-supporter@example.test');
 await page.locator('#teamAuthority').check();
 await page.locator('#sendTeamInvite').click();
 await expect.poll(()=>db.invites.length).toBe(1);
 expect(db.invites[0].invitee_email).toBe('fictional-supporter@example.test');
 await page.getByRole('button',{name:'Revoke access'}).click();
 await expect(page.getByRole('button',{name:'Confirm revoke access'})).toBeVisible();
 expect(db.invites).toHaveLength(1);
 await page.getByRole('button',{name:'Confirm revoke access'}).click();
 await expect.poll(()=>db.invites.length).toBe(0);
});

test('documents reject unsupported formats and oversize files before upload',async({page})=>{
 const db=await fakeBackend(page);await signin(page);
 await page.locator('#openStrengths').click();
 await page.locator('#personName').fill('Alex Sample');
 await page.locator('#savePerson').click();
 await page.locator('#backHome').click();
 await page.locator('#openDocuments').click();
 await page.locator('#docPerson').selectOption(db.people[0].id);
 await page.locator('#docName').fill('Test document');
 await page.locator('#docFile').setInputFiles({name:'test.txt',mimeType:'text/plain',buffer:Buffer.from('fictional')});
 await page.locator('#uploadDocument').click();
 await expect(page.locator('#notice')).toContainText('Only PDF, PNG and JPEG');
 expect(db.docs).toHaveLength(0);
 await page.locator('#docFile').setInputFiles({name:'huge.pdf',mimeType:'application/pdf',buffer:Buffer.alloc(10485761)});
 await page.locator('#uploadDocument').click();
 await expect(page.locator('#notice')).toContainText('10 MB');
 expect(db.docs).toHaveLength(0);
});
test('shared document library does not expose files through the UI',async({page})=>{
 const db=await fakeBackend(page);await signin(page);
 await page.locator('#openDocuments').click();
 await expect(page.locator('#documentsModule')).toContainText('Only the profile owner');
 await expect(page.locator('#docList')).toContainText('No documents saved yet');
 expect(db.files.size).toBe(0);
});

test('expired session immediately hides dashboard and requires sign in',async({page})=>{
 await fakeBackend(page);await signin(page);
 await page.route(API+'/auth/v1/token?grant_type=refresh_token',route=>reply(route,{message:'Invalid refresh token'},401));
 await page.locator('#openTasks').click();
 await expect(page.locator('#auth')).toBeVisible();
 await expect(page.locator('#app')).toBeHidden();
 await expect(page.locator('#signedin')).toHaveText('');
 await expect(page.locator('#notice')).toContainText('Session expired');
 expect(await page.evaluate(()=>sessionStorage.getItem('dd_dev_session'))).toBeNull();
});

test('mobile viewport keeps signed-out login and warning usable without horizontal overflow',async({page})=>{
 await page.setViewportSize({width:375,height:812});
 await page.goto('/');
 await expect(page.locator('#auth')).toBeVisible();
 await expect(page.getByText('Development environment. Use only fictional profiles and test accounts.',{exact:false})).toBeVisible();
 await expect(page.locator('#email')).toBeVisible();
 await expect(page.locator('#password')).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1)).toBeTruthy();
});
test('keyboard users can reach sign-in controls',async({page})=>{
 await page.goto('/');
 await page.locator('body').click({position:{x:5,y:5}});
 const visited=new Set();
 for(let i=0;i<16;i++){
  await page.keyboard.press('Tab');
  visited.add(await page.evaluate(()=>document.activeElement?.id||''));
 }
 expect(visited.has('email')).toBeTruthy();
 expect(visited.has('password')).toBeTruthy();
 expect(visited.has('signin')).toBeTruthy();
});

test('password recovery request uses configured app redirect and neutral email message',async({page})=>{
 let sent=null;
 await page.route(API+'/auth/v1/recover**',async route=>{sent={url:route.request().url(),body:route.request().postDataJSON()};return reply(route,{})});
 await page.goto('/');
 await page.locator('#email').fill('fictional-owner@example.test');
 await page.locator('#forgotPassword').click();
 await expect(page.locator('#notice')).toContainText('If this address has an account');
 expect(sent.body.email).toBe('fictional-owner@example.test');
 expect(new URL(sent.url).searchParams.get('redirect_to')).toBe('http://127.0.0.1:4173/');
});
test('recovery token opens password update form and never persists token in browser storage',async({page})=>{
 await page.route(API+'/auth/v1/user',async route=>{
  if(route.request().method()==='GET')return reply(route,{email:'fictional-owner@example.test'});
  if(route.request().method()==='PUT')return reply(route,{id:'11111111-1111-4111-8111-111111111111'});
  return reply(route,{},405);
 });
 await page.goto('/#type=recovery&access_token=fictional-recovery-jwt');
 await expect(page.locator('#passwordReset')).toBeVisible();
 await expect(page.locator('#app')).toBeHidden();
 expect(await page.evaluate(()=>location.hash)).toBe('');
 expect(await page.evaluate(()=>sessionStorage.getItem('dd_dev_session'))).toBeNull();
 await page.locator('#resetPassword').fill('differentPassword123!');
 await page.locator('#resetPasswordConfirm').fill('differentPassword123!');
 let changed=null;
 await page.route(API+'/auth/v1/user',async route=>{
  if(route.request().method()==='PUT'){changed=route.request().postDataJSON();return reply(route,{id:'11111111-1111-4111-8111-111111111111'})}
  return reply(route,{email:'fictional-owner@example.test'});
 });
 await page.locator('#saveResetPassword').click();
 await expect(page.locator('#auth')).toBeVisible();
 await expect(page.locator('#passwordReset')).toBeHidden();
 await expect(page.locator('#notice')).toContainText('Password updated');
 expect(changed.password).toBe('differentPassword123!');
 expect(await page.evaluate(()=>sessionStorage.getItem('dd_dev_session'))).toBeNull();
});

test('server upload handler cleans up on metadata rejection',async({page})=>{
 const db=await fakeBackend(page);await signin(page);
 await page.locator('#openStrengths').click();
 await page.locator('#personName').fill('Fictional metadata failure');
 await page.locator('#savePerson').click();
 await page.locator('#backHome').click();
 await page.locator('#openDocuments').click();
 await page.locator('#docPerson').selectOption(db.people[0].id);
 await page.locator('#docName').fill('Disposable test document');
 await page.locator('#docFile').setInputFiles({name:'test.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-1.4\\nfictional\\n')});
 db.failMetadataOnce=true;
 await page.locator('#uploadDocument').click();
 await expect(page.locator('#notice')).toContainText('Document metadata could not be saved');
 expect(db.uploads).toBe(1);
 expect(db.removals).toBe(1);
 expect(db.files.size).toBe(0);
 expect(db.docs).toHaveLength(0);
});
test('failed storage deletion preserves document metadata for retry',async({page})=>{
 const db=await fakeBackend(page);await signin(page);
 await page.locator('#openStrengths').click();
 await page.locator('#personName').fill('Fictional delete failure');
 await page.locator('#savePerson').click();
 await page.locator('#backHome').click();
 await page.locator('#openDocuments').click();
 await page.locator('#docPerson').selectOption(db.people[0].id);
 await page.locator('#docName').fill('Keep if storage fails');
 await page.locator('#docFile').setInputFiles({name:'test.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-1.4\\nfictional\\n')});
 await page.locator('#uploadDocument').click();
 await expect.poll(()=>db.docs.length).toBe(1);
 expect(db.files.size).toBe(1);
 await page.route(API+'/storage/v1/object/dd-private-documents',route=>route.request().method()==='DELETE'?reply(route,{message:'Synthetic storage delete rejection'},403):route.fallback());
 await page.getByRole('button',{name:'Delete document'}).click();
 await page.getByRole('button',{name:'Confirm delete document'}).click();
 await expect(page.locator('#notice')).toContainText('Document deletion error: 403');
 expect(db.docs).toHaveLength(1);
 expect(db.files.size).toBe(1);
});

test('document uploader rejects a text payload disguised as an allowed PDF or image',async({page})=>{
 const db=await fakeBackend(page);await signin(page);
 await page.locator('#openStrengths').click();
 await page.locator('#personName').fill('Fictional signature check');
 await page.locator('#savePerson').click();
 await expect.poll(()=>db.people.length).toBe(1);
 await page.locator('#backHome').click();
 await page.locator('#openDocuments').click();
 await page.locator('#docPerson').selectOption(db.people[0].id);
 await page.locator('#docName').fill('Disguised file');
 for(const [name,mimeType] of [['renamed.pdf','application/pdf'],['renamed.png','image/png'],['renamed.jpg','image/jpeg']]){
  await page.locator('#docFile').setInputFiles({name,mimeType,buffer:Buffer.from('Not a real PDF or image file')});
  await page.locator('#uploadDocument').click();
  await expect(page.locator('#notice')).toContainText('File content does not match');
  expect(db.files.size).toBe(0);
  expect(db.docs).toHaveLength(0);
 }
});

test('incomplete password-recovery link is safely rejected without opening account data',async({page})=>{
 await page.goto('/#type=recovery');
 await expect(page.locator('#auth')).toBeVisible();
 await expect(page.locator('#passwordReset')).toBeHidden();
 await expect(page.locator('#app')).toBeHidden();
 await expect(page.locator('#notice')).toContainText('Password recovery link is incomplete');
 expect(await page.evaluate(()=>location.hash)).toBe('');
 expect(await page.evaluate(()=>sessionStorage.getItem('dd_dev_session'))).toBeNull();
});
test('expired password-recovery link is rejected without exposing reset form',async({page})=>{
 await page.route(API+'/auth/v1/user',route=>reply(route,{message:'Invalid JWT'},401));
 await page.goto('/#type=recovery&access_token=invalid-fictional-jwt');
 await expect(page.locator('#passwordReset')).toBeHidden();
 await expect(page.locator('#auth')).toBeVisible();
 await expect(page.locator('#notice')).toContainText('Recovery link is expired or invalid');
 expect(await page.evaluate(()=>location.hash)).toBe('');
});
test('rejected recovered-password update clears recovery form and requires another link',async({page})=>{
 await page.route(API+'/auth/v1/user',route=>
  route.request().method()==='GET'
  ?reply(route,{email:'fictional-owner@example.test'})
  :reply(route,{message:'Expired token'},401)
 );
 await page.goto('/#type=recovery&access_token=fictional-expired-on-update');
 await expect(page.locator('#passwordReset')).toBeVisible();
 await page.locator('#resetPassword').fill('FictionalTest1234!');
 await page.locator('#resetPasswordConfirm').fill('FictionalTest1234!');
 await page.locator('#saveResetPassword').click();
 await expect(page.locator('#passwordReset')).toBeHidden();
 await expect(page.locator('#auth')).toBeVisible();
 await expect(page.locator('#notice')).toContainText('Request a new password-reset link');
 expect(await page.locator('#resetPassword').inputValue()).toBe('');
 expect(await page.evaluate(()=>sessionStorage.getItem('dd_dev_session'))).toBeNull();
});
test('mismatched new passwords cannot be submitted for recovery',async({page})=>{
 let putRequests=0;
 await page.route(API+'/auth/v1/user',route=>{
  if(route.request().method()==='PUT')putRequests++;
  return reply(route,{email:'fictional-owner@example.test'});
 });
 await page.goto('/#type=recovery&access_token=fictional-jwt');
 await page.locator('#resetPassword').fill('FictionalTest1234!');
 await page.locator('#resetPasswordConfirm').fill('Different1234567!');
 await page.locator('#saveResetPassword').click();
 await expect(page.locator('#notice')).toContainText('The new passwords do not match');
 expect(putRequests).toBe(0);
 await expect(page.locator('#passwordReset')).toBeVisible();
});

test('signout clears fictional profile fields and rendered private content',async({page})=>{
 const db=await fakeBackend(page);await signin(page);
 await page.locator('#openStrengths').click();
 await page.locator('#personName').fill('Private fictional profile');
 await page.locator('#communication').fill('Visual schedule');
 await page.locator('#matters').fill('Fictional private preference');
 await page.locator('#savePerson').click();
 await expect.poll(()=>db.people.length).toBe(1);
 await page.locator('#backHome').click();
 await page.locator('#signout').click();
 await expect(page.locator('#auth')).toBeVisible();
 await expect(page.locator('#app')).toBeHidden();
 expect(await page.locator('#personName').inputValue()).toBe('');
 expect(await page.locator('#communication').inputValue()).toBe('');
 expect(await page.locator('#matters').inputValue()).toBe('');
 await expect(page.locator('#details')).toBeHidden();
 await expect(page.locator('#strengthList')).toBeEmpty();
 await expect(page.locator('#goalList')).toBeEmpty();
 await expect(page.locator('#teamSent')).toBeEmpty();
 await expect(page.locator('#teamReceived')).toBeEmpty();
 expect(await page.evaluate(()=>sessionStorage.getItem('dd_dev_session'))).toBeNull();
});

test('four new care-planning modules support fictional records',async({page})=>{
 const db=await fakeBackend(page);await signin(page);
 await page.locator('#openStrengths').click();
 await page.locator('#personName').fill('Fictional QA Person');
 await page.locator('#savePerson').click();
 await expect.poll(()=>db.people.length).toBe(1);
 await page.locator('#backHome').click();
 for(const [id,category] of [['openHealth','health'],['openEducation','education'],['openBenefits','benefits'],['openTransitions','transitions']]){
  await page.locator('#'+id).click();
  await expect(page.locator('#supportRecordsModule')).toBeVisible();
  await page.locator('#supportPerson').selectOption(db.people[0].id);
  await page.locator('#supportTitle').fill('QA '+category);
  await page.locator('#addSupportRecord').click();
  await expect.poll(()=>db.supportRecords.filter(x=>x.category===category).length).toBe(1);
  const row=db.supportRecords.find(x=>x.category===category);
  await page.locator('#supportRecordsList select').selectOption('completed');
  await expect.poll(()=>row.status).toBe('completed');
  await page.getByRole('button',{name:'Delete record'}).click();
  await expect(page.getByRole('button',{name:'Confirm delete record'})).toBeVisible();
  expect(db.supportRecords.filter(x=>x.category===category)).toHaveLength(1);
  await page.getByRole('button',{name:'Confirm delete record'}).click();
  await expect.poll(()=>db.supportRecords.filter(x=>x.category===category).length).toBe(0);
  await page.locator('#supportRecordsBackHome').click();
 }
});



test('DD care records clear on sign out and remain mobile usable',async({page})=>{
 await page.setViewportSize({width:375,height:812});
 const db=await fakeBackend(page);await signin(page);
 await page.locator('#openStrengths').click();
 await page.locator('#personName').fill('Fictional mobile QA');
 await page.locator('#savePerson').click();
 await expect.poll(()=>db.people.length).toBe(1);
 await page.locator('#backHome').click();
 await page.locator('#openEducation').click();
 await page.locator('#supportPerson').selectOption(db.people[0].id);
 await page.locator('#supportTitle').fill('Fictional private note');
 await page.locator('#supportDetails').fill('Should be cleared on signout');
 await page.locator('#addSupportRecord').click();
 await expect(page.locator('#supportRecordsList')).toContainText('Fictional private note');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1)).toBeTruthy();
 await page.locator('#supportRecordsBackHome').click();
 await page.locator('#signout').click();
 await expect(page.locator('#app')).toBeHidden();
 await expect(page.locator('#supportRecordsList')).toBeEmpty();
 expect(await page.locator('#supportTitle').inputValue()).toBe('');
 expect(await page.locator('#supportDetails').inputValue()).toBe('');
 expect(await page.evaluate(()=>sessionStorage.getItem('dd_dev_session'))).toBeNull();
});

test('new DD test accounts require a 12-character password before network request',async({page})=>{
 let calls=0;
 await page.route(API+'/auth/v1/signup**',route=>{calls++;return reply(route,{})});
 await page.goto('/');
 await page.locator('#email').fill('qa-fictional@example.test');
 await page.locator('#password').fill('short123');
 await page.locator('#signup').click();
 await expect(page.locator('#notice')).toContainText('at least 12 characters');
 expect(calls).toBe(0);
});
