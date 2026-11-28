// One protected runner for five industry pathways; no provisioning, billing, publishing or deploy actions.
import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {STAGING,PREVIEW,ROLES,validateFixture,exactEnrollment} from './industry-hosted-config.mjs';
let checkpoint='preflight';
const timeout=20000;
const safe=(ok,label)=>{if(!ok)throw Error(label)};
function loadFixture(){
 const path=process.env.INDUSTRY_QA_INPUT_FILE;
 safe(path&&statSync(path).isFile()&&(statSync(path).mode&0o077)===0,'Use a protected 0600 fixture file');
 return JSON.parse(readFileSync(path,'utf8'));
}
async function launch(){
 const load=createRequire(process.env.INDUSTRY_QA_PLAYWRIGHT_ANCHOR??'/app/tests/sales-360-browser/package.json');
 return load('playwright-core').chromium.launch({executablePath:process.env.SALES360_CHROMIUM??'/usr/bin/chromium'});
}
async function api(page,kind,params={}){
 // Only the authenticated browser performs these bounded same-project requests.
 // Never print auth material, response bodies, private content or signed URLs.
 const result=await page.evaluate(async ({base,kind,params})=>{
  const config=window.CARE_STAY_ACADEMY_CONFIG;
  const session=JSON.parse(localStorage.getItem('sb-dvdvjzqiiekakxzkhora-auth-token')??'null');
  if(config?.supabaseUrl!==base||!session?.access_token)throw Error('No scoped session');
  const headers={apikey:config.publishableKey,Authorization:'Bearer '+session.access_token,'Content-Type':'application/json'};
  let route,body,method='GET';
  if(kind==='enrollments'){route='/rest/v1/rpc/academy_learner_available_enrollments';method='POST';body={};}
  else if(kind==='manager'){route='/functions/v1/academy-manager';method='POST';body=params;}
  else if(kind==='worksheet-denial'){route='/rest/v1/rpc/academy_save_worksheet';method='POST';body=params;}
  else if(kind==='logout'){route='/auth/v1/logout?scope=local';method='POST';}
  else if(kind==='rows'){
   const allowed={academy_courses:['id','slug','title'],academy_modules:['id','course_id','position'],academy_lessons:['id','module_id','position','title'],academy_worksheet_templates:['id','lesson_id','title'],academy_worksheet_responses:['template_id','enrollment_id','answers'],academy_private_reflections:['enrollment_id','lesson_id','body'],academy_submissions:['id','enrollment_id','lesson_id','body'],academy_lesson_progress:['enrollment_id','lesson_id']};
   if(!allowed[params.table]||!params.columns.every(c=>allowed[params.table].includes(c)))throw Error('Disallowed projection');
   const q=new URLSearchParams({select:params.columns.join(',')});
   for(const [k,v] of Object.entries(params.filters??{})){
    if(!allowed[params.table].includes(k)||!/^[a-f0-9-]{36}$/.test(v))throw Error('Disallowed row filter');
    q.set(k,'eq.'+v);
   }
   route='/rest/v1/'+params.table+'?'+q.toString();
  }else throw Error('Disallowed request');
  const r=await fetch(base+route,{method,headers,...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(15000)});
  let data=null;try{data=await r.json();}catch{}
  return {status:r.status,data};
 },{base:STAGING,kind,params});
 return result;
}
async function rows(page,table,columns,filters={}){
 const r=await api(page,'rows',{table,columns,filters});
 safe(r.status===200&&Array.isArray(r.data),'Row read failed');
 return r.data;
}
async function setup(browser,fixture,pathway,role){
 const context=await browser.newContext({viewport:role==='gm'?{width:390,height:844}:{width:1280,height:800},acceptDownloads:true,serviceWorkers:'block'});
 let page;
 try{
  await context.route('**/*',route=>{
   const req=route.request(),origin=new URL(req.url()).origin;
   return origin===PREVIEW||origin===STAGING||(origin==='https://cdn.jsdelivr.net'&&req.method()==='GET')?route.continue():route.abort();
  });
  page=await context.newPage();page.setDefaultTimeout(timeout);
  const res=await page.goto(PREVIEW+'/academy/learn/',{waitUntil:'domcontentloaded'});
  safe(res?.status()===200,'Preview response failed');
  safe(/synthetic accounts only/i.test(await page.locator('body').innerText()),'Synthetic-only preview marker absent');
  const ready=await page.evaluate(({id,slug,base,key})=>{
   const c=window.CARE_STAY_ACADEMY_CONFIG,m=window.ACADEMY_GOAL_MAPS?.[id];
   return c?.supabaseUrl===base&&c?.publishableKey===key&&c?.billingEnabled===false&&m?.slug===slug&&m?.goals?.length===7;
  },{id:pathway.courseId,slug:pathway.slug,base:STAGING,key:fixture.publishable_key});
  safe(ready,'Preview does not contain exact industry build and billing-disabled staging config');
  const a=fixture[role];
  const auth=page.waitForResponse(r=>r.url()===STAGING+'/auth/v1/token?grant_type=password');
  await page.getByLabel('Email',{exact:true}).fill(a.email);
  await page.getByLabel('Password',{exact:true}).fill(a.password);
  await page.getByRole('button',{name:'Sign in',exact:true}).click();
  safe((await(await auth).json()).user?.id===a.user_id,'Authenticated identity mismatch');
  await page.locator('#courses h2').waitFor();
  await page.waitForFunction(()=>document.getElementById('courses')?.textContent.includes('No active course access')||document.querySelector('#courses .academy-lesson button'));
  const available=await api(page,'enrollments');safe(available.status===200,'Enrollment read failed');
  exactEnrollment(available.data,fixture,role);
  const locs=await api(page,'manager',{action:'list_locations'});
  safe(locs.status===200&&Array.isArray(locs.data?.locations),'Location read failed');
  const expected=role==='learner'?'manager':role;
  if(role==='outsider')safe(locs.data.locations.length===0,'Outsider location membership');
  else safe(locs.data.locations.length===1&&locs.data.locations[0].id===fixture.location_id&&locs.data.locations[0].name===fixture.location_name&&locs.data.locations[0].role===expected,'Location membership mismatch');
  return {context,page};
 }catch(error){await close({context,page});throw error;}
}
async function close({context,page}){
 try{if(page&&new URL(page.url()).origin===PREVIEW){const r=await api(page,'logout');safe(r.status===204,'Local logout failed');}}
 catch{console.error('Local fixture session logout could not be confirmed.');}
 finally{await context.close();}
}
async function openCourse(page,pathway,fixture){
 const visible=await rows(page,'academy_courses',['id','slug','title']);
 safe(visible.length===1&&visible[0].id===pathway.courseId&&visible[0].slug===pathway.slug,'Course visibility mismatch');
 const card=page.locator('#courses .academy-lesson').filter({hasText:fixture.location_name});
 safe(await card.count()===1,'Exact course card required');
 await card.getByRole('button',{name:'Open course',exact:true}).click();
 const progress=page.getByRole('progressbar',{name:'Course progress'});
 await progress.waitFor();await page.locator('.academy-module-card').first().waitFor();safe(await progress.getAttribute('aria-valuemax')==='32','Wrong lesson count');
 safe(await page.locator('.academy-module-card').count()===8&&await page.locator('.academy-lesson-row').count()===32,'Wrong module/lesson structure');
 safe(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Horizontal overflow');
 return visible[0].title;
}
async function goalAndLesson(page,pathway){
 const goal=page.getByLabel('Learning goal',{exact:true});
 await goal.selectOption({label:pathway.firstGoal});
 const goalPanel=page.locator('#lessons .academy-question').filter({has:page.getByRole('heading',{name:'Practice a learning goal'})});
 const suggestions=goalPanel.locator('ul button');
 safe(await suggestions.count()===3,'Wrong recommendation count');
 for(const id of pathway.firstGoalLessonIds){
  const found=await rows(page,'academy_lessons',['id','title'],{id});
  safe(found.length===1&&await goalPanel.getByRole('button',{name:found[0].title,exact:true}).count()===1,'Recommendation mismatch');
 }
 const lesson=await rows(page,'academy_lessons',['id','title'],{id:pathway.practiceLessonId});
 safe(lesson.length===1,'Practice lesson unavailable');
 if(pathway.settings.length){
  const setting=page.getByLabel('Care setting for the next lesson you open');
  const values=await setting.locator('option').evaluateAll(xs=>xs.map(x=>x.value).filter(Boolean));
  assert.deepEqual(values.sort(),[...pathway.settings].sort());
  await setting.selectOption(pathway.settings[0]);
 }
 const row=page.locator('.academy-lesson-row').filter({has:page.getByText(lesson[0].title,{exact:true})});
 safe(await row.count()===1,'Exact practice lesson missing');
 const module=row.locator('xpath=ancestor::details[1]');
 if(!await module.evaluate(x=>x.open))await module.locator('summary').first().click();
 await row.getByRole('button',{name:/^(Study|Review) lesson$/}).click();
 await page.getByRole('button',{name:'Save private reflection',exact:true}).waitFor();
 if(pathway.settings.length)await page.locator('#lessonDetail h3').filter({hasText:/^Practice for /}).waitFor();
 const activity=page.locator('#lessonDetail section.academy-question:has(> strong)');
 // Formative choices are not graded employment tests. Exercise each of the two
 // activity panels and confirm developmental feedback appears without copying it to logs.
 safe(await activity.count()===2,'Expected two formative activities');
 for(let i=0;i<2;i++){const panel=activity.nth(i);safe(await panel.getByRole('button').count()===3,'Expected three response choices');await panel.getByRole('button').first().click();safe((await panel.locator('p[aria-live="polite"]').innerText()).trim().length>0,'Missing developmental feedback');}
 return row;
}
async function playback(page,fixture,pathway){
 const r=await api(page,'manager',{action:'list_module_media',enrollment_id:fixture.learner.enrollment_id});
 safe(r.status===200&&r.data?.modules?.length===8,'Eight verified media associations required');
 for(let i=0;i<8;i++){
  const card=page.locator('.academy-module-card').nth(i);
  if(!await card.evaluate(x=>x.open))await card.locator('summary').first().click();
  await card.getByRole('button',{name:'Watch module video',exact:true}).click();
  const player=card.locator('video');await player.waitFor();
  await player.evaluate(v=>{v.muted=true;v.play().catch(()=>{});});
  await page.waitForFunction(index=>{const v=document.querySelectorAll('.academy-module-card')[index]?.querySelector('video');return v&&!v.error&&v.videoWidth>0&&v.currentTime>0&&!v.paused;},i,{timeout:15000});
  await player.evaluate(v=>{v.pause();v.removeAttribute('src');v.load();});
 }
}
async function run(fixture,pathway,withMedia){
 const browser=await launch();
 const marker='Synthetic industry QA '+pathway.key;
 const privateText=marker+' private reflection';
 const sharedText=marker+' shared practice';
 const worksheetText=marker+' private worksheet';
 let templateId;
 try{
  // Exercise learner first; owner/GM and outsider then prove separation.
  for(const role of ['learner','owner','gm','outsider']){
   checkpoint=pathway.key+' '+role+' sign-in';
   const session=await setup(browser,fixture,pathway,role),page=session.page;
   try{
    if(role==='outsider'){
     await page.getByText('No active course access is associated with this account.',{exact:false}).waitFor();
     safe((await rows(page,'academy_courses',['id'],{id:pathway.courseId})).length===0,'Outsider course exposed');
     safe((await rows(page,'academy_private_reflections',['enrollment_id'],{enrollment_id:fixture.learner.enrollment_id})).length===0,'Outsider reflection exposed');
     safe((await rows(page,'academy_worksheet_responses',['enrollment_id'],{enrollment_id:fixture.learner.enrollment_id})).length===0,'Outsider worksheet exposed');
     const denied=await api(page,'worksheet-denial',{p_enrollment:fixture.learner.enrollment_id,p_template:templateId,p_answers:{'1':'denied'}});
     safe(denied.status===401||denied.status===403,'Unauthorized worksheet write not denied');
     if(withMedia){const m=await api(page,'manager',{action:'list_module_media',enrollment_id:fixture.learner.enrollment_id});safe(m.status===403||m.status===404,'Unauthorized media list not denied');const deniedPlay=await api(page,'manager',{action:'play_module_media',enrollment_id:fixture.learner.enrollment_id,module_id:pathway.firstModuleId});safe(deniedPlay.status===403||deniedPlay.status===404,'Unauthorized signed playback not denied');}
    }else{
     checkpoint=pathway.key+' '+role+' exact course';
     await openCourse(page,pathway,fixture);
     if(role==='learner'){
      checkpoint=pathway.key+' learner activities and persistence';
      await goalAndLesson(page,pathway);
      const en=fixture.learner.enrollment_id,lesson=pathway.practiceLessonId;
      const filters={enrollment_id:en,lesson_id:lesson};
      const priorReflection=await rows(page,'academy_private_reflections',['body'],filters);
      const priorShared=await rows(page,'academy_submissions',['body'],filters);
      safe(priorReflection.every(x=>x.body===privateText)&&priorShared.every(x=>x.body===sharedText),'Refusing to overwrite existing nonfixture learning records');
      const templates=await rows(page,'academy_worksheet_templates',['id','title'],{lesson_id:lesson});
      safe(templates.length>0,'Practice lesson worksheet missing');
      templateId=templates[0].id;
      const old=await rows(page,'academy_worksheet_responses',['answers'],{enrollment_id:en,template_id:templateId});
      safe(old.every(x=>Object.entries(x.answers).every(([k,v])=>v===''||(k==='1'&&v===worksheetText))),'Refusing to overwrite nonfixture worksheet');
      await page.getByLabel('My private reflection',{exact:true}).fill(privateText);
      await page.getByRole('button',{name:'Save private reflection',exact:true}).click();
      await page.getByText('Private reflection saved successfully.',{exact:false}).waitFor();
      await page.getByLabel('My real-world practice and what I learned',{exact:true}).fill(sharedText);
      await page.getByRole('button',{name:/^(Share practice for review|Update shared practice submission)$/}).click();
      await page.getByText('Practice submission saved and available to your assigned reviewer.',{exact:false}).waitFor();
      const worksheet=page.locator('#lessonDetail .academy-question').filter({has:page.getByRole('heading',{name:templates[0].title,exact:true})});
      await worksheet.locator('textarea').first().fill(worksheetText);
      await worksheet.getByRole('button',{name:'Save private worksheet',exact:true}).click();
      await worksheet.getByText('Private worksheet saved.',{exact:true}).waitFor();
      const completion=page.getByRole('button',{name:/^(Mark lesson complete|Completed ✓)$/});
      if(await completion.innerText()==='Mark lesson complete'){await completion.click();await page.getByText('Lesson progress saved.',{exact:true}).waitFor();}
      safe((await rows(page,'academy_lesson_progress',['lesson_id'],filters)).length===1,'Progress not persisted');
      await page.reload({waitUntil:'domcontentloaded'});await page.locator('#courses .academy-lesson button').first().waitFor();
      await openCourse(page,pathway,fixture);await goalAndLesson(page,pathway);
      safe(await page.getByLabel('My private reflection',{exact:true}).inputValue()===privateText,'Reflection not restored');
      safe(await page.getByLabel('My real-world practice and what I learned',{exact:true}).inputValue()===sharedText,'Submission not restored');
      safe(await page.locator('#lessonDetail .academy-question').filter({has:page.getByRole('heading',{name:templates[0].title,exact:true})}).locator('textarea').first().inputValue()===worksheetText,'Worksheet not restored');
      safe(await page.getByRole('button',{name:'Completed ✓',exact:true}).count()===1,'Completion not restored');
      if(withMedia){checkpoint=pathway.key+' eight signed videos';await playback(page,fixture,pathway);}
     }else{
      checkpoint=pathway.key+' '+role+' team and confidentiality';
      await page.getByRole('button',{name:'View team',exact:true}).click();
      await page.getByRole('heading',{name:'Team learning progress',exact:true}).waitFor();
      const f={enrollment_id:fixture.learner.enrollment_id};
      safe((await rows(page,'academy_private_reflections',['enrollment_id'],f)).length===0,'Manager reflection access');
      safe((await rows(page,'academy_worksheet_responses',['enrollment_id'],f)).length===0,'Manager worksheet access');
      const shared=await rows(page,'academy_submissions',['body'],f);
      safe(role==='gm'?shared.some(x=>x.body===sharedText):shared.length===0,'Assigned review boundary mismatch');
      const team=page.locator('#locationsPanel [data-team]');
      safe(!(await team.innerText()).includes(privateText)&&!(await team.innerText()).includes(worksheetText),'Private content in report');
      if(role==='gm'){
       const item=page.locator('#reviewer .academy-lesson').filter({has:page.getByText(sharedText,{exact:true})});
       await item.waitFor();await item.locator('textarea').fill(marker+' reviewer feedback');
       await item.getByRole('button',{name:'Approve',exact:true}).click();await page.getByText('Your review was saved.',{exact:true}).waitFor();
      }
     }
    }
    console.log('PASS '+pathway.key+' '+role+' hosted journey');
   }finally{await close(session);}
  }
 }finally{await browser.close();}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{
  safe(!process.env.DEBUG&&!process.env.PWDEBUG&&!process.env.NODE_DEBUG&&!process.env.NODE_OPTIONS&&!process.env.SSLKEYLOGFILE&&process.env.NODE_TLS_REJECT_UNAUTHORIZED!=='0','Unsafe runtime logging or TLS options');
  if(process.argv[2]==='runner-check'){const b=await launch();await b.close();console.log('PASS Chromium startup');}
  else{
   safe(process.env.INDUSTRY_PROTECTED_OPERATOR_CONFIRM==='true','Protected operator confirmation required');
   safe(['browser','browser-media'].includes(process.argv[2]),'Unknown mode');
   const fixture=loadFixture(),pathway=validateFixture(fixture);
   await run(fixture,pathway,process.argv[2]==='browser-media');
   console.log('PASS requested industry hosted phase; dedicated synthetic writes retained for repeat acceptance');
  }
 }catch{console.error('Industry QA stopped at '+checkpoint+'. No credentials, response bodies or signed URLs printed.');process.exitCode=1;}
}
