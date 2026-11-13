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
 const state={people:[],strengths:[],goals:[],steps:[],notes:[],invites:[],tasks:[],docs:[],files:new Map(),next:0};
 const id=()=>('00000000-0000-4000-8000-'+String(++state.next).padStart(12,'0'));
 await page.route(API+'/**', async route=>{
  const req=route.request(),url=new URL(req.url()),pathname=url.pathname,method=req.method();
  if(pathname.startsWith('/auth/v1/token'))return reply(route,session);
  if(pathname==='/auth/v1/logout')return reply(route,{});
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
  const mapping={dd_people:'people',dd_strengths:'strengths',dd_goals:'goals',dd_goal_steps:'steps',dd_progress_notes:'notes',dd_team_invitations:'invites',dd_care_tasks:'tasks',dd_documents:'docs'};
  if(!mapping[table])return reply(route,{message:'Unexpected API call: '+pathname},404);
  const rows=state[mapping[table]];
  if(method==='GET'){
    let result=[...rows];
    for(const key of ['person_id','goal_id','id','status']){
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
 await page.locator('#backHome').click();
 await page.locator('#openTeam').click();
 await page.locator('#teamPerson').selectOption(db.people[0].id);
 await page.locator('#teamEmail').fill('fictional-supporter@example.test');
 await page.locator('#teamAuthority').check();
 await page.locator('#sendTeamInvite').click();
 await expect.poll(()=>db.invites.length).toBe(1);
 expect(db.invites[0].invitee_email).toBe('fictional-supporter@example.test');
 await page.getByRole('button',{name:'Revoke access'}).click();
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
