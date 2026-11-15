import test from 'node:test';
import assert from 'node:assert/strict';
import {getSubscriptionId,getBillingSnapshot,isPaidEntitlement,HANDLED_EVENTS} from '../../supabase/functions/dd-stripe-webhook/event-mapping.mjs';
const owner='11111111-1111-4111-8111-111111111111';
const price='price_QAApproved';
const future=Math.floor(Date.now()/1000)+3600, past=Math.floor(Date.now()/1000)-3600;
const sub=(overrides={})=>({
 id:'sub_A123',customer:'cus_A123',metadata:{dd_owner_id:owner},status:'active',
 items:{data:[{price:{id:price},current_period_end:future}]},...overrides
});
const event=(type,obj)=>({type,data:{object:obj}});
test('valid paid invoice and unexpired subscription grants access',()=>assert.equal(isPaidEntitlement(getBillingSnapshot(sub(),price),true),true));
test('unpaid latest invoice denies access',()=>assert.equal(isPaidEntitlement(getBillingSnapshot(sub(),price),false),false));
test('trial access is not granted',()=>assert.equal(isPaidEntitlement(getBillingSnapshot(sub({status:'trialing'}),price),true),false));
test('past_due denies access',()=>assert.equal(isPaidEntitlement(getBillingSnapshot(sub({status:'past_due'}),price),true),false));
test('unpaid status denies access',()=>assert.equal(isPaidEntitlement(getBillingSnapshot(sub({status:'unpaid'}),price),true),false));
test('canceled status denies access',()=>assert.equal(isPaidEntitlement(getBillingSnapshot(sub({status:'canceled'}),price),true),false));
test('paused status denies access',()=>assert.equal(isPaidEntitlement(getBillingSnapshot(sub({status:'paused'}),price),true),false));
test('expired period denies access',()=>assert.equal(isPaidEntitlement(getBillingSnapshot(sub({items:{data:[{price:{id:price},current_period_end:past}]}}),price),true),false));
test('wrong Stripe price is rejected',()=>assert.equal(getBillingSnapshot(sub(),'price_Wrong'),null));
test('two line items are rejected',()=>assert.equal(getBillingSnapshot(sub({items:{data:[{price:{id:price}},{price:{id:price}}]}}),price),null));
test('missing owner metadata is rejected',()=>assert.equal(getBillingSnapshot(sub({metadata:{}}),price),null));
test('invalid owner UUID is rejected',()=>assert.equal(getBillingSnapshot(sub({metadata:{dd_owner_id:'abc'}}),price),null));
test('invalid customer reference is rejected',()=>assert.equal(getBillingSnapshot(sub({customer:'invalid'}),price),null));
test('missing period end does not grant access',()=>assert.equal(isPaidEntitlement(getBillingSnapshot(sub({items:{data:[{price:{id:price}}]}}),price),true),false));
test('completed checkout subscription reference is parsed',()=>assert.equal(getSubscriptionId(event('checkout.session.completed',{subscription:'sub_A123'})),'sub_A123'));
test('async checkout success reference is parsed',()=>assert.equal(getSubscriptionId(event('checkout.session.async_payment_succeeded',{subscription:'sub_A123'})),'sub_A123'));
test('async checkout failure event is recognized',()=>assert.equal(HANDLED_EVENTS.has('checkout.session.async_payment_failed'),true));
test('subscription deleted event reference is parsed',()=>assert.equal(getSubscriptionId(event('customer.subscription.deleted',{id:'sub_A123'})),'sub_A123'));
test('new invoice parent subscription reference is parsed',()=>assert.equal(getSubscriptionId(event('invoice.paid',{parent:{subscription_details:{subscription:'sub_A123'}}})),'sub_A123'));
test('old invoice subscription reference is parsed',()=>assert.equal(getSubscriptionId(event('invoice.payment_failed',{subscription:'sub_A123'})),'sub_A123'));
test('unsupported event rejected',()=>assert.equal(getSubscriptionId(event('charge.succeeded',{subscription:'sub_A123'})),null));
test('malformed subscription reference rejected',()=>assert.equal(getSubscriptionId(event('invoice.paid',{subscription:'bad'})),null));
test('invalid subscription status rejected',()=>assert.equal(getBillingSnapshot(sub({status:'unknown'}),price),null));
