# Care & Stay DD Caregiver — release-readiness gates

**Environment:** development only; fictional records only. Do not accept real disability, education, or health data until all mandatory gates have evidence.

| Gate | Current state | Evidence needed |
| --- | --- | --- |
| Database isolation / RLS | Live role-impersonation checks passed Nov 13, 2026: owner read; accepted supporter read but not update; unrelated account neither read nor update. All 8 DD tables have RLS enabled. | Expand cross-record insertion/forgery and storage-permission negative tests |
| Invites and revocation | Transactional tests pass | End-to-end tests with distinct verified accounts, revoked access after refresh |
| Tasks | Live rollback test passed Nov 13, 2026: assigned supporter can update status, but trigger blocks task-title edits; fixture removed. Mocked Playwright create/update/delete passed. | Real assigned-user browser test against Supabase and post-revocation checks |
| Documents metadata | Owner-only tests pass | Real object upload/download/delete and storage RLS tests using disposable fictional files |
| Browser journeys | **7/7 mock-backed Playwright Chromium tests passed** Nov 13, 2026, GitHub Actions run 43465240566 | Staging browser tests against real Supabase Auth and Storage |
| CI gating | GitHub Actions push/PR workflow passes (run 43465240566), pinned Ubuntu 24.04; manual dispatch enabled | Enforce branch protections and block releases on failed checks |
| Deploy automation | Render shows autoDeploy=yes; manual deploys still needed | Commit-to-deploy evidence, deploy rollback plan |
| Authentication | Basic sign-in observed | Signup/verification/recovery, expired sessions, brute-force protection |
| Password protection | Supabase advisor warns disabled leaked-password protection | Enable and re-run security advisors |
| File security | Private bucket, MIME and size restrictions | Malware/content validation strategy, upload/download abuse tests, backups |
| Privacy and compliance | Not approved | Data minimization, consent and guardian authority, retention/deletion, breach plan, appropriate legal review |
| Reliability | Incomplete | Automated E2E against staging, load/performance testing, logging and recovery |
| Accessibility and mobile UX | Incomplete | Keyboard/screen-reader checks and real-device evaluation |
| Human acceptance | Outstanding | Product owner signs off on realistic family scenarios |

## Rules
- Never put actual user files or credentials in automated tests.
- Prefer transactional tests that roll back fixture data; for storage E2E, create disposable fictional files and delete them.
- A committed test is **not** a passing test until an execution result is verified.
- Keep the DD development app separate from the original caregiver app.
- No customer launch until mandatory security, privacy and reliability gates pass.
