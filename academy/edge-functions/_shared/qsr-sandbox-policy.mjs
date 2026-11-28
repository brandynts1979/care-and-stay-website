// QSR test checkout is independent of the production billing switch.
// Never allow a test key, a different project, or a different price to unlock it.
export const QSR_SANDBOX = Object.freeze({
  projectOrigin: "https://dvdvjzqiiekakxzkhora.supabase.co",
  siteOrigin: "https://care-and-stay-qsr-staging.onrender.com",
  priceId: "price_1UgSjtHJxPBidfhbyvsfGsM6",
  productId: "care_stay_qsr_founding_partner_qa_v1",
});
const testKey = key => /^(sk|rk)_test_[A-Za-z0-9]+$/.test(key || "");
const liveKey = key => /^(sk|rk)_live_[A-Za-z0-9]+$/.test(key || "");
export function isQsrSandbox(env) {
  return env("SUPABASE_URL") === QSR_SANDBOX.projectOrigin;
}
export function checkoutMode(env) {
  if (isQsrSandbox(env)) {
    return env("ACADEMY_QSR_SANDBOX_CHECKOUT_ENABLED") === "true" &&
      env("ACADEMY_BILLING_ENABLED") !== "true" &&
      env("ACADEMY_SITE_ORIGIN") === QSR_SANDBOX.siteOrigin &&
      env("ACADEMY_STRIPE_PRICE_ID") === QSR_SANDBOX.priceId &&
      testKey(env("STRIPE_SECRET_KEY")) ? "sandbox" : null;
  }
  // Existing live behavior remains separately gated. No sandbox test keys on a live site.
  return env("ACADEMY_BILLING_ENABLED") === "true" &&
    liveKey(env("STRIPE_SECRET_KEY")) ? "live" : null;
}
export function validSandboxPrice(price) {
  const product = typeof price?.product === "string" ? price.product : price?.product?.id;
  return price?.id === QSR_SANDBOX.priceId && product === QSR_SANDBOX.productId &&
    price.livemode === false && price.active === true && price.currency === "usd" &&
    price.type === "recurring" && price.unit_amount === 9900 &&
    price.tax_behavior === "exclusive" && price.billing_scheme === "per_unit" &&
    price.recurring?.interval === "month" && price.recurring?.interval_count === 1 &&
    price.recurring?.usage_type === "licensed";
}
export function validSandboxSubscription(subscription) {
  const items = subscription?.items?.data;
  return subscription?.livemode === false && Array.isArray(items) &&
    subscription.items.has_more === false && items.length === 1 &&
    items[0]?.quantity === 1 && validSandboxPrice(items[0].price);
}
export function acceptsWebhookMode(env, event) {
  // Sandbox event handling is disabled until the sandbox-only gate is enabled.
  if (isQsrSandbox(env)) return checkoutMode(env) === "sandbox" && event?.livemode === false;
  // Keep existing live subscriptions reconciling even if new checkout is disabled.
  return liveKey(env("STRIPE_SECRET_KEY")) && event?.livemode === true;
}
