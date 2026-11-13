# Community membership and discussion candidate

This code is saved for review and local testing. It is not deployed and is not ready for real family information. Default browser and database gates are closed.

## Reproduce checks

From the repository root:

```sh
npm --prefix tools/forum ci --ignore-scripts
npm --prefix tools/forum test
npm --prefix tools/forum run build
```

`client.js` is the editable source. `community/members/app.js` is the committed static bundle, so the existing static hosting requires no new build command. Dependencies are version-pinned with a lockfile. PGlite runs a real PostgreSQL engine locally in WASM with minimal Auth fixtures; it does not verify hosted PostgREST, Supabase Auth email delivery, or production session behavior.

## Database design

`schema.sql` is a one-time deployment candidate, not a generated migration. Review and apply to a dedicated community staging database after inspecting it for naming collisions. Do not execute against the caregiver, DD care-planning, or assessment databases by default.

All records live in `cs_forum_private`, which must NOT be added to the Supabase exposed schema list. RLS is enabled and client roles receive no table or sequence privileges. The public `cs_forum_request` wrapper runs as invoker. It delegates to a private definer function with an empty search path, static SQL, explicit action allowlist, verified user lookup, and community/role checks on every request. This is the authorization boundary; the local test suite tests this function directly under the authenticated role. Never weaken it to resolve UI errors. Do not grant members SQL access or ability to edit authorization tables.

Roles are in the protected members table, never user-editable Auth metadata. Each community has its own membership and moderator assignment. Authentication does not automatically enroll anyone. No care data is joined or copied. Public articles remain static and independent.

A deleted or banned Auth user is denied by the user lookup. Supabase access tokens may remain usable until expiry after sign-out; suspension in the protected membership table takes effect at the next API request. Choose appropriate short token lifetimes and test expired/revoked sessions on staging. Previously downloaded text cannot be recalled.

## Staging activation procedure

1. Create/select the dedicated community staging project and inspect existing schemas. Apply the reviewed SQL as the database owner. It creates objects once; do not rerun over an existing schema.
2. Keep email confirmation enabled; disable anonymous sign-ins. Configure a staging site URL and exact `/community/members/` redirect URL. Enable delivery controls and test verification, password reset, and resend with fictional accounts. The browser uses PKCE: links must complete in the browser that initiated the request.
3. Bootstrap verified test members via the Auth console, then grant the intended moderator role through trusted database administration. Do not add a self-assignment endpoint. Test moderator scope independently in each community.
4. Use the staging URL and a publishable key in `community/members/config.json`. Never put a secret/service-role key in the website. Set its `enabled` flag only on the staging branch once ready. Set the single private settings row `enabled=true` in staging when beginning the test. The database gate remains authoritative if browser config is changed.
5. Run the twelve access scenarios via real REST calls as anonymous, two unrelated members, and moderators. Verify that a private schema request and direct table paths cannot disclose records. Inspect security advisors and fix new issues. Test pagination, user-authored HTML rendering as text, sign-out, and lost-network recovery in browsers.
6. Capture a proper migration with the Supabase CLI workflow when verified. Complete privacy/terms, moderator coverage, account deletion, retention and backup decisions before public activation.

Keep both gates closed for the public website until the launch checklist is complete. No backend deployment or paid Supabase resource was created by this change.
