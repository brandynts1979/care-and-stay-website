# Academy restaurant launch configuration

**Current deployment state:** Dedicated Supabase Academy backend active; paid public launch still blocked. User approved $10/month project cost. No live Stripe Academy price exists, and no customer can pay for Academy access.

## Approved commercial structure
- $199 USD per month **per restaurant location**; monthly auto-renewal.
- Unlimited eligible managers and shift leaders **at that one subscribed location**, with no per-seat fees.
- Billing customer: restaurant owner/operator. Authorized owner or designated GM can invite managers; only the billing owner can open Stripe Checkout or billing portal.
- Graduates keep private completion records. Nonpayment revokes content access for non-completed enrollments.
- The prior user preference for a 12-month minimum should be confirmed in the final Academy terms before launch; the backend currently models monthly Stripe billing, **not** an enforced 12-month minimum.
- Price is expressed before tax where applicable. Tax registration and product tax classification are not yet verified.

## Backend services
Source-controlled handlers:
- `academy/edge-functions/academy-manager/index.ts` (Supabase Edge Function `academy-manager`; authenticated JWT required).
- `academy/edge-functions/academy-stripe-webhook/index.ts` (Supabase Edge Function `academy-stripe-webhook`; JWT disabled, Stripe signature checked against **raw request body**).

**Created and deployed:** Dedicated project `care-and-stay-academy` (`seaxmxrnblivtjmlmtsn`) in the confirmed Care & Stay organization, region `us-west-1`, active as of Nov 16, 2026 Mountain. Database changes installed in order:
`academy/database/001_academy_schema.sql`,
`academy/database/002_graduation_gate.sql`,
`academy/database/003_locations_and_invitations.sql`.
Also installed `academy/database/004_require_active_restaurant_for_content.sql` to block paid content when restaurant billing or membership is inactive. All 17 tables have RLS. Security advisor reported only INFO notices for server-only billing/audit tables. Both Edge Functions deployed active; live user and Stripe sandbox E2E still required.

### Server secrets (Supabase project Edge Functions only, never browser)
- SUPABASE_URL
- SUPABASE_ANON_KEY (publishable/legacy anon key for user JWT client)
- SUPABASE_SERVICE_ROLE_KEY
- STRIPE_SECRET_KEY (Stripe **live** after verified go-live)
- STRIPE_WEBHOOK_SECRET (only for this endpoint)
- ACADEMY_STRIPE_PRICE_ID (Stripe recurring $199 USD/month price, bound to the Academy product)
- ACADEMY_SITE_ORIGIN (exact canonical `https://mycareandstay.com` URL; validate production domain)
- ACADEMY_BILLING_ENABLED=`false` until verified, then `true`

### Public client configuration
`academy/learn/config.js` now contains the dedicated Academy Supabase URL and **publishable** key, never secret keys. Set `billingEnabled:true` **only** after Stripe, checkout, webhook, tax, and terms pass. Never place a service-role key, webhook signing secret, or Stripe secret in public GitHub.

## Stripe setup gate
1. Check for an existing Academy product/price; **do not duplicate**. The live account had none on Nov 16, 2026.
2. Confirm correct tax classification for text-first on-demand online courses. Stripe search returned candidate `txcd_20060358` (on-demand written-content courses), but user confirmation is required before applying it.
3. Verify Stripe Tax settings and registration/obligations; Nov 16 live account returned active Tax settings and an **empty tax registrations list**. Do not assume tax collection is compliant or complete.
4. Create/verify a recurring USD price `19900` cents per month, exclusive of applicable tax if approved.
5. Verify Stripe Checkout subscription on each location and one-to-many member entitlements, signed webhook, duplicate/out-of-order events, cancellation, failed-payment handling, and Stripe Customer Portal access.
6. Verify owner/GM invite and manager acceptance with at least two restaurant locations and multiple user accounts, including a zero-seat vs high-seat burst.
7. Confirm refunds, cancellation, 12-month commitment, privacy, accessibility, legal and tax disclosures. No launch with empty course catalog or missing approved curriculum.

## Curriculum gate
The dedicated database contains one **unpublished** Academy course shell and six high-level modules (draft editorial titles); 0 published lessons, 0 scenarios, and 0 choices. The historical course design is six modules, 24 complete lessons, 72 scenario choices. Exact approved source text/feedback for all 24 lessons has **not been recovered into a publishable seed bundle**; the production database currently has no imported Academy content. Do not publish placeholder content and charge owners for it.

## CI coverage
GitHub workflow `.github/workflows/academy-public-checks.yml`: HTML/public safety; JavaScript syntax; Deno Edge Function type checks; disposable PostgreSQL 17 schema and RLS tests; graduation tests; per-location unlimited seat and invitation isolation. Passing this does **not** substitute for real hosted-user and Stripe E2E tests.

## Release rule
Leave `ACADEMY_BILLING_ENABLED=false` and `billingEnabled:false` until all above gates pass. Do not merge this branch into the live site as a paid Academy without production authorization and staged payment evidence.
