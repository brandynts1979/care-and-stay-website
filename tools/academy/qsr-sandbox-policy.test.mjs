import test from "node:test";
import assert from "node:assert/strict";
import {QSR_SANDBOX, checkoutMode, acceptsWebhookMode, validSandboxPrice, validSandboxSubscription} from "../../academy/edge-functions/_shared/qsr-sandbox-policy.mjs";
const settings={
 SUPABASE_URL:QSR_SANDBOX.projectOrigin,ACADEMY_SITE_ORIGIN:QSR_SANDBOX.siteOrigin,
 ACADEMY_STRIPE_PRICE_ID:QSR_SANDBOX.priceId,STRIPE_SECRET_KEY:"sk_test_fixture",
 ACADEMY_QSR_SANDBOX_CHECKOUT_ENABLED:"true",ACADEMY_BILLING_ENABLED:"false"
};
const env=(overrides={})=>key=>({...settings,...overrides})[key]||"";
const price={id:QSR_SANDBOX.priceId,product:QSR_SANDBOX.productId,livemode:false,active:true,currency:"usd",
 type:"recurring",unit_amount:9900,tax_behavior:"exclusive",billing_scheme:"per_unit",
 recurring:{interval:"month",interval_count:1,usage_type:"licensed"}};
const sub={livemode:false,items:{has_more:false,data:[{quantity:1,price}]}};
test("sandbox checkout needs exact staging project, origin, price, test key and separate flag",()=>{
 assert.equal(checkoutMode(env()),"sandbox");
 for(const overrides of [
  {SUPABASE_URL:"https://production.supabase.co"},{ACADEMY_SITE_ORIGIN:"https://example.org"},
  {ACADEMY_STRIPE_PRICE_ID:"price_other"},{STRIPE_SECRET_KEY:"sk_live_fixture"},
  {STRIPE_SECRET_KEY:""},{ACADEMY_QSR_SANDBOX_CHECKOUT_ENABLED:"false"},
  {ACADEMY_BILLING_ENABLED:"true"}
 ])assert.equal(checkoutMode(env(overrides)),null);
});
test("production remains locked without independent live switch and live key",()=>{
 const live={SUPABASE_URL:"https://production.supabase.co",ACADEMY_BILLING_ENABLED:"true",STRIPE_SECRET_KEY:"sk_live_fixture"};
 assert.equal(checkoutMode(env(live)),"live");
 assert.equal(checkoutMode(env({...live,ACADEMY_BILLING_ENABLED:"false"})),null);
 assert.equal(checkoutMode(env({...live,STRIPE_SECRET_KEY:"sk_test_fixture"})),null);
});
test("existing price must be exact active tax-exclusive monthly USD 99 sandbox product",()=>{
 assert.equal(validSandboxPrice(price),true);
 for(const overrides of [{id:"price_other"},{product:"other"},{livemode:true},{active:false},{unit_amount:19900},
 {tax_behavior:"inclusive"},{currency:"eur"},{recurring:{...price.recurring,interval:"year"}},
 {recurring:{...price.recurring,interval_count:2}},{billing_scheme:"tiered"}]){
  assert.equal(validSandboxPrice({...price,...overrides}),false);
 }
});
test("subscription must contain exactly one approved item at one location quantity",()=>{
 assert.equal(validSandboxSubscription(sub),true);
 for(const items of [
 {has_more:false,data:[{quantity:2,price}]},{has_more:true,data:sub.items.data},
 {has_more:false,data:[...sub.items.data,...sub.items.data]},
 {has_more:false,data:[{quantity:1,price:{...price,unit_amount:19900}}]}
 ])assert.equal(validSandboxSubscription({...sub,items}),false);
 assert.equal(validSandboxSubscription({...sub,livemode:true}),false);
});
test("signed events must also belong to the configured Stripe account mode",()=>{
 assert.equal(acceptsWebhookMode(env(),{livemode:false}),true);
 assert.equal(acceptsWebhookMode(env(),{livemode:true}),false);
 assert.equal(acceptsWebhookMode(env({ACADEMY_QSR_SANDBOX_CHECKOUT_ENABLED:"false"}),{livemode:false}),false);
 const live=env({SUPABASE_URL:"https://production.supabase.co",STRIPE_SECRET_KEY:"sk_live_fixture",ACADEMY_BILLING_ENABLED:"false"});
 assert.equal(acceptsWebhookMode(live,{livemode:true}),true);
 assert.equal(acceptsWebhookMode(live,{livemode:false}),false);
});
