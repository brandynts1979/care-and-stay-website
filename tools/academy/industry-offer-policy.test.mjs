import assert from 'node:assert/strict';
import test from 'node:test';
import {INDUSTRY_COURSE_IDS,industryCheckoutMode,acceptsIndustryWebhookMode,validIndustryOffer,validIndustryPrice,validIndustrySubscription,industryOfferForLocation,industryOfferSummary,validIndustryCheckoutConsent} from '../../academy/edge-functions/_shared/industry-offer-policy.mjs';
import {QSR_SANDBOX,checkoutMode} from '../../academy/edge-functions/_shared/qsr-sandbox-policy.mjs';
const config={SUPABASE_URL:QSR_SANDBOX.projectOrigin,ACADEMY_SITE_ORIGIN:QSR_SANDBOX.siteOrigin,STRIPE_SECRET_KEY:'sk_test_synthetic',ACADEMY_STRIPE_PRICE_ID:QSR_SANDBOX.priceId,ACADEMY_QSR_SANDBOX_CHECKOUT_ENABLED:'true'};
const env=values=>key=>values[key]||'';
const offer={id:'synthetic-offer',course_id:INDUSTRY_COURSE_IDS['home-care'],price_id:'price_synthetic',product_id:'prod_synthetic',livemode:false,unit_amount:100,currency:'usd',tax_behavior:'exclusive',terms_version:'fixture-only',checkout_enabled:true};
const price={id:offer.price_id,product:offer.product_id,livemode:false,active:true,currency:'usd',unit_amount:100,tax_behavior:'exclusive',type:'recurring',billing_scheme:'per_unit',recurring:{interval:'month',interval_count:1,usage_type:'licensed'}};
test('separate gates protect QSR and industry test/live checkout',()=>{
 assert.equal(checkoutMode(env(config)),'sandbox');
 assert.equal(industryCheckoutMode(env(config)),null);
 const testEnv={...config,ACADEMY_INDUSTRY_SANDBOX_CHECKOUT_ENABLED:'true'};
 assert.equal(industryCheckoutMode(env(testEnv)),'sandbox');
 assert.equal(checkoutMode(env(testEnv)),'sandbox');
 for(const patch of [{ACADEMY_SITE_ORIGIN:'https://wrong.example'},{ACADEMY_BILLING_ENABLED:'true'},{ACADEMY_INDUSTRY_BILLING_ENABLED:'true'},{STRIPE_SECRET_KEY:'sk_live_synthetic'},{SUPABASE_URL:'https://wrong.supabase.co'}])assert.equal(industryCheckoutMode(env({...testEnv,...patch})),null);
 assert.equal(acceptsIndustryWebhookMode(env(testEnv),{livemode:false}),true);
 assert.equal(acceptsIndustryWebhookMode(env(testEnv),{livemode:true}),false);
 const live={SUPABASE_URL:'https://seaxmxrnblivtjmlmtsn.supabase.co',ACADEMY_SITE_ORIGIN:'https://mycareandstay.com',STRIPE_SECRET_KEY:'rk_live_synthetic',ACADEMY_BILLING_ENABLED:'true',ACADEMY_INDUSTRY_BILLING_ENABLED:'true'};
 assert.equal(industryCheckoutMode(env(live)),'live');
 assert.equal(industryCheckoutMode(env({...live,SUPABASE_URL:'https://different.supabase.co'})),null);
 assert.equal(industryCheckoutMode(env({...live,ACADEMY_SITE_ORIGIN:'https://different.example'})),null);
 assert.equal(acceptsIndustryWebhookMode(env({...live,SUPABASE_URL:'https://different.supabase.co'}),{livemode:true}),false);
 assert.equal(industryCheckoutMode(env({...live,ACADEMY_INDUSTRY_BILLING_ENABLED:'false'})),null);
 assert.equal(acceptsIndustryWebhookMode(env({...live,ACADEMY_BILLING_ENABLED:'false'}),{livemode:true}),true);
 assert.equal(acceptsIndustryWebhookMode(env(live),{livemode:false}),false);
});
test('exact registered course, price, product, amount, tax, quantity and mode',()=>{
 assert.equal(Object.keys(INDUSTRY_COURSE_IDS).length,5);
 for(const course_id of Object.values(INDUSTRY_COURSE_IDS))assert.equal(validIndustryOffer({...offer,course_id}),true);
 for(const change of [{course_id:'qsr'},{price_id:QSR_SANDBOX.priceId},{terms_version:''},{unit_amount:0},{currency:'eur'},{tax_behavior:'unspecified'}])assert.equal(validIndustryOffer({...offer,...change}),false);
 assert.equal(validIndustryPrice(price,offer,{newCheckout:true}),true);
 for(const change of [{id:'price_wrong'},{product:'prod_wrong'},{livemode:true},{unit_amount:200},{currency:'eur'},{tax_behavior:'inclusive'},{type:'one_time'},{billing_scheme:'tiered'},{active:false},{recurring:{...price.recurring,interval:'year'}},{recurring:{...price.recurring,usage_type:'metered'}}])assert.equal(validIndustryPrice({...price,...change},offer,{newCheckout:true}),false);
 assert.equal(validIndustryPrice({...price,active:false},{...offer,checkout_enabled:false}),true);
 assert.equal(validIndustryPrice(price,{...offer,checkout_enabled:false},{newCheckout:true}),false);
 const sub={livemode:false,items:{has_more:false,data:[{quantity:1,price}]}};
 assert.equal(validIndustrySubscription(sub,offer),true);
 for(const bad of [{...sub,livemode:true},{...sub,items:{...sub.items,has_more:true}},{...sub,items:{...sub.items,data:[{quantity:2,price}]}},{...sub,items:{...sub.items,data:[...sub.items.data,...sub.items.data]}},{...sub,items:{...sub.items,data:[{quantity:1,price:{...price,id:'price_wrong'}}]}}])assert.equal(validIndustrySubscription(bad,offer),false);
});
test('no route is distinguishable from an inaccessible or invalid route',async()=>{
 const fake=(route,loaded)=>({from(table){return {select(){return this},eq(){return this},maybeSingle:async()=>route,single:async()=>loaded}}});
 assert.equal(await industryOfferForLocation(fake({data:null,error:null}),"loc"),null);
 await assert.rejects(industryOfferForLocation(fake({error:new Error('missing table')}),"loc"));
 await assert.rejects(industryOfferForLocation(fake({data:{offer_id:'x'}},{data:{...offer,course_id:'qsr'}}),"loc"));
 assert.deepEqual(await industryOfferForLocation(fake({data:{offer_id:offer.id}},{data:offer}),"loc"),offer);
});

test('owner offer summary is exact, private configuration excluded, terms consent mandatory',()=>{
 const course={id:offer.course_id,title:'Home Care Academy',published:true};
 const activeEnv=env({...config,ACADEMY_INDUSTRY_SANDBOX_CHECKOUT_ENABLED:'true'});
 const summary=industryOfferSummary(offer,course,activeEnv,true);
 assert.deepEqual(summary,{course_title:course.title,unit_amount:100,currency:'usd',tax_behavior:'exclusive',checkout_available:true});
 assert.equal(industryOfferSummary(offer,course,activeEnv,false).checkout_available,false);
 assert.equal(industryOfferSummary(offer,{...course,published:false},activeEnv,true).checkout_available,false);
 assert.equal(industryOfferSummary(offer,course,env(config),true).checkout_available,false);
 assert.throws(()=>industryOfferSummary(offer,{...course,id:'other'},activeEnv,true));
 const metadata={academy_industry_offer_id:offer.id,academy_industry_terms_version:offer.terms_version};
 const session={metadata,consent:{terms_of_service:'accepted'}},sub={metadata};
 assert.equal(validIndustryCheckoutConsent(session,sub,offer),true);
 assert.equal(validIndustryCheckoutConsent({...session,consent:null},sub,offer),false);
 assert.equal(validIndustryCheckoutConsent({...session,consent:{terms_of_service:'declined'}},sub,offer),false);
 assert.equal(validIndustryCheckoutConsent(session,{metadata:{...metadata,academy_industry_terms_version:'other'}},offer),false);
 assert.equal(validIndustryCheckoutConsent({...session,metadata:{...metadata,academy_industry_offer_id:'other'}},sub,offer),false);
});

import {readFileSync} from 'node:fs';
test('shared learner portal uses authorized offer summary instead of a hardcoded price',()=>{
 const app=readFileSync(new URL('../../academy/learn/app.js',import.meta.url),'utf8');
 assert.doesNotMatch(app,/Subscribe — \$199/);
 assert.match(app,/loc\.industry_offer/);
 assert.match(app,/offer\.checkout_available===true/);
 assert.match(app,/loc\.billing_owner!==false/);
 const manager=readFileSync(new URL('../../academy/edge-functions/academy-manager/index.ts',import.meta.url),'utf8');
 const webhook=readFileSync(new URL('../../academy/edge-functions/academy-stripe-webhook/index.ts',import.meta.url),'utf8');
 assert.match(manager,/academy_industry_reserve_checkout/);
 assert.match(manager,/terms_of_service:"required"/);
 assert.match(webhook,/validIndustryCheckoutConsent\(session,current,offer\)/);
 assert.match(webhook,/academy_industry_bind_checkout_atomic/);
});
