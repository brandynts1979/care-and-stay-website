import test from 'node:test';
import assert from 'node:assert/strict';
import {HANDLED_EVENTS,getSubscriptionId,getBillingSnapshot,isPaidEntitlement} from '../edge-functions/dd-stripe-webhook-PRELAUNCH/event-mapping.mjs';

const owner='2acc9586-ae07-4a06-b27f-4a6ee7f807de';
const price='price_1Ubr0GHU2Vcv1mFQgOfj2Ww8';
const future=Math.floor(Date.now()/1000)+86400*30;
const basic=()=>({
 id:'sub_123ABC',customer:'cus_123ABC',metadata:{dd_owner_id:owner},
 items:{data:[{price:{id:price},current_period_end:future}]},
 status:'active',cancel_at_period_end:false
});
const ev=(type,obj)=>({type,data:{object:obj}});
test('subscription references resolve for immediate and async Checkout payments',()=>{
 for(const t of ['checkout.session.completed','checkout.session.async_payment_succeeded','checkout.session.async_payment_failed']){
  assert.equal(getSubscriptionId(ev(t,{subscription:'sub_123ABC'})),'sub_123ABC');
 }
});
test('subscription events map a subscription id',()=>{
 for(const t of ['customer.subscription.created','customer.subscription.updated','customer.subscription.deleted']){
  assert.equal(getSubscriptionId(ev(t,{id:'sub_123ABC'})),'sub_123ABC');
 }
});
test('invoice events support modern and legacy references',()=>{
 for(const t of ['invoice.paid','invoice.payment_failed']){
  assert.equal(getSubscriptionId(ev(t,{parent:{subscription_details:{subscription:'sub_123ABC'}}})),'sub_123ABC');
  assert.equal(getSubscriptionId(ev(t,{subscription:{id:'sub_123ABC'}})),'sub_123ABC');
 }
});
test('reject unrecognized or forged billing event subscriptions',()=>{
 assert.equal(getSubscriptionId(ev('invoice.created',{subscription:'sub_123ABC'})),null);
 assert.equal(getSubscriptionId(ev('checkout.session.completed',{subscription:'sub_fake/../../'})),null);
 assert.equal(getSubscriptionId(ev('checkout.session.completed',{})),null);
 assert.equal(getSubscriptionId(null),null);
 assert.ok(HANDLED_EVENTS.has('checkout.session.async_payment_failed'));
});
test('bind one DD subscription to exact approved price and valid owner/customer',()=>{
 const result=getBillingSnapshot(basic(),price);
 assert.equal(result.ownerId,owner);
 assert.equal(result.customerId,'cus_123ABC');
 assert.equal(result.priceId,price);
 assert.equal(result.status,'active');
 assert.match(result.periodEnd,/Z$/);
 assert.equal(getBillingSnapshot({...basic(),metadata:{dd_owner_id:'random'}},price),null);
 assert.equal(getBillingSnapshot({...basic(),customer:'cus_forbidden/'},price),null);
 assert.equal(getBillingSnapshot({...basic(),items:{data:[...basic().items.data,...basic().items.data]}},price),null);
 assert.equal(getBillingSnapshot(basic(),'price_unapproved'),null);
});
test('access requires a PAID invoice, active status, and current paid period',()=>{
 const s=getBillingSnapshot(basic(),price);
 assert.equal(isPaidEntitlement(s,true),true);
 assert.equal(isPaidEntitlement(s,false),false);
 assert.equal(isPaidEntitlement({...s,status:'trialing'},true),false);
 assert.equal(isPaidEntitlement({...s,status:'past_due'},true),false);
 assert.equal(isPaidEntitlement({...s,status:'canceled'},true),false);
 assert.equal(isPaidEntitlement({...s,periodEnd:null},true),false);
 assert.equal(isPaidEntitlement(s,true,Date.parse(s.periodEnd)+1),false);
});
