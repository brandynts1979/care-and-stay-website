# Care & Stay DD Parent App — production subscription integration gates
**Status: IMPLEMENTATION PLAN ONLY — DO NOT ACTIVATE CHECKOUT OR CREATE PRICES BEFORE OWNER/TAX APPROVAL.**

## Verified live Stripe state (Nov 13, 2026 Mountain)
- Connected live account: Care and Stay.
- Existing DD product ID: `prod_Vcl3ez86uLhNFb`; currently **inactive**, no default price, metadata `price_status=not_approved` and `checkout_status=not_launched`. **Reuse this product; do not duplicate.**
- Live price list returned zero active prices. Family Caregiver and other Care & Stay products also currently inactive.
- Stripe Tax settings status: `active`; Tax registration list returned **zero registrations**. An active Tax settings page does not mean collection has been authorized or registered.
- Owner indicated Utah collection is intended but registration with tax authority is not yet verified. Do not create Stripe tax registration without confirming an actual completed tax authority registration.
- DD Parent App monthly price has not been explicitly approved. The approved $39/month belongs to the *Family Caregiver App*; do not silently apply it to the DD app.

## Architecture when approved
1. Resolve DD price, currency, monthly or annual plan, Utah tax handling and commitment period in writing. Legal review of any 12-month minimum, cancellation notice, automatic renewal and no-refunds terms; do not rely solely on Stripe cancellation settings to enforce lawful obligations.
2. Confirm tax registrations and applicable tax code with tax professional; determine taxable jurisdiction and automatic-tax behavior. Create exactly one approved recurring live Price on the existing product; specify tax behavior explicitly.
3. Server-side endpoint/Edge Function creates Stripe Checkout subscription sessions after authenticating user, resolving only an allowlisted price ID from server environment. Never trust client-submitted price, amount, or customer ID.
4. Hosted Stripe Checkout gathers card details. Keep secret API key, webhook signing secret and Supabase service-role key solely on secure server. Never place these in the static browser page.
5. Verify Stripe signature on webhook payload. Persist idempotent event IDs and subscription entitlements keyed by Supabase auth user ID; include email/account linking safeguards. Handle subscription created/updated/deleted, invoice paid, failed recurring invoice and dispute/refund events.
6. Protect paid API and stored resources with server-verified entitlements and an appropriate grace-period policy. UI-only restrictions are insufficient. Do not block development test accounts until separately migrated.
7. Provide customer billing portal for updating payment method, invoices and cancellation where permitted by subscription terms and legal obligations.
8. Full sandbox test matrix: successful checkout, incomplete payment, canceled checkout, subscription renewal, payment failure, reactivation, cancellation, duplicate/out-of-order webhook, invoice/tax preview, multiple family accounts and cross-account entitlement denial.
9. After legal/tax approval and sandbox verification, activate appropriate live product and checkout, observe first safe real payment with explicit owner authorization, and audit entitlements.

## Blocking approvals
- DD price and subscription term: **not approved**.
- Tax registration and treatment: **not confirmed** (no Stripe registrations).
- Legal language for 12-month commitment, cancellation and refund practices: **not reviewed**.
- Webhook + entitlements + customer portal: **not implemented**.
- Public paid launch: **NO-GO**.
