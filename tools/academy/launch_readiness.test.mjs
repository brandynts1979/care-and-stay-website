import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
const manager=readFileSync('academy/edge-functions/academy-manager/index.ts','utf8');
const webhook=readFileSync('academy/edge-functions/academy-stripe-webhook/index.ts','utf8');
const client=readFileSync('academy/learn/config.js','utf8');
test('paid curriculum source is absent from public website repository',()=>{
 assert.equal(existsSync('academy/curriculum/first-edition-draft.json'),false);
 assert.equal(existsSync('academy/database/006_first_edition_draft_content.sql'),false);
});
test('live billing stays explicitly disabled in client',()=>{
 assert.match(client,/billingEnabled:\s*false/);
 assert.doesNotMatch(client.slice(client.indexOf('window.CARE_STAY_ACADEMY_CONFIG')),/sb_secret_|service_role|sk_live_/i);
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

test('legacy billing and invitations never automatically grant new published courses',()=>{
 for(const code of [manager,webhook]){
  assert.match(code,/\.eq\("slug","stay-culture-leadership-academy"\)\.eq\("published",true\)/);
  assert.doesNotMatch(code,/from\("academy_courses"\)\.select\("id"\)\.eq\("published",true\)/);
  assert.match(code,/Approved Academy course unavailable/);
 }
});
test('course rendering uses actual module and lesson counts rather than assuming six modules',()=>{
 const app=readFileSync('academy/learn/app.js','utf8');
 assert.match(app,/select\('id,slug,title,published'\)/);
 assert.match(app,/modules\.length\+' '\+/);
 assert.match(app,/lessons\.length\+' '\+/);
 assert.doesNotMatch(app,/Six modules · 24 lessons/);
 assert.match(app,/course\.slug==='stay-culture-leadership-academy'/);
 assert.match(app,/No published lessons are currently available/);
});
