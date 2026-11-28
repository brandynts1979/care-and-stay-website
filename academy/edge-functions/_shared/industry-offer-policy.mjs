// Server-only commercial route policy. No price, secret, or offer is enabled by this file.
// Existing QSR/legacy checkout remains an independent route.
import { QSR_SANDBOX } from "./qsr-sandbox-policy.mjs";
export const INDUSTRY_COURSE_IDS=Object.freeze({
  "senior-care":"4e9d56db-6ece-8b5f-ac7c-8bd24f809617",
  "hospice":"01fa508f-2265-8915-9ed3-cd48611927ad",
  "home-care":"6bec604c-2d3c-88ad-a04f-3f80c4471c5c",
  "dd-services":"2d90f628-dcc5-8d94-a5a3-6c343106187d",
  "hospitality":"6f3d57ab-a581-880e-be45-8e6bc75ec481"
});
const ids=new Set(Object.values(INDUSTRY_COURSE_IDS));
const testKey=k=>/^(sk|rk)_test_[A-Za-z0-9]+$/.test(k||"");
const liveKey=k=>/^(sk|rk)_live_[A-Za-z0-9]+$/.test(k||"");
const testEnvironment=env=>env("SUPABASE_URL")===QSR_SANDBOX.projectOrigin &&
 env("ACADEMY_SITE_ORIGIN")===QSR_SANDBOX.siteOrigin && testKey(env("STRIPE_SECRET_KEY")) &&
 env("ACADEMY_BILLING_ENABLED")!=="true" && env("ACADEMY_INDUSTRY_BILLING_ENABLED")!=="true";
export function industryCheckoutMode(env){
 if(testEnvironment(env))return env("ACADEMY_INDUSTRY_SANDBOX_CHECKOUT_ENABLED")==="true"?"sandbox":null;
 return env("SUPABASE_URL")!==QSR_SANDBOX.projectOrigin &&
 env("ACADEMY_BILLING_ENABLED")==="true" && env("ACADEMY_INDUSTRY_BILLING_ENABLED")==="true" &&
 liveKey(env("STRIPE_SECRET_KEY"))?"live":null;
}
export function acceptsIndustryWebhookMode(env,event){
 // Existing paid subscriptions must continue to reconcile when new sales close.
 return testEnvironment(env)?env("ACADEMY_INDUSTRY_SANDBOX_CHECKOUT_ENABLED")==="true"&&event?.livemode===false:
 env("SUPABASE_URL")!==QSR_SANDBOX.projectOrigin&&liveKey(env("STRIPE_SECRET_KEY"))&&event?.livemode===true;
}
export function validIndustryOffer(offer){
 return !!offer&&ids.has(offer.course_id)&&/^price_[A-Za-z0-9_]+$/.test(offer.price_id||"")&&
  offer.price_id!==QSR_SANDBOX.priceId&&/^prod_[A-Za-z0-9_]+$/.test(offer.product_id||"")&&
  typeof offer.livemode==="boolean"&&typeof offer.checkout_enabled==="boolean"&&
  Number.isSafeInteger(offer.unit_amount)&&offer.unit_amount>0&&offer.currency==="usd"&&
  ["exclusive","inclusive"].includes(offer.tax_behavior)&&typeof offer.terms_version==="string"&&offer.terms_version.trim().length>0;
}
export function validIndustryPrice(price,offer,{newCheckout=false}={}){
 if(!validIndustryOffer(offer))return false;
 const product=typeof price?.product==="string"?price.product:price?.product?.id;
 return price?.id===offer.price_id&&product===offer.product_id&&price?.livemode===offer.livemode&&
  (!newCheckout||(offer.checkout_enabled&&price.active===true))&&price.currency===offer.currency&&
  price.unit_amount===offer.unit_amount&&price.tax_behavior===offer.tax_behavior&&
  price.type==="recurring"&&price.billing_scheme==="per_unit"&&
  price.recurring?.interval==="month"&&price.recurring?.interval_count===1&&price.recurring?.usage_type==="licensed";
}
export function validIndustrySubscription(subscription,offer){
 const items=subscription?.items?.data;
 return validIndustryOffer(offer)&&subscription?.livemode===offer.livemode&&
 Array.isArray(items)&&subscription.items.has_more===false&&items.length===1&&items[0]?.quantity===1&&
 validIndustryPrice(items[0].price,offer);
}
export async function industryOfferForLocation(admin,locationId){
 // Null means no industry contract exists. Any lookup or validation error is fail-closed,
 // not permission to silently select the legacy or QSR price.
 const {data:route,error}=await admin.from("academy_industry_location_offers").select("offer_id").eq("location_id",locationId).maybeSingle();
 if(error)throw error;
 if(!route)return null;
 const {data:offer,error:offerError}=await admin.from("academy_industry_offers").select("id,course_id,price_id,product_id,livemode,unit_amount,currency,tax_behavior,terms_version,checkout_enabled").eq("id",route.offer_id).single();
 if(offerError||!validIndustryOffer(offer))throw new Error("Industry Academy offer is not configured");
 return offer;
}

export function industryOfferSummary(offer,course,env,isBillingOwner){
 if(!validIndustryOffer(offer)||course?.id!==offer.course_id||typeof course.title!=="string")throw new Error("Industry Academy course is not configured");
 const mode=industryCheckoutMode(env);
 return {course_title:course.title,unit_amount:offer.unit_amount,currency:offer.currency,tax_behavior:offer.tax_behavior,
   checkout_available:!!isBillingOwner&&course.published===true&&offer.checkout_enabled===true&&!!mode&&offer.livemode===(mode==="live")};
}
export function validIndustryCheckoutConsent(session,subscription,offer){
 return validIndustryOffer(offer)&&session?.metadata?.academy_industry_offer_id===offer.id&&
 session?.metadata?.academy_industry_terms_version===offer.terms_version&&
 subscription?.metadata?.academy_industry_offer_id===offer.id&&
 subscription?.metadata?.academy_industry_terms_version===offer.terms_version&&
 session?.consent?.terms_of_service==="accepted";
}
