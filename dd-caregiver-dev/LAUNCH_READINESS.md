# Care & Stay DD Caregiver — release-readiness gates

**Environment:** development only; fictional records only. Do not accept real disability, education, or health data until all mandatory gates have evidence.

| Gate | Current state | Evidence needed |
| --- | --- | --- |
| Database isolation / RLS | Live role-impersonation checks passed Nov 13, 2026: owner read; accepted supporter read but not update; unrelated account neither read nor update. All 8 DD tables have RLS enabled. Additional rollback-only tests Nov 13, 2026 blocked cross-family inserts for strengths, goals, tasks and team invitations and cross-family goal linkage in steps/progress notes; verified zero residual QA rows. | Authenticated real-browser cross-account E2E plus actual Storage API negative tests |
| Invites and revocation | **Live rollback check passed Nov 13, 2026:** removing an accepted invitation immediately hides profile, strengths, goals, goal steps, progress notes, and shared tasks; original invitation restored by ROLLBACK and confirmed. UI now requires two-click revocation, confirmed in 14/14 mocked Chromium tests (run 43534168769). | Real end-to-end browser test of revocation, including after refresh and stale sessions |
| Tasks | Live rollback test passed Nov 13, 2026: assigned supporter can update status, but trigger blocks task-title edits; fixture removed. Mocked Playwright create/update/delete passed. | Real assigned-user browser test against Supabase and post-revocation checks |
| Documents metadata | Owner-only checks plus **live cross-owner document forgery rejection** verified Nov 13, 2026; rollback, zero retained test metadata. | Mocked failure-path tests passed: metadata insert failure cleans uploaded object, and Storage deletion failure preserves document metadata for retry (run 43531328347). Still need real Storage REST upload/download/delete, cross-account denial, cleanup verification |
| Browser journeys | **19/19 mock-backed Playwright Chromium tests passed**, including malformed/expired password recovery, mismatch rejection, and prior file-signature checks, GitHub Actions run 43537145932 (Nov 14, 2026 UTC). Real authenticated staging E2E remains outstanding. | Staging browser tests against real Supabase Auth and Storage |
| CI gating | GitHub Actions push/PR workflow passes (run 43465240566), pinned Ubuntu 24.04; manual dispatch enabled | Enforce branch protections and block releases on failed checks |
| Deploy automation | Render currently live at commit `c3efdabc` (Nov 13, 2026), including password recovery; newer code/test commits require deployment; service configured `autoDeploy=yes`/`commit`, but latest deploy was manual. | Verify an automatic commit-to-live deployment and rehearse rollback |
| Authentication | Signed-in and expired-session behavior tested. Password recovery request and secure reset form added. Incomplete/expired recovery links, mismatched passwords and rejected update sessions now handled safely; simulated Chromium tests passed Nov 14, 2026 (run 43537145932). | Confirm real Supabase reset email delivery/redirect, reset on verified account, signup/verification, and brute-force protection |
| Password protection | **Open warning re-confirmed Nov 13, 2026:** Supabase Security Advisor reports `auth_leaked_password_protection` disabled | Enable leaked-password protection in Supabase Auth settings and re-run Security Advisor; https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection |
| File security | Live config reviewed Nov 13, 2026: bucket private, 10 MB limit, PDF/PNG/JPEG only. Storage path-policy predicates tested for owner/profile binding; forged owner, cross-family person, extra nesting rejected. Bucket currently empty. Client now rejects MIME-spoofed PDF/PNG/JPEG signatures before upload (mocked Chromium test passed Nov 14, 2026). | Real file upload/download/delete with authenticated owner token, negative account tests, **server-side** content and malware checks and backup strategy |
| Privacy and compliance | Not approved | Data minimization, consent and guardian authority, retention/deletion, breach plan, appropriate legal review |
| Reliability | Incomplete | Automated E2E against staging, load/performance testing, logging and recovery |
| Accessibility and mobile UX | Automated Chromium baseline passed Nov 13, 2026: 375px mobile signed-out login has no horizontal overflow; keyboard Tab reaches email/password/sign-in controls (GitHub Actions run 43530739159) | Screen-reader testing, keyboard coverage of signed-in modules and real mobile devices |
| Human acceptance | Outstanding | Product owner signs off on realistic family scenarios |

## Rules
- Never put actual user files or credentials in automated tests.
- Prefer transactional tests that roll back fixture data; for storage E2E, create disposable fictional files and delete them.
- A committed test is **not** a passing test until an execution result is verified.
- Keep the DD development app separate from the original caregiver app.
- No customer launch until mandatory security, privacy and reliability gates pass.
