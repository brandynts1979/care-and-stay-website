// Prelaunch billing invariants: must pass before each DD development deploy.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const gateway=read('../edge-functions/dd-subscription-gateway/index.ts');
const webhook=read('../edge-functions/dd-stripe-webhook-PRELAUNCH/index.ts');
const reviewedGateway=read('../edge-functions/dd-subscription-gateway-PRODUCTION-REVIEW/index.ts');
const page=read('../index.html');
const plan=read('../STRIPE_LAUNCH_PLAN.md');

test('Live DD billing gateway pins the approved $39/month product and tax behavior',()=>{
 assert.match(gateway,/const LIVE_PRICE = "price_1Ubr0GHU2Vcv1mFQgOfj2Ww8"/);
 assert.match(gateway,/const priceId = LIVE_PRICE/);
 assert.match(gateway,/unit_amount!==3900/);
 assert.match(gateway,/price\.product!=="prod_Vcl3ez86uLhNFb"/);
 assert.match(gateway,/tax_behavior:"exclusive"/);
 assert.match(plan,/prod_Vcl3ez86uLhNFb/);
});
test('Deployed gateway cannot collect money simply by changing environment variables',()=>{
 assert.match(gateway,/const release = false/);
 assert.doesNotMatch(gateway,/DD_BILLING_RELEASE_APPROVED/);
 assert.match(gateway,/if\(!release\)return answer\(503/);
 assert.ok(gateway.indexOf('if(!release)return')<gateway.indexOf('const secret=Deno.env.get("STRIPE_SECRET_KEY")'));
 assert.match(gateway,/checkout_enabled:release/);
});
test('Gateway uses Managed Payments and verifies signed-in account, exact price and customer',()=>{
 assert.match(gateway,/managed_payments:\{enabled:true\}/);
 assert.doesNotMatch(gateway,/automatic_tax:\{enabled:true\}/);
 assert.match(gateway,/\/auth\/v1\/user/);
 assert.match(gateway,/dd_owner_id:user.id/);
 assert.match(gateway,/customer\.metadata\?\.dd_owner_id!==user.id/);
 assert.match(gateway,/client_reference_id:user.id/);
 assert.doesNotMatch(gateway,/request\.price_id|request\.owner_id|request\.customer_id/);
});
test('Status requires active, unexpired, approved subscription and disabled release',()=>{
 assert.match(gateway,/validPrice&&current&&record\?\.status==="active"/);
 assert.match(gateway,/const entitled=release&&/);
});
test('No Stripe secret, client checkout API, or direct entitlement writes on static DD browser page',()=>{
 assert.doesNotMatch(page,/(?:sk_live_|rk_live_|sb_secret_|STRIPE_SECRET_KEY|stripe_secret_key)/);
 assert.doesNotMatch(page,/\/v1\/checkout\/sessions|\/rest\/v1\/dd_subscription_entitlements/);
});
test('Deployed DD webhook has a hard-coded fail-closed release guard and verified paid invoice logic',()=>{
 assert.match(webhook,/const PROCESSING_RELEASE_APPROVED = false/);
 assert.match(webhook,/constructEventAsync\(/);
 assert.match(webhook,/Stripe-Signature/);
 assert.match(webhook,/getSubscriptionId\(event\)/);
 assert.match(webhook,/getBillingSnapshot\(subscription,PRICE_ID\)/);
 assert.match(webhook,/stripe\.subscriptions\.retrieve\(subId\)/);
 assert.match(webhook,/stripe\.invoices\.retrieve\(invoiceId\)/);
 assert.match(webhook,/isPaidEntitlement\(snapshot,invoicePaid\)/);
 assert.match(webhook,/dd_apply_verified_stripe_event/);
});
test('Production-review code is still disabled as a separate source variant',()=>{
 assert.match(reviewedGateway,/const CHECKOUT_RELEASE_APPROVED = false/);
 assert.match(reviewedGateway,/managed_payments:\{enabled:true\}/);
 assert.doesNotMatch(reviewedGateway,/automatic_tax:\{enabled:true\}/);
});
test('No temporary billing QA button on the customer-facing site',()=>{
 assert.doesNotMatch(page,/qaBillingGate|Verify disabled subscription checkout/);
});
