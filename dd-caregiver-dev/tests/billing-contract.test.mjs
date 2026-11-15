// Prelaunch billing invariants. These tests must pass before every DD development deployment.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const gateway=readFileSync(new URL('../edge-functions/dd-subscription-gateway/index.ts',import.meta.url),'utf8');
const page=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const plan=readFileSync(new URL('../STRIPE_LAUNCH_PLAN.md',import.meta.url),'utf8');

test('approved $39 DD price is pinned to the existing product and exclusive of tax',()=>{
 assert.match(gateway,/const PRICE_ID = "price_1Ubr0GHU2Vcv1mFQgOfj2Ww8"/);
 assert.match(gateway,/monthly_price_usd:39/);
 assert.match(gateway,/tax_behavior:"exclusive"/);
 assert.match(plan,/prod_Vcl3ez86uLhNFb/);
});
test('server prohibits checkout and billing portal for all signed-in users',()=>{
 assert.match(gateway,/const CHECKOUT_RELEASE_APPROVED = false/);
 assert.match(gateway,/action==="checkout" \|\| action==="portal"/);
 assert.match(gateway,/status:.*"none"|subscription_status:status/);
 assert.match(gateway,/return response\(503,\{/);
});
test('billing status cannot trust customer-submitted price, user ID or entitlements',()=>{
 assert.match(gateway,/url\+"\/auth\/v1\/user"/);
 assert.match(gateway,/owner_id=eq/);
 assert.match(gateway,/status==="active"\|\|status==="trialing"/);
 assert.match(gateway,/CHECKOUT_RELEASE_APPROVED && validPrice && stillCurrent/);
 assert.doesNotMatch(gateway,/body\.owner_id|body\.user_id|body\.price_id/);
});
test('static browser does not expose Stripe secret credentials, checkout or entitlement writes',()=>{
 assert.doesNotMatch(page,/(?:sk_live_|rk_live_|sb_secret_|STRIPE_SECRET_KEY|stripe_secret_key)/);
 assert.doesNotMatch(page,/\/v1\/checkout\/sessions|\/rest\/v1\/dd_subscription_entitlements/);
});

const webhook=readFileSync(new URL('../edge-functions/dd-stripe-webhook-PRELAUNCH/index.ts',import.meta.url),'utf8');
test('prelaunch webhook stays undeployed and processing is disabled in source',()=>{
 assert.match(webhook,/const PROCESSING_RELEASE_APPROVED = false/);
 assert.match(webhook,/constructEventAsync\(/);
 assert.match(webhook,/Stripe-Signature/);
 assert.match(webhook,/dd_apply_verified_stripe_event/);
 assert.match(webhook,/getSubscriptionId\(event\)/);
 assert.match(webhook,/getBillingSnapshot\(subscription,PRICE_ID\)/);
 assert.match(webhook,/stripe\.subscriptions\.retrieve\(subId\)/);
 assert.match(webhook,/stripe\.invoices\.retrieve\(invoiceId\)/);
 assert.match(webhook,/isPaidEntitlement\(snapshot,invoicePaid\)/);
 assert.doesNotMatch(page,/dd-stripe-webhook-PRELAUNCH/);
});
test('the temporary billing QA button is not in customer-facing app',()=>{
 assert.doesNotMatch(page,/qaBillingGate|Verify disabled subscription checkout/);
});

const reviewedGateway=readFileSync(new URL('../edge-functions/dd-subscription-gateway-PRODUCTION-REVIEW/index.ts',import.meta.url),'utf8');
test('future production Checkout implementation remains UNDEPLOYED and fail-closed',()=>{
 assert.match(reviewedGateway,/const CHECKOUT_RELEASE_APPROVED = false/);
 assert.match(reviewedGateway,/if\(!CHECKOUT_RELEASE_APPROVED\)return result\(503/);
 assert.match(reviewedGateway,/managed_payments:\{enabled:true\}/);
 assert.doesNotMatch(reviewedGateway,/automatic_tax:\{enabled:true\}/);
 assert.match(reviewedGateway,/client_reference_id:user.id/);
 assert.match(reviewedGateway,/subscription_data:\{metadata:\{dd_owner_id:user.id/);
 assert.match(reviewedGateway,/stripe\.checkout\.sessions\.create/);
 assert.match(reviewedGateway,/stripe\.billingPortal\.sessions\.create/);
 assert.match(reviewedGateway,/price\.unit_amount!==3900/);
 assert.match(reviewedGateway,/stripe\.customers\.retrieve/);
 assert.doesNotMatch(reviewedGateway,/input\.price_id|input\.owner_id|input\.customer_id/);
});
