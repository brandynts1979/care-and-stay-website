# Care & Stay DD Caregiver — release-readiness gates

**Environment:** development only; fictional records only. Do not accept real disability, education, or health data until all mandatory gates have evidence.

| Gate | Current state | Evidence needed |
| --- | --- | --- |
| Database isolation / RLS | Basic tests pass | Expanded negative tests, cross-record inserts, authorization review |
| Invites and revocation | Transactional tests pass | End-to-end tests with distinct verified accounts, revoked access after refresh |
| Tasks | Basic database tests pass | Real assigned-user browser test, role-specific restrictions |
| Documents metadata | Owner-only tests pass | Real object upload/download/delete and storage RLS tests using disposable fictional files |
| Browser journeys | Playwright mocked tests committed, execution unverified | Successful GitHub Actions workflow run (Chromium) |
| CI gating | Workflow committed, status unverified | Verified run and release blocking on failure |
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
