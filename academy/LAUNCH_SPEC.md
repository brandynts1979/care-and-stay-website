# Stay Culture Leadership Academy — release specification

**Branch:** `academy-launch-foundation-20261116`  
**Status:** Development implementation of the learner portal and dedicated Supabase backend; not yet a paid production launch.

## Carry-forward requirements
- Six modules, 24 text lessons, 72 scenario choices and feedback; a newly authored first-edition draft is staged because the earlier full wording was not recoverable. The draft requires editorial approval before production publication.
- Text-first launch, no videos required. Optional video additions later.
- Private personal reflections; separately shared practice submissions for assigned reviewers.
- Progress saved per learner; authenticated access; approved reviewer decisions; graduation and portfolio with a 90-day plan.
- Personalization using Individual 360 findings only with learner consent and proper access controls.
- Separate product entitlements from the two caregiver apps and both 360 products.
- Stripe checkout **disabled** until Academy pricing, taxes, cancellation terms, prices, webhook, and access provisioning are verified.

## Required server-side data model
- academy_courses, academy_modules, academy_lessons, academy_scenarios, academy_choices
- academy_enrollments (user_id, org_id, course_id, entitlement/status)
- academy_lesson_progress (enrollment_id, lesson_id, completed_at)
- academy_private_reflections (enrollment_id, lesson_id, content)
- academy_submissions (enrollment_id, lesson_id, content, submitted_at)
- academy_reviewer_assignments (reviewer_user_id, enrollment_id)
- academy_reviews (submission_id, reviewer_user_id, decision, feedback)
- academy_graduations (enrollment_id, approved_by, approved_at)
- academy_billing_events (Stripe event ID unique, event type, processed_at)
- academy_audit_log (actor, action, target, timestamp)

All tenant/user isolation must be enforced by RLS or equivalent *server-side* authorization, not merely hidden buttons. Service-role credentials must never enter browser code.

## Release-blocking tests
1. Signup/email verification and secure password recovery.
2. Purchase-to-entitlement from a verified Stripe webhook; duplicate and out-of-order events are idempotent.
3. Learner cannot open another learner's private reflections/progress, even with guessed URLs or API IDs.
4. Reviewer can access only expressly shared submissions from assigned learners.
5. Organization admins cannot access private reflections or another organization's records.
6. Progress persists across refresh and devices; no lost saves on conflict/retry.
7. Scenario choices produce the correct instructional feedback; all 72 choices verified against approved curriculum.
8. Graduation requires all mandated completion conditions and an authorized review.
9. Enrollment/cancellation/expiration consistently grant or revoke access.
10. Keyboard/mobile access, error states, empty states, and links pass.
11. No video placeholder blocks progress.
12. Sandbox and live Stripe environments never mix.
13. Client portal and homepage route to the authenticated Academy only after production tests pass.
14. Data handling/consent/privacy and subscription terms are displayed and reviewed.

## Current implementation and validation (November 16, 2026)
- `academy/index.html`: responsive public Academy information page; enrollment closed.
- `academy/learn/`: account sign-in/sign-up, password recovery, enrolled course navigation, lesson viewing, choices and feedback, private reflections, progress, practice submission and reviewer queue. This is **development code**: `config.js` contains the dedicated hosted Supabase URL and a publishable (not secret) key; it is not linked from production.
- `academy/database/001_academy_schema.sql`: enrollment-gated RLS, private reflections, assigned reviewer access, separate server-owned enrollment and billing tables.
- `academy/database/002_graduation_gate.sql`: server-only graduation requiring completed published lessons and approved submissions.
- GitHub Actions checks public safety, JavaScript syntax, and runs migration/RLS/graduation security tests in disposable PostgreSQL 17. CI passing means those isolated tests passed, **not** production readiness.

## Still required before paid live release
- Review and approve the NEW first-edition curriculum: 24 unpublished lessons, 24 scenarios and 72 feedback choices loaded. Original complete wording could not be recovered.
- Dedicated hosted Academy Supabase project `seaxmxrnblivtjmlmtsn` is created and RLS verified. Configure site URL/allowed Auth email redirects and run real user tests.
- Establish an approved Academy price, tax treatment, terms, and Stripe product/price in Care & Stay live account. Stripe currently has no Academy product.
- Checkout and signed webhook Edge Functions deployed; connect Stripe product/price and secrets and verify real event lifecycle in Stripe sandbox before billing enabled.
- Test real learner signup, cross-account access, reviewer assignment, cross-device saves, billing, support, graduation, and mobile/keyboard flows in staging with real accounts and Stripe test mode.
- Keep public billing and Academy enrollment inactive until those verification gates pass.
