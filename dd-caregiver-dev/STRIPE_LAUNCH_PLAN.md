# Care & Stay DD Parent App — production subscription integration gates
**Status: PRELAUNCH INTEGRATION IN PROGRESS — PRICE APPROVED AND SAVED INACTIVE. DO NOT ACTIVATE CHECKOUT UNTIL TAX REGISTRATION AND OTHER RELEASE APPROVALS.**

## Verified live Stripe state (updated Nov 14, 2026 Mountain)
- Connected live account: Care and Stay.
- Existing DD product ID: `prod_Vcl3ez86uLhNFb`; currently **inactive**, no default price, product metadata still says `price_status=not_approved` and `checkout_status=not_launched` (metadata not yet updated). **Reuse this product; do not duplicate.**
- Live price list returned zero active prices. Family Caregiver and other Care & Stay products also currently inactive.
- Stripe Tax settings status: `active`; Tax registration list returned **zero registrations**. An active Tax settings page does not mean collection has been authorized or registered.
- Owner indicated Utah collection is intended but registration with tax authority is not yet verified. Do not create Stripe tax registration without confirming an actual completed tax authority registration.
- **Owner explicitly approved DD Parent App at $39/month plus applicable sales tax (Nov 14, 2026).** Stripe recurring USD Price created under the existing product: `price_1Ubr0GHU2Vcv1mFQgOfj2Ww8`, 3,900 cents/month, `tax_behavior=exclusive`, **active=false**, no default live checkout and no charges.

## Stripe sandbox subscription tests — Nov 14, 2026
- Separate Care and Stay **sandbox** DD Parent App created, product `prod_Vd7tILIJXoq7vZ`, recurring exclusive-of-tax $39/month price `price_1Ubre8HJxPBidfhbs6uTl1cc`, tax code `txcd_10103000` (personal-use web SaaS). Existing Family Caregiver sandbox product unchanged.
- Stripe-hosted **test-mode** subscription checkout session `cs_test_a0cpSjmbsiv0wLE8uBwepBcfIGGjrY3R3nlofYe8ZjnAsLHfBRoswar9NA` created with `automatic_tax.enabled=true` and required billing address; GET verification confirmed session OPEN, `payment_status=unpaid`, no subscription created. Read-only browser inspection passed for test-mode labeling, product, $39 recurring amount and address-based tax.
- Single sandbox tax calculation for a **fictional South Jordan, UT ZIP 84095** billing address returned taxability reason `standard_rated`, 7.45% or $2.91 on $39, sample total $41.91. **Illustration only**, not a promised tax rate; tax depends on buyer's actual location, and Stripe Tax may not collect in an unregistered jurisdiction.
- **No complete paid-subscription transaction or webhook integration has been tested:** there is no completed test payment, no registered Stripe webhook destination/signing secret, no protected paid-data API, and no end-to-end customer account entitlement. Never represent the test-mode Checkout page as a completed production subscription flow.
- Production implementation review source prepared at `edge-functions/dd-subscription-gateway-PRODUCTION-REVIEW/index.ts` (authenticated Checkout + portal, account binding, Stripe automatic tax, release flag hardcoded false), **not deployed**. Existing deployed `dd-subscription-gateway` still returns HTTP 503 to checkout/portal and no paid entitlements. Webhook review source remains undeployed.
- Live product and price remain INACTIVE; Utah Tax registration remains outstanding. Customer checkout and real family-record access remain blocked.

## Implementation progress and architecture
1. **Price resolved:** DD $39/month USD exclusive of applicable sales tax. Subscription minimum commitment, Utah tax registration/tax treatment remain open.  Legal review of any 12-month minimum, cancellation notice, automatic renewal and no-refunds terms; do not rely solely on Stripe cancellation settings to enforce lawful obligations.
2. Confirm tax registrations and applicable tax code with tax professional; determine taxable jurisdiction and automatic-tax behavior. **Do not create another DD live recurring price**: reuse the existing inactive approved price above.
3. Server-side endpoint/Edge Function creates Stripe Checkout subscription sessions after authenticating user, resolving only an allowlisted price ID from server environment. Never trust client-submitted price, amount, or customer ID.
4. Hosted Stripe Checkout gathers card details. Keep secret API key, webhook signing secret and Supabase service-role key solely on secure server. Never place these in the static browser page.
5. **Server-only DB foundations created:** `dd_subscription_entitlements` and `dd_stripe_webhook_events` RLS denies client read/write; owner-identity role tests passed. Service-only idempotent function `dd_apply_verified_stripe_event` passed duplicate/out-of-order/cancellation transactional tests, rolled back with zero records. **Prelaunch webhook source** in `edge-functions/dd-stripe-webhook-PRELAUNCH/index.ts` is deliberately NOT deployed/registered or secret-configured. Verify Stripe signature on webhook payload. Persist idempotent event IDs and subscription entitlements keyed by Supabase auth user ID; include email/account linking safeguards. Handle subscription created/updated/deleted, invoice paid, failed recurring invoice and dispute/refund events.
6. **Authenticated gateway deployed** `dd-subscription-gateway`. The `status` endpoint works; `checkout` and `portal` return HTTP 503 while release flag is hardcoded `false` (live signed-in QA verified). Protect paid API and stored resources with server-verified entitlements and an appropriate grace-period policy. UI-only restrictions are insufficient. Do not block development test accounts until separately migrated.
7. Provide customer billing portal for updating payment method, invoices and cancellation where permitted by subscription terms and legal obligations.
8. Full sandbox test matrix: successful checkout, incomplete payment, canceled checkout, subscription renewal, payment failure, reactivation, cancellation, duplicate/out-of-order webhook, invoice/tax preview, multiple family accounts and cross-account entitlement denial.
9. After legal/tax approval and sandbox verification, activate appropriate live product and checkout, observe first safe real payment with explicit owner authorization, and audit entitlements.

## Utah sales tax registration — owner confirmed still pending (Nov 14, 2026)
- Owner confirmed Care & Stay has **not yet completed Utah sales tax registration**. Official Utah Tax Commission instructions: https://tax.utah.gov/business/create-manage/tax-info-business/ and https://tap.utah.gov/ — apply for tax account(s) via TC-69.
- Do not treat Stripe Tax settings being active as evidence of registration. Confirm issuance of the Utah sales tax license/account number and the actual effective date before adding Utah registration in Stripe.
- Verify correct tax treatment/code for Care & Stay's DD and caregiver consumer SaaS subscriptions, filing obligations and other product types with the Utah State Tax Commission or a qualified tax adviser. Utah Pub 64 discusses remotely accessed prewritten software.
- $39/month DD recurring Price is created with `tax_behavior=exclusive` but remains **inactive**. Do not enable checkout or collect tax without verified registration and tax treatment.
- Record the registration number and sensitive tax IDs only in secure merchant/government systems, never in public GitHub or chat.

## Blocking approvals
- DD price **approved** at $39/month plus applicable sales tax; commitment/renewal policy and legal terms **not yet approved**.
- Tax registration and treatment: **not confirmed** (no Stripe registrations).
- Legal language for 12-month commitment, cancellation and refund practices: **not reviewed**.
- Webhook + entitlements + customer portal: **database/event projection and prelaunch code prepared, but no active webhook or payment-processing implementation; portal and paid entitlements not available**.
- Public paid launch: **NO-GO**.
