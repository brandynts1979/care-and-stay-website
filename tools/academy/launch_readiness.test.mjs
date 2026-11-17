import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const curriculum=JSON.parse(readFileSync('academy/curriculum/first-edition-draft.json','utf8'));
const manager=readFileSync('academy/edge-functions/academy-manager/index.ts','utf8');
const webhook=readFileSync('academy/edge-functions/academy-stripe-webhook/index.ts','utf8');
const client=readFileSync('academy/learn/config.js','utf8');
test('first-edition draft has six modules and exactly 24 lessons',()=>{
 assert.equal(curriculum.items.length,24);
 for(let m=1;m<=6;m++)assert.deepEqual(curriculum.items.filter(x=>x.module===m).map(x=>x.position),[1,2,3,4]);
});
test('every lesson contains substantive learning material, practice and evidence',()=>{
 for(const item of curriculum.items){
  assert.ok(item.title.length>8);
  assert.ok(item.body.length>=700, item.title);
  for(const label of ['LEARNING PURPOSE','APPLY IT IN THE RESTAURANT','PRACTICE EVIDENCE FOR REVIEW','REFLECTION']) assert.ok(item.body.includes(label),item.title);
 }
});
test('24 unique scenario prompts and 72 nonempty distinct choices with clear feedback',()=>{
 const scenarios=curriculum.items.map(x=>x.scenario);
 assert.equal(new Set(scenarios.map(x=>x.prompt)).size,24);
 assert.equal(scenarios.reduce((a,x)=>a+x.choices.length,0),72);
 for(const s of scenarios){
   assert.equal(s.choices.length,3);
   assert.equal(new Set(s.choices.map(x=>x.text)).size,3);
   for(const choice of s.choices){
    assert.ok(choice.text.length>20);
    assert.ok(choice.feedback.length>=35,choice.text);
   }
 }
});
test('live billing stays explicitly disabled in client',()=>{
 assert.match(client,/billingEnabled:\s*false/);
 assert.doesNotMatch(client,/sb_secret_|service_role|sk_live_/i);
});
test('authenticated checkout requires server billing release switch',()=>{
 assert.match(manager,/ACADEMY_BILLING_ENABLED/);
 assert.match(manager,/ACADEMY_STRIPE_PRICE_ID/);
 assert.match(manager,/billing_owner_id/);
 assert.match(manager,/automatic_tax:\s*\{enabled:true\}/);
});
test('webhook fails closed unless approved Academy price is present',()=>{
 assert.match(webhook,/constructEventAsync/);
 assert.match(webhook,/approvedPrice/);
 assert.match(webhook,/subscription\.items\?\.data/);
 assert.match(webhook,/academy_billing_events/);
});
test('invitation acceptance checks email, subscription and inviter role',()=>{
 assert.match(manager,/cleanEmail\(invite\.invited_email\)/);
 assert.match(manager,/inviter\.data\?\.active/);
 assert.match(manager,/Location billing inactive/);
});
