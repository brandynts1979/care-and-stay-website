# Stay Culture Leadership Academy — release specification

**Branch:** `academy-launch-foundation-20261116`  
**Status:** Development only; not launched. The public information page is not an LMS.

## Carry-forward requirements
- Six modules, 24 text lessons, 72 scenario choices and feedback; preserve the existing approved lesson content rather than inventing replacements.
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

## What this branch implements now
- `academy/index.html`: responsive, accessible **public information page** with truthful enrollment-closed status.
- This release specification. Neither a functional learner portal nor paid enrollment is claimed.
- The page stays on a separate branch until real security, billing, and learner-flow testing is complete.
