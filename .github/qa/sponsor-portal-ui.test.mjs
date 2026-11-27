import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const consumerPaths=['dd-caregiver-dev/index.html','dd-family-care/app/index.html'];
const nodesFixture=()=>{const nodes=new Map();return id=>{if(!nodes.has(id))nodes.set(id,{value:'',checked:false,disabled:false,hidden:false,style:{},textContent:'',options:[],reset(){},replaceChildren(...a){this.options=a;this.value=a[0]?.value||''},checkValidity(){return true}});return nodes.get(id)}};
for(const path of consumerPaths){
 const html=await readFile(path,'utf8'),start=html.indexOf('const SPONSOR_UI_RELEASE='),end=html.indexOf('const DD_PRIVACY_ARCHIVE_ENABLED=',start),src=html.slice(start,end);
 assert.ok(start>=0&&end>start);
 test(path+' redemption lock and synthetic pending response',async()=>{
  for(const enabled of [false,true]){
   const node=nodesFixture(),calls=[];let refreshed=0;
   const code=enabled?src.replace('const SPONSOR_UI_RELEASE=false;','const SPONSOR_UI_RELEASE=true;').replace("const SPONSOR_DISCLOSURE_VERSION='';","const SPONSOR_DISCLOSURE_VERSION='qa-v1';"):src;
   const c=vm.createContext({document:{getElementById:node},sponsorSession:()=>({access_token:'fixture'}),sponsorBase:()=> 'https://iqgytijuufgkvnzolvqz.supabase.co',sponsorRefreshStatus:async()=>{refreshed++},fetch:async(url,init)=>{calls.push(JSON.parse(init.body));return Response.json({status:'pending_activation'},{status:202})},Response,AbortController,setTimeout,clearTimeout});
   vm.runInContext(code+'\nupdateSponsorUI()',c);
   assert.equal(node('sponsorRedemptionPanel').hidden,!enabled);
   node('sponsorCode').value='x'.repeat(43);node('sponsorCode').oninput();assert.equal(node('sponsorRedeem').disabled,true);
   node('sponsorAcknowledged').checked=true;node('sponsorAcknowledged').onchange();await node('sponsorRedeem').onclick();
   assert.equal(calls.length,enabled?1:0);if(enabled){assert.equal(node('sponsorCode').value,'');assert.match(node('sponsorNotice').textContent,/pending verification/);assert.equal(refreshed,1)}
  }
 });
}
const agency=await readFile('agency-partnerships/portal/app.js','utf8'),start=agency.indexOf('const AGENCY_ISSUER_RELEASE='),source=agency.slice(start);
assert.ok(start>=0);
const row={id:'11111111-1111-4111-8111-111111111111',product:'home_care',status:'pending'};
function issuerFixture({enabled=true,admin=true,delayed=false}={}){
 const node=nodesFixture(),calls=[];let resolve;const c=vm.createContext({$:node,epoch:1,orgs:[{id:'org',industry:'home_care'}],current:(r,id)=>r===1&&id==='org',canManage:()=>admin,check:x=>x.data,db:{auth:{getSession:async()=>({data:{session:{access_token:'fixture'}}})}},Option:class{constructor(text,value){this.text=text;this.value=value}},Date,Response,AbortController,setTimeout,clearTimeout,fetch:async(url,init)=>{calls.push(JSON.parse(init.body));if(delayed)return new Promise(r=>resolve=r);return Response.json({token:'x'.repeat(43)},{status:201})}});
 const code=enabled?source.replace('const AGENCY_ISSUER_RELEASE=false;','const AGENCY_ISSUER_RELEASE=true;'):source;
 vm.runInContext(code,c);node('agency').value='org';vm.runInContext('clearIssuer()',c);c.rows=[row];vm.runInContext("loadIssuer(rows,1,'org')",c);
 return {node,calls,submit:()=>node('issuerForm').onsubmit({preventDefault(){}}),clear:()=>vm.runInContext('clearIssuer()',c),release:()=>resolve?.(Response.json({token:'x'.repeat(43)},{status:201}))};
}
function fill(f){f.node('issuerRequest').value=row.id;f.node('issuerEmail').value='fixture@example.invalid';f.node('issuerExpires').value=new Date(Date.now()+3600000).toISOString();f.node('issuerCoverage').value=new Date(Date.now()+86400000).toISOString();f.node('issuerConfirm').checked=true}
test('agency lock and quality role do not issue invitations',async()=>{for(const opts of [{enabled:false},{admin:false}]){const f=issuerFixture(opts);fill(f);await f.submit();assert.equal(f.calls.length,0);assert.equal(f.node('issuerPanel').hidden,true)}});
test('agency owner issues one private code, clears recipient and prevents duplicate',async()=>{const f=issuerFixture();fill(f);await f.submit();assert.equal(f.calls.length,1);assert.equal(f.calls[0].request_id,row.id);assert.equal(f.node('issuerEmail').value,'');assert.equal(f.node('issuerCode').value,'x'.repeat(43));assert.equal(f.node('issuerSubmit').disabled,true);f.node('issuerClear').onclick();assert.equal(f.node('issuerCode').value,'')});
test('agency tenant change discards late private code',async()=>{const f=issuerFixture({delayed:true});fill(f);const pending=f.submit();await new Promise(r=>setImmediate(r));f.clear();f.release();await pending;assert.equal(f.node('issuerCode').value,'');assert.equal(f.node('issuerResult').hidden,true)});
