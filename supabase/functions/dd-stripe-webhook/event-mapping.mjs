// Pure, side-effect-free Stripe event parsing for DD subscription billing.
// No secrets or customer data. Reused by Edge webhook and Node contract tests.
const subscriptionId=/^sub_[A-Za-z0-9]+$/;
const ownerId=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const stripeCustomerId=/^cus_[A-Za-z0-9]+$/;
export const HANDLED_EVENTS=new Set([
 'checkout.session.completed',
 'checkout.session.async_payment_succeeded',
 'checkout.session.async_payment_failed',
 'customer.subscription.created',
 'customer.subscription.updated',
 'customer.subscription.deleted',
 'invoice.paid',
 'invoice.payment_failed'
]);
export function getSubscriptionId(event){
 if(!HANDLED_EVENTS.has(event?.type))return null;
 const obj=event?.data?.object;
 if(!obj || typeof obj!=='object')return null;
 let id=null;
 if(event.type.startsWith('customer.subscription.'))id=obj.id;
 else if(event.type.startsWith('checkout.session.'))id=obj.subscription;
 else {
  const sub=obj.parent?.subscription_details?.subscription ?? obj.subscription;
  id=typeof sub==='string'?sub:sub?.id;
 }
 return typeof id==='string'&&subscriptionId.test(id)?id:null;
}
export function getBillingSnapshot(subscription,expectedPrice){
 if(!subscription || !subscriptionId.test(subscription.id||''))return null;
 const owner=subscription.metadata?.dd_owner_id;
 const customer=typeof subscription.customer==='string'?subscription.customer:subscription.customer?.id;
 if(!ownerId.test(owner||'')||!stripeCustomerId.test(customer||''))return null;
 const items=subscription.items?.data||[];
 if(!Array.isArray(items)||items.length!==1||items[0]?.price?.id!==expectedPrice)return null;
 const end=items[0]?.current_period_end;
 const periodEnd=Number.isInteger(end)&&end>0?new Date(end*1000).toISOString():null;
 const accepted=new Set(['incomplete','incomplete_expired','trialing','active','past_due','canceled','unpaid','paused']);
 if(!accepted.has(subscription.status))return null;
 return {
  ownerId:owner,customerId:customer,subscriptionId:subscription.id,
  status:subscription.status,periodEnd,cancelAtPeriodEnd:Boolean(subscription.cancel_at_period_end),
  priceId:expectedPrice
 };
}
export function isPaidEntitlement(snapshot,invoicePaid,asOfMs=Date.now()){
 if(!snapshot||snapshot.status!=='active'||!invoicePaid||!snapshot.periodEnd)return false;
 return Date.parse(snapshot.periodEnd)>asOfMs;
}
