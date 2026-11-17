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
