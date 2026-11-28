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
 assert.match(webhook,/current\.items\?\.data/);
 assert.match(webhook,/academy_billing_events/);
});
test('invitation acceptance uses verified server identity and transactional checks',()=>{
 assert.match(manager,/rpc\("academy_accept_invitation_atomic"/);
 assert.match(manager,/p_user:user.id,p_verified_email:cleanEmail\(user.email\)/);
 const sql=readFileSync('academy/database/staged_academy_atomic_invites.sql','utf8');
 assert.match(sql,/lower\(trim\(p_verified_email\)\)<>inv.invited_email/);
 assert.match(sql,/inviter_role not in \('owner','gm'\)/);
 assert.match(sql,/for update/);
 assert.match(sql,/already_joined/);
});
test('legacy billing and invitations resolve only entitled courses',()=>{
 const sql=readFileSync('academy/database/staged_academy_course_entitlements.sql','utf8');
 const grants=readFileSync('academy/database/staged_academy_atomic_invites.sql','utf8');
 assert.match(manager,/rpc\("academy_grant_member_atomic"/);
 assert.match(grants,/academy_entitled_course_ids\(p_location\)/);
 assert.match(webhook,/rpc\("academy_reconcile_subscription_atomic"/);
 const billing=readFileSync('academy/database/staged_academy_atomic_billing.sql','utf8');
 assert.match(billing,/academy_entitled_course_ids\(p_location\)/);
 assert.match(billing,/loc.billing_revision<>p_revision/);
 assert.match(billing,/processed_at=now\(\)/);
 assert.doesNotMatch(manager+webhook,/from\("academy_courses"\)\.select\("id"\)\.eq\("published",true\)/);
 assert.match(sql,/c\.slug='stay-culture-leadership-academy' or exists/);
 assert.match(sql,/g\.location_id=loc\.id and g\.course_id=c\.id and g\.active/);
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
