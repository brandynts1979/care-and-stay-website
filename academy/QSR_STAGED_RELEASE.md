# QSR Academy staged release runbook

**Development only.** PR #6 is a coordinated change across SQL, two Edge Functions and learner client. No live billing, course publishing or customer data changes are authorized by this file. Keep the legacy course and Monday demo intact.

## Verified baseline and scope
- Existing live Academy has one published legacy slug, `stay-culture-leadership-academy`; new V2 content is private, separate and unpublished.
- Existing location subscriptions, enrollments and historical progress/reflections must not be overwritten.
- New course assignment is an explicit per-location grant. It is not a new price or entitlement to another Care & Stay product.
- The legacy subscription continues to include the legacy course. Other published courses require a separately approved, active, unexpired grant at the same location. Unpublished courses never provision or appear.

## Preflight
1. Pin the exact approved commits and retrieve native CI results. Confirm disposable test suites including two-location revocation and explicit entitlement expiration. Review other Academy workstream changes before any merge.
2. Capture read-only schema/policy signatures and counts of legacy courses/modules/lessons, active location memberships, enrollments, progress, private reflections, submissions and graduations. Use aggregate counts/identifiers as appropriate; do not export private reflection bodies.
3. Confirm the target project/environment and authorized disposable test accounts. Do not use a live customer account for test writes. Verify recovery/backup and authorized rollback route. Preserve existing function configs, JWT verification and CORS settings; never reveal secrets.
4. Ensure sales tax and approved product pricing are separately confirmed. Keep existing billing switches off until purchase-to-entitlement and lifecycle gates pass.

## Coordinated staging order
1. Apply the reviewed `academy/database/staged_qsr_member_revocation.sql` to the isolated target first. It adds restrictive exact-location write checks and service-only atomic revocation RPC. Verify function grants, policy presence, existing legacy row counts, and negative permissions.
2. Apply the reviewed `academy/database/staged_academy_course_entitlements.sql` next. It adds an RLS-protected location-course grant table, service-only entitlement resolver, and authenticated invoker-only learner enrollment selector. Verify no anonymous/learner grant mutation or service RPC access. Existing legacy grants are implicit; do not create any new production entitlements.
3. Deploy the Academy manager and Stripe webhook Edge Functions from the same approved head only after both SQL candidates exist and pass tests. Preserve JWT/signature validation, environment settings and existing routes. Verify exact version and logs.
4. Deploy the learner UI from the same approved head only after the learner RPC is available. Verify hosted page, actual course counts, course selector including location name, private reflection and shared evidence distinction, and owner/GM screens.
5. In isolated environment, import private V2 content with distinct IDs, unpublished. Confirm counts and no legacy changes. Do not copy private curriculum into this public repository. Publish only the isolated test course once explicitly approved for QA and grant it only to the synthetic location. Test full enrollment and access, expiration, cancellation, multi-location users, private reflection, progress, assessment-to-goal selection, and graduation.
6. Run a complete authenticated browser rehearsal using distinct synthetic owner, GM and learner accounts, including another tenant. Verify email invitations, denied permissions, hosted desktop/mobile, signup/recovery, duplicate invitation and stale webhook scenarios, and relevant audit entries. Keep evidence free of secrets.
7. Billing sandbox: separate sandbox catalog and approved tax code, signed webhook delivery, verified checkout and active subscription, failure/retry, duplicate event, cancellation/revocation and dispute/refund/fraud handling. A simulated DB fixture or successful checkout page alone is not purchase-to-entitlement evidence.

## Rollback and stop conditions
- If either SQL transaction fails, stop; confirm rollback and baseline before further deployment. Never deploy Edge/client code that requires a missing RPC.
- If Edge or client deploy fails, keep new courses unpublished and billing disabled, and restore the preceding verified Edge/client release where compatible. Do not remove stronger RLS policies merely to make an error disappear. Assess any compatibility issue, correct it in staging and retest.
- If a permission or tenant leak is found, stop release; revoke affected synthetic grants and preserve evidence. No broad cleanup, disabling RLS or destructive customer operations.
- If a verified hosted regression occurs after an authorized production deployment, follow the reviewed rollback path and confirm actual restoration. Do not claim release readiness from deploy status alone.

## Current gaps
No live authenticated rehearsal, separate hosted V2 deployment, production course grants, complete subscription E2E, or commercial video licensing confirmed. Coordinated SQL candidates are not live migrations. Need review for atomic invite acceptance and webhook concurrent delivery/renewal, approved location contract mapping, cross-product entitlement exchange, and privacy-aware learner goal UI. Do not enable commercial enrollment until these gates and owner decisions are satisfied.
