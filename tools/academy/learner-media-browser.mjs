// Browser rehearsal with fictional Supabase adapter and no external network.
// Verifies actual learner app DOM and session cleanup; does NOT prove hosted playback.
import {readFileSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';

const dir=mkdtempSync(join(tmpdir(),'academy-media-browser-'));
const app=readFileSync(new URL('../../academy/learn/app.js',import.meta.url),'utf8');
const fixture=String.raw`
const origin='https://fixture.supabase.co';
window.CARE_STAY_ACADEMY_CONFIG={supabaseUrl:origin,publishableKey:'fictional-browser-test'};
let currentUser={id:'fixture-user',email:'learner@example.invalid'},authCallback;
let playResponse={url:origin+'/storage/v1/object/sign/academy-module-media/module/file.mp4?token=fictional'};
let deferred=null,playRequests=0,listFails=false,reflectionDeferred=null,writes=[],certificateBlob=null;
URL.createObjectURL=blob=>{certificateBlob=blob;return 'blob:fictional-certificate';};
URL.revokeObjectURL=()=>{};
HTMLAnchorElement.prototype.click=function(){};

const e={id:'fixture-enrollment',course_id:'fixture-course',location_name:'Fictional restaurant',status:'active'};
const e2={...e,id:'fixture-enrollment-2',location_name:'Second fictional restaurant',status:'completed'};
const data={
 academy_courses:[{id:e.course_id,slug:'qsr-fixture-v2',title:'Fictional QSR Academy',published:true}],
 academy_modules:[{id:'fixture-module',title:'Learn with care',position:1,overview:''}],
 academy_lessons:[{id:'fixture-lesson',module_id:'fixture-module',position:1,title:'Fictional lesson',body:'Practice listening.'}],
 academy_lesson_progress:[],academy_reviewer_assignments:[],
 academy_worksheet_templates:[{id:'fixture-worksheet',title:'Fictional worksheet',prompts:['What would you try?'],version:1}],
 academy_worksheet_responses:[{template_id:'fixture-worksheet',answers:{'1':'Stored fictional draft'}}]
};
const result=data=>({data,error:null});
function query(table){
 const filters={};
 const q={then(resolve){
   if(table==='academy_private_reflections'){
     if(reflectionDeferred&&filters.enrollment_id===e.id){reflectionDeferred.resolve=()=>resolve(result([{body:'STALE PRIVATE LOCATION ONE'}]));return;}
     return resolve(result([{body:filters.enrollment_id===e2.id?'Second location reflection':'First location reflection'}]));
   }
   resolve(result(data[table]||[]));
 },upsert:async(row)=>{writes.push({table,row});return result([]);}};
 q.eq=(key,value)=>{filters[key]=value;return q;};
 for(const op of ['select','in','order'])q[op]=()=>q;
 return q;
}
window.supabase={createClient:()=>({
 auth:{getUser:async()=>result({user:currentUser}),onAuthStateChange:cb=>{authCallback=cb;},
 signInWithPassword:async()=>{currentUser={id:'fixture-user',email:'learner@example.invalid'};return result({});},
 signOut:async()=>{currentUser=null;authCallback('SIGNED_OUT');return result({});}},
 from:query,rpc:async(name,params)=>{
   if(name==='academy_learner_available_enrollments')return result([e,e2]);
   if(name==='academy_save_worksheet'){writes.push({table:'worksheet',row:params});return result(null);}
   if(name==='academy_my_completion_certificate'){
     check(params.p_enrollment===e2.id,'Certificate requires exact completed enrollment');
     return result([{course_title:'Fictional <script>text</script>',awarded_at:'2026-11-25T00:00:00Z'}]);
   }
   throw Error('Unexpected RPC '+name);
 },
 functions:{invoke:async(name,{body})=>{
   if(body.action==='list_locations')return result({locations:[]});
   if(body.action==='demo_status')return result({eligible:false});
   if(body.action==='pending_invites')return result({invitations:[]});
   if(body.action==='list_module_media')return listFails?{error:new Error('fixture unavailable')}:result({modules:[{module_id:'fixture-module',title:'Fictional captioned video',duration_seconds:137,captioned:true}]});
   if(body.action==='play_module_media'){
     if(body.enrollment_id!==e.id||body.module_id!=='fixture-module')throw Error('Incorrect media request scope');
     playRequests++;
     if(deferred)return new Promise(resolve=>{deferred.resolve=()=>resolve(result(playResponse));});
     return result(playResponse);
   }
   throw Error('Unexpected fixture action '+body.action);
 }}
})};
function check(test,label){if(!test)throw Error(label);}
const tick=()=>new Promise(r=>setTimeout(r,25));
async function waitFor(fn,label){for(let i=0;i<40;i++){if(fn())return;await tick();}throw Error('Timeout: '+label);}
const btn=label=>[...document.querySelectorAll('button')].find(b=>b.textContent===label);
const video=()=>document.querySelector('video');
async function signIn(){
 document.getElementById('email').value='learner@example.invalid';
 document.getElementById('password').value='fictional-test-only';
 document.getElementById('authForm').dispatchEvent(new Event('submit',{cancelable:true}));
 await waitFor(()=>btn('Open course'),'sign-in course');
}
async function open(){
 btn('Open course').click();await waitFor(()=>btn('Study lesson'),'lesson list');
}
async function run(){
 await waitFor(()=>btn('Open course'),'initial course');
 await open();
 check(playRequests===0&&!video(),'Never request signed URL while listing');
 btn('Watch module video').click();await waitFor(video,'video mounted');
 const old=video();
 check(old.controls&&old.playsInline&&old.getAttribute('aria-label').includes('captioned'),'Native controls and accessibility');
 check(old.src.startsWith(origin+'/storage/v1/object/sign/academy-module-media/'),'Expected private playback URL');
 currentUser=null;authCallback('SIGNED_OUT');
 check(!old.isConnected&&!old.hasAttribute('src')&&!video(),'Sign-out releases video source and removes player');
 await signIn();await open();playResponse={url:'https://untrusted.invalid/video.mp4?token=wrong'};
 btn('Watch module video').click();await waitFor(()=>document.querySelector('.academy-module-video').textContent.includes('Video unavailable'),'foreign URL rejected');
 check(!video(),'Foreign media origin must never mount');
 playResponse={url:origin+'/storage/v1/object/sign/academy-module-media/module/file.mp4?token=fictional'};
 deferred={};btn('Watch module video').click();await waitFor(()=>deferred.resolve,'pending signed request');
 authCallback('PASSWORD_RECOVERY');deferred.resolve();deferred=null;await tick();await tick();
 check(!video()&&!document.querySelector('.academy-module-video'),'Late response must not restore player during recovery');
 check(!document.getElementById('recoveryPanel').classList.contains('academy-hide'),'Recovery visible');
 currentUser=null;authCallback('SIGNED_OUT');listFails=true;
 await signIn();await open();
 check(!!btn('Study lesson')&&!btn('Watch module video'),'Optional media outage must preserve reading');
 reflectionDeferred={};btn('Study lesson').click();await waitFor(()=>reflectionDeferred.resolve,'pending private reflection read');
 const second=[...document.querySelectorAll('button')].filter(b=>b.textContent==='Open course')[1];
 second.click();await waitFor(()=>btn('Study lesson'),'second location lessons');
 btn('Study lesson').click();await waitFor(()=>btn('Save private reflection'),'second location reflection');
 const currentInput=document.querySelector('#lessonDetail textarea');
 check(currentInput.value==='Second location reflection','Correct location reflection loaded');
 reflectionDeferred.resolve();reflectionDeferred=null;await tick();await tick();
 check(!document.getElementById('lessonDetail').textContent.includes('STALE PRIVATE LOCATION ONE')&&document.querySelector('#lessonDetail textarea')===currentInput&&currentInput.value==='Second location reflection','Late first-location reflection cannot replace current lesson');
 currentInput.value='Second location practice';btn('Save private reflection').click();await waitFor(()=>writes.length===1,'reflection write');
 check(writes[0].table==='academy_private_reflections'&&writes[0].row.enrollment_id===e2.id&&writes[0].row.body==='Second location practice','Write remains bound to selected enrollment');
 await waitFor(()=>btn('Save private worksheet'),'worksheet controls');
 const worksheetSave=btn('Save private worksheet');
 const worksheetInput=[...document.querySelectorAll('#lessonDetail textarea')].find(input=>input.value==='Stored fictional draft');
 check(!!worksheetInput,'Worksheet draft restored');
 worksheetInput.value='Updated fictional draft';
 worksheetSave.click();await waitFor(()=>writes.length===2,'worksheet save');
 check(writes[1].table==='worksheet'&&writes[1].row.p_enrollment===e2.id&&writes[1].row.p_answers['1']==='Updated fictional draft','Worksheet save uses exact enrollment');
 btn('Download completion certificate').click();await waitFor(()=>certificateBlob,'certificate download');
 const certificate=await certificateBlob.text();
 check(certificate.includes('learner@example.invalid')&&certificate.includes('Fictional &lt;script&gt;text&lt;/script&gt;'),'Certificate escapes supplied title and uses signed-in learner');
 const staleSave=btn('Save private reflection');
 currentUser=null;authCallback('SIGNED_OUT');staleSave.click();worksheetSave.click();await tick();
 check(writes.length===2,'Detached reflection and worksheet saves cannot write after sign-out');
 document.body.setAttribute('data-result','PASS');
}
window.addEventListener('load',()=>run().catch(err=>{document.body.setAttribute('data-result','FAIL');document.body.setAttribute('data-error',err.message);}));
`;
try{
 const ids=['message','authPanel','memberPanel','courses','lessons','lessonDetail','reviewer','locationsPanel','invitesPanel','recoveryPanel','userLabel','register','reset','signout'];
 const html='<!doctype html><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src none; script-src \'unsafe-inline\'; style-src \'unsafe-inline\'; media-src \'none\'; connect-src \'none\'"><style>.academy-hide{display:none}</style><body data-result="PENDING">'+ids.map(id=>'<div id="'+id+'"></div>').join('')+'<form id="authForm"><input id="email"><input id="password"></form><form id="recoveryForm"><input id="newPassword"></form><script>'+fixture+'</script><script>'+app.replaceAll('</script','<\\/script')+'</script></body>';
 const path=join(dir,'fixture.html');writeFileSync(path,html);
 const chrome=process.env.CHROME_BIN||'google-chrome';
 const dom=execFileSync(chrome,['--headless','--no-sandbox','--disable-gpu','--disable-background-networking','--disable-extensions','--no-first-run','--virtual-time-budget=15000','--dump-dom','--user-data-dir='+join(dir,'profile'),'file://'+path],{encoding:'utf8',timeout:45000,maxBuffer:2*1024*1024});
 assert.match(dom,/<body data-result="PASS"/,dom.match(/<body[^>]*>/)?.[0]||'No browser result');
 console.log('PASS: private video request, native player, sign-out cleanup, invalid URL, stale recovery response, media outage fallback, exact-location reflection race, detached saves, worksheet drafts and certificate download (fictional browser only).');
}finally{rmSync(dir,{recursive:true,force:true});}
