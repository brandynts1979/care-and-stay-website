import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
const root=process.cwd();
const server=createServer(async(req,res)=>{
 const paths={'/agency-partnerships/portal/':['agency-partnerships/portal/index.html','text/html'],'/agency-partnerships/portal/app.js':['agency-partnerships/portal/app.js','text/javascript'],'/styles.css':['styles.css','text/css']};
 const item=paths[req.url];if(!item){res.writeHead(404).end();return}
 try{res.writeHead(200,{'Content-Type':item[1]}).end(await readFile(root+'/'+item[0]))}catch{res.writeHead(500).end()}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const url='http://127.0.0.1:'+server.address().port+'/agency-partnerships/portal/';
const browser=await chromium.launch({headless:true});
const stub=String.raw`
export function createClient(){
 const state=window.fixture={role:'owner',signed:false,failTable:'',zeroWrite:false,delayOrg:'',release:null,calls:[],orgs:[{id:'a',name:'Fictional Agency A',industry:'home_care'},{id:'b',name:'Fictional Agency B',industry:'dd_services'}],locations:[{id:'a1',org_id:'a',name:'A active',active:true},{id:'a2',org_id:'a',name:'A archived',active:false},{id:'b1',org_id:'b',name:'B active',active:true}],requests:[]};
 let serial=0;
 class Query{
 constructor(table){this.table=table;this.filters=[];this.op='read'}
 select(fields,options){this.fields=fields;this.options=options;return this}
 eq(k,v){this.filters.push([k,v]);return this}
 lte(k,v){this.filters.push(['lte:'+k,v]);return this}
 gt(k,v){this.filters.push(['gt:'+k,v]);return this}
 order(){return this} limit(){return this}
 insert(v){this.op='insert';this.value=v;return this}
 update(v){this.op='update';this.value=v;return this}
 then(resolve,reject){return this.run().then(resolve,reject)}
 async run(){
 const s=state;const f=Object.fromEntries(this.filters);
 s.calls.push({table:this.table,op:this.op,filters:f,value:this.value});
 if(this.table===s.failTable)return {error:{message:'synthetic unavailable'}};
 if(this.table==='agency_portal_locations'&&this.op==='read'&&s.delayOrg===f.org_id){s.delayOrg='';await new Promise(r=>s.release=r)}
 if(this.op!=='read'&&s.zeroWrite)return {data:[]};
 if(this.table==='agency_portal_members')return {data:s.orgs.map(o=>({org_id:o.id,role:s.role}))};
 if(this.table==='agency_portal_orgs')return {data:s.orgs};
 if(this.table==='agency_portal_initiatives')return {data:[]};
 if(this.table==='agency_portal_sponsorships')return {data:null,count:1};
 if(this.table==='agency_portal_locations'){
  if(this.op==='insert'){const row={id:'new'+(++serial),active:true,...this.value};s.locations.push(row);return {data:[{id:row.id}]}}
  if(this.op==='update'){const row=s.locations.find(x=>x.org_id===f.org_id&&x.id===f.id);if(!row)return {data:[]};Object.assign(row,this.value);return {data:[{id:row.id}]}}
  return {data:s.locations.filter(x=>x.org_id===f.org_id)};
 }
 if(this.table==='agency_portal_enrollment_requests'){
  if(this.op==='insert'){const row={id:'r'+(++serial),status:'pending',created_at:'2026-11-27T00:00:00Z',...this.value};s.requests.push(row);return {data:[{id:row.id}]}}
  return {data:s.requests.filter(x=>x.org_id===f.org_id)};
 }
 return {error:{message:'unexpected table'}};
 }}
 return {from:t=>new Query(t),auth:{signInWithPassword:async()=>{state.signed=true;return {data:{}}},getUser:async()=>({data:{user:state.signed?{id:'fictional-user'}:null}}),signOut:async()=>{state.signed=false;return {data:{}}}}}
}
`;
let passed=0,failed=0;
async function scenario(name,fn){
 const ctx=await browser.newContext();
 await ctx.route('**/*',route=>{const u=route.request().url();if(u.startsWith('https://esm.sh/'))return route.fulfill({contentType:'text/javascript',headers:{'Access-Control-Allow-Origin':'*'},body:stub});if(u.startsWith('http://127.0.0.1:'))return route.continue();return route.abort()});
 const p=await ctx.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));
 try{await p.goto(url);await p.locator('#login').waitFor({state:'visible'});await fn(p);assert.deepEqual(errors,[]);passed++;console.log('PASS '+name)}catch(e){failed++;console.error('FAIL '+name+': '+e.message)}finally{await ctx.close()}
}
async function login(p,role='owner'){
 await p.evaluate(role=>window.fixture.role=role,role);
 await p.locator('#email').fill('qa@example.invalid');await p.locator('#password').fill('fictional-password');
 await p.locator('#loginForm button').click();await p.locator('#dashboard').waitFor({state:'visible'});
}
async function loaded(p){await p.locator('#locationControls').waitFor({state:'visible'});}
async function textHas(p,selector,part){await p.waitForFunction(({selector,part})=>document.querySelector(selector).textContent.includes(part),{selector,part});}
try{
 await scenario('owner sees only selected tenant and valid sponsorship filter',async p=>{
  await login(p);await loaded(p);assert.match(await p.locator('#locationList').innerText(),/A active/);assert.doesNotMatch(await p.locator('#locationList').innerText(),/B active/);
  assert.equal(await p.locator('#enrollmentLocation option').count(),1);
  const q=await p.evaluate(()=>fixture.calls.find(c=>c.table==='agency_portal_sponsorships'));assert.equal(q.filters.status,'active');assert.ok(q.filters['lte:starts_at']);assert.ok(q.filters['gt:ends_at']);
 });
 await scenario('owner adds location and requests pending sponsorship only',async p=>{
  await login(p);await loaded(p);await p.locator('#locationName').fill('Fictional new location');await p.locator('#addLocation').click();await textHas(p,'#locationList','Fictional new location');
  await p.locator('#enrollmentLocation').selectOption('a1');await p.locator('#requestEnrollment').click();await textHas(p,'#enrollmentList','pending');
  const r=await p.evaluate(()=>fixture.requests[0]);assert.equal(r.org_id,'a');assert.equal(r.product,'home_care');assert.equal(r.status,'pending');assert.equal(r.location_id,'a1');
  const q=await p.evaluate(()=>fixture.calls.find(c=>c.table==='agency_portal_enrollment_requests'&&c.op==='insert'));assert.deepEqual(Object.keys(q.value).sort(),['location_id','org_id','product']);
 });
 await scenario('archive and restore controls update eligible locations',async p=>{
  await login(p);await loaded(p);await p.getByRole('button',{name:'Archive location'}).click();await p.waitForFunction(()=>document.querySelector('#enrollmentLocation').options.length===0);assert.equal(await p.locator('#requestEnrollment').isDisabled(),true);
  await p.getByRole('button',{name:'Restore location'}).first().click();await p.waitForFunction(()=>document.querySelector('#enrollmentLocation').options.length===1);assert.equal(await p.locator('#requestEnrollment').isDisabled(),false);
 });
 await scenario('quality lead sees read-only locations and no sponsorship requests',async p=>{
  await login(p,'quality_lead');await loaded(p);assert.equal(await p.locator('#locationForm').isHidden(),true);assert.equal(await p.locator('#enrollmentControls').isHidden(),true);assert.equal(await p.locator('#locationList button').count(),0);
  assert.equal(await p.evaluate(()=>fixture.calls.some(c=>['agency_portal_enrollment_requests','agency_portal_sponsorships'].includes(c.table))),false);
 });
 await scenario('zero-row mutation does not claim success',async p=>{
  await login(p);await loaded(p);await p.evaluate(()=>fixture.zeroWrite=true);await p.locator('#requestEnrollment').click();await textHas(p,'#enrollmentNotice','could not be confirmed');assert.equal(await p.evaluate(()=>fixture.requests.length),0);
 });
 await scenario('unavailable location schema fails closed',async p=>{
  await p.evaluate(()=>fixture.failTable='agency_portal_locations');await login(p);await textHas(p,'#enrollmentNotice','not available');assert.equal(await p.locator('#locationControls').isHidden(),true);assert.equal(await p.locator('#requestEnrollment').isDisabled(),true);
 });
 await scenario('late location response cannot overwrite switched tenant',async p=>{
  await p.evaluate(()=>fixture.delayOrg='a');await login(p);await p.waitForFunction(()=>typeof fixture.release==='function');await p.locator('#agency').selectOption('b');await loaded(p);await textHas(p,'#locationList','B active');await p.evaluate(()=>fixture.release());await p.waitForTimeout(100);assert.doesNotMatch(await p.locator('#locationList').innerText(),/A active/);
  await p.locator('#requestEnrollment').click();await textHas(p,'#enrollmentList','pending');assert.equal(await p.evaluate(()=>fixture.requests[0].product),'dd_services');
 });
 await scenario('late location response cannot repopulate signed-out portal',async p=>{
  await p.evaluate(()=>fixture.delayOrg='a');await login(p);await p.waitForFunction(()=>typeof fixture.release==='function');await p.locator('#logout').click();await p.locator('#login').waitFor({state:'visible'});await p.evaluate(()=>fixture.release());await p.waitForTimeout(100);assert.equal(await p.locator('#workspace').isHidden(),true);assert.equal(await p.locator('#locationList').innerText(),'');
 });
}finally{await browser.close();await new Promise(r=>server.close(r))}
console.log('Summary: '+passed+' passed, '+failed+' failed');if(failed)process.exitCode=1;
