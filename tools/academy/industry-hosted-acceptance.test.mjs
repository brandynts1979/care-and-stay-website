import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {PATHWAYS,STAGING,PREVIEW,ROLES,validateFixture,exactEnrollment,ACCEPTANCE_REVISION} from './industry-hosted-config.mjs';
const uid=n=>'a1900000-0000-4000-8000-'+String(n).padStart(12,'0');
function fixture(pathway='home-care'){
 const c=PATHWAYS[pathway];
 const f={revision:ACCEPTANCE_REVISION,staging:STAGING,preview:PREVIEW,pathway,course_id:c.courseId,publishable_key:'sb_publishable_fixture',location_id:uid(100),location_name:'Synthetic industry QA home care',write_fixture:true};
 for(const [i,role] of ROLES.entries())f[role]={user_id:uid(i+1),email:'industry-qa-'+role+'@example.invalid',password:'synthetic-test-only',enrollment_id:role==='outsider'?null:uid(i+11)};
 return f;
}
test('one exact five-pathway configuration preserves all imported curriculum coverage',()=>{
 assert.equal(Object.keys(PATHWAYS).length,5);
 const maps={window:{}};runInNewContext(readFileSync(new URL('../../academy/learn/goal-maps.js',import.meta.url),'utf8'),maps);
 const totals={modules:0,lessons:0,activities:0,choices:0,worksheets:0,contexts:0};
 const ids=new Set();
 for(const [key,p] of Object.entries(PATHWAYS)){
  assert.equal(validateFixture(fixture(key)),p);assert.ok(!ids.has(p.courseId));ids.add(p.courseId);
  assert.equal(maps.window.ACADEMY_GOAL_MAPS[p.courseId].slug,p.slug);
  assert.deepEqual([...maps.window.ACADEMY_GOAL_MAPS[p.courseId].goals[0].lessons],[...p.firstGoalLessonIds]);
  for(const name of Object.keys(totals))totals[name]+=p[name];
 }
 assert.deepEqual(totals,{modules:40,lessons:160,activities:320,choices:960,worksheets:112,contexts:876});
});
test('reject wrong project, production, unknown course, shared users and nonfixture writes',()=>{
 for(const patch of [{staging:'https://seaxmxrnblivtjmlmtsn.supabase.co'},{preview:'https://mycareandstay.com'},{pathway:'qsr'},{course_id:PATHWAYS.hospice.courseId},{publishable_key:'sb_secret_fixture'},{write_fixture:false},{location_name:'Customer location'},{revision:'wrong'}])assert.throws(()=>validateFixture({...fixture(),...patch}));
 for(const patch of [{email:'someone@mycareandstay.com'},{user_id:fixture().gm.user_id},{enrollment_id:fixture().gm.enrollment_id},{password:''}]){const f=fixture();f.learner={...f.learner,...patch};assert.throws(()=>validateFixture(f));}
 const f=fixture();f.outsider.enrollment_id=uid(88);assert.throws(()=>validateFixture(f));
});
test('exact enrollment matching rejects extra, foreign or misplaced enrollment',()=>{
 const f=fixture(),e={id:f.learner.enrollment_id,course_id:f.course_id,location_id:f.location_id,location_name:f.location_name};
 assert.equal(exactEnrollment([e],f,'learner'),e);assert.equal(exactEnrollment([],f,'outsider'),null);
 assert.throws(()=>exactEnrollment([e],f,'outsider'));
 assert.throws(()=>exactEnrollment([e,e],f,'learner'));
 for(const key of Object.keys(e))assert.throws(()=>exactEnrollment([{...e,[key]:'wrong'}],f,'learner'));
});
test('runner has no fixture provisioning, live billing or credential output',()=>{
 const source=readFileSync(new URL('./industry-hosted-acceptance.mjs',import.meta.url),'utf8');
 assert.match(source,/INDUSTRY_PROTECTED_OPERATOR_CONFIRM/);
 assert.match(source,/mode&0o077/);
 assert.match(source,/billingEnabled===false/);
 assert.match(source,/scope=local/);
 assert.match(source,/No credentials, response bodies or signed URLs printed/);
 assert.doesNotMatch(source,/create_checkout|create_location|inviteUserByEmail|service_role|STRIPE_SECRET/);
});
