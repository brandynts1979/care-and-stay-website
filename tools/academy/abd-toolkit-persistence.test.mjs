import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as ui from '../../academy/learn/abd-toolkit-ui.mjs';

const template=(key,ordinary=['Existing response'])=>({id:'t',title:'Practice',template_key:key,prompts:[...ordinary,...ui.tools[key].fields.map((_,i)=>'Calculator input '+(i+1)),'Calculator result']});
class Element {
 constructor(tag){this.tag=tag;this.children=[];this.events={};this.value='';this.textContent='';this.disabled=false}
 append(...nodes){this.children.push(...nodes)}
 setAttribute(){}
 addEventListener(name,fn){this.events[name]=fn}
 async fire(name){return this.events[name]?.()}
 all(tag){return [...(this.tag===tag?[this]:[]),...this.children.flatMap(x=>x.all(tag))]}
}
const element=(tag,text)=>{const e=new Element(tag);if(text!==undefined)e.textContent=text;return e};
const source=readFileSync(new URL('../../academy/learn/app.js',import.meta.url),'utf8');
const worksheetSource=source.slice(source.indexOf('  async function loadWorksheets('),source.indexOf('  async function openLesson(')).replace("await import('./abd-toolkit-ui.mjs')",'ui');
function harness(t,saved,slug='stay-culture-appreciative-business-development-v1'){
 const detail=element('main'),calls=[],reads=[],exports=[];let active=true,fail=false;
 const read=async(name,query)=>{const q={select(){return this},eq(k,v){reads.push([name,k,v]);return this},in(){return this},order(){return this}};query(q);return name==='academy_worksheet_templates'?[t]:[{template_id:t.id,answers:saved}]};
 const db={rpc:async(name,args)=>{calls.push({name,args});return {error:fail?new Error('denied'):null}}};
 const button=(label,fn)=>{const e=element('button',label);e.addEventListener('click',fn);return e};
 const runtime={...ui,exportWorksheet:(template,values)=>exports.push(ui.worksheetExportEntries(template,values))};
 const load=new Function('ui','detail','read','db','elt','button',worksheetSource+'\nreturn loadWorksheets;')(runtime,detail,read,db,element,button);
 return {detail,calls,reads,exports,load:()=>load('lesson','enrollment',()=>active,slug),invalidate:()=>{active=false},fail:()=>{fail=true}};
}

test('all seven layouts preserve existing numbered slots and reject mismatched suffixes',()=>{
 for(const key of Object.keys(ui.tools)){
  const t=template(key,['A','B']);
  assert.deepEqual(ui.calculatorLayout(t),{start:2,count:ui.tools[key].fields.length});
  assert.equal(ui.calculatorLayout({...t,prompts:t.prompts.slice(0,-1)}),null);
 }
 assert.equal(ui.calculatorLayout({template_key:'constructor',prompts:[]}),null);
 assert.equal(ui.calculatorLayout({template_key:'shared-topic',prompts:['A']}),null);
});
test('actual worksheet function restores, recalculates, saves through scoped RPC and exports current values',async()=>{
 const old=globalThis.document;globalThis.document={createElement:element};
 try{
  const t=template('growth-scorecard',['Existing response','Other response']);
  const h=harness(t,{'1':'keep me','2':'also keep','3':'8','4':'40','5':'FORGED'});
  await h.load();
  const controls=h.detail.all('textarea'),buttons=h.detail.all('button');
  assert.deepEqual(controls.map(x=>x.value),['keep me','also keep','8','40']);
  assert.ok(h.detail.all('p').some(x=>x.textContent==='Rate: 20.00%'));
  assert.ok(!h.detail.all('p').some(x=>x.textContent==='FORGED'));
  controls[2].value='10';await controls[2].fire('input');
  assert.ok(h.detail.all('p').some(x=>x.textContent==='Rate: 25.00%'));
  await buttons.find(x=>x.textContent==='Save private worksheet').fire('click');
  assert.deepEqual(h.calls,[{name:'academy_save_worksheet',args:{p_enrollment:'enrollment',p_template:'t',p_answers:{'1':'keep me','2':'also keep','3':'10','4':'40','5':'Rate: 25.00%'}}}]);
  assert.ok(h.reads.some(x=>x.join(':')==='academy_worksheet_responses:enrollment_id:enrollment'));
  await buttons.find(x=>x.textContent==='Export private worksheet').fire('click');
  assert.deepEqual(h.exports[0],[['Existing response','keep me'],['Other response','also keep'],['Calculator input: Eligible outcomes','10'],['Calculator input: Eligible starting cohort','40'],['Calculator result','Rate: 25.00%']]);
  const resumed=harness(t,h.calls[0].args.p_answers);await resumed.load();
  assert.deepEqual(resumed.detail.all('textarea').map(x=>x.value),['keep me','also keep','10','40']);
  assert.ok(resumed.detail.all('p').some(x=>x.textContent==='Rate: 25.00%'));
  controls[2].value='999';await controls[2].fire('input');
  h.fail();await buttons.find(x=>x.textContent==='Save private worksheet').fire('click');
  assert.match(h.calls[1].args.p_answers['5'],/Check the input/);
  assert.ok(h.detail.all('p').some(x=>x.textContent.includes('Could not save')));
  assert.ok(controls.every(x=>!x.disabled));
  h.invalidate();await buttons.find(x=>x.textContent==='Save private worksheet').fire('click');
  await buttons.find(x=>x.textContent==='Export private worksheet').fire('click');
  assert.equal(h.calls.length,2);assert.equal(h.exports.length,1);
 }finally{globalThis.document=old}
});
test('malformed stored select values and outputs cannot imply approval; ordinary worksheets unchanged',async()=>{
 const old=globalThis.document;globalThis.document={createElement:element};
 try{
  const h=harness(template('micro-niche'),{'1':'original','2':'invalid','3':'yes','4':'yes','5':'yes','6':'ready-for-review'});
  await h.load();assert.equal(h.detail.all('select')[0].value,'');
  assert.ok(h.detail.all('p').some(x=>x.textContent.includes('Check the input')));
  await h.detail.all('button').find(x=>x.textContent==='Save private worksheet').fire('click');
  assert.match(h.calls[0].args.p_answers['6'],/Check the input/);
  for(const v of [null,[],{},'x'.repeat(2001)])assert.throws(()=>ui.calculate('growth-scorecard',[v,'40']));
  assert.throws(()=>ui.calculate('constructor',[]));
  assert.throws(()=>ui.calculate('micro-niche',['yes','yes','bogus','yes']));
  assert.match(ui.worksheetExportEntries(template('growth-scorecard'),['ordinary','8','40','FORGED']).at(-1)[1],/20.00%/);
  const ordinary=harness({id:'t',title:'Ordinary',prompts:['A','B']},{'1':'original','2':'second'},'non-abd');
  await ordinary.load();await ordinary.detail.all('button')[0].fire('click');
  assert.deepEqual(ordinary.calls[0].args.p_answers,{'1':'original','2':'second'});
 }finally{globalThis.document=old}
});

test('all seven actual worksheet calculators round-trip through exact enrollment RPC and private export',async()=>{
 const old=globalThis.document;globalThis.document={createElement:element};
 const fixtures=[
  ['organizational-niche',['claim','first\nsecond','owner','boundary'],/not approved/],
  ['micro-niche',['yes','yes','unknown','yes'],/investigate/],
  ['ideal-partnership',['yes','yes','yes','yes','2','1','2','1'],/6\/8/],
  ['pipeline-planner',['2000,0.4\n3000,0.2'],/1,400/],
  ['territory-plan',['120','30,60,40'],/Overallocated/],
  ['growth-scorecard',['8','40'],/20.00%/],
  ['experiment-journal',['4','40','8','40'],/10.00 percentage points/],
 ];
 try{
  for(const [key,values,expected] of fixtures){
   const t=template(key,['Prior narrative','Prior evidence']);
   const saved=Object.fromEntries(['keep narrative','<script>fictional</script>',...values,'FORGED'].map((value,i)=>[String(i+1),value]));
   const h=harness(t,saved);await h.load();
   const buttons=h.detail.all('button');
   assert.ok(h.detail.all('p').some(x=>expected.test(x.textContent)),key+' restored result');
   assert.ok(!h.detail.all('p').some(x=>x.textContent==='FORGED'));
   await buttons.find(x=>x.textContent==='Save private worksheet').fire('click');
   const payload=h.calls[0].args;
   assert.equal(payload.p_enrollment,'enrollment');assert.equal(payload.p_template,t.id);
   const expectedResult=ui.calculate(key,values);
   assert.deepEqual(payload.p_answers,{...saved,[String(values.length+3)]:expectedResult});
   await buttons.find(x=>x.textContent==='Export private worksheet').fire('click');
   assert.deepEqual(h.exports[0].map(x=>x[1]),['keep narrative','<script>fictional</script>',...values,expectedResult]);
   const resumed=harness(t,payload.p_answers);await resumed.load();
   await resumed.detail.all('button').find(x=>x.textContent==='Save private worksheet').fire('click');
   assert.deepEqual(resumed.calls[0].args,payload);
  }
 }finally{globalThis.document=old}
});
test('malformed inputs in each calculator are rejected rather than exporting a forged result',()=>{
 const bad={
  'organizational-niche':[null,'a','b','c'],
  'micro-niche':['yes','yes','bad','yes'],
  'ideal-partnership':['yes','yes','yes','yes','3','1','2','1'],
  'pipeline-planner':['100,2'],
  'territory-plan':['120','30,60'],
  'growth-scorecard':['1.5','40'],
  'experiment-journal':['41','40','8','40']
 };
 for(const [key,values] of Object.entries(bad)){
  assert.throws(()=>ui.calculate(key,values));
  assert.match(ui.worksheetExportEntries(template(key),['ordinary',...values,'FORGED']).at(-1)[1],/Check the input/);
 }
});
