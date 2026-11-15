# Care & Stay Community — controlled public release gates
Updated: 2026-11-14

## Current state — not public
- Staging site: https://care-and-stay-community-staging.onrender.com
- GitHub branch: community-and-journal-foundation
- Community database: nyakemltohexpuoygtgh; private setting enabled=false.
- Static staging registrationOpen is forced false during publish; moderator test sign-in remains available.
- Public website deploys from main. Do NOT merge the community branch directly into main: comparison shows it diverged and is 94 commits behind main. Prepare a fresh integration branch from current main containing ONLY approved community paths, then review before production release. Journal editorial draft must not be published without approval.

## Verified
- Moderator authentication and access to both communities.
- Fictional discussion, reply, rate limit, report, resolution and own-message removal via browser.
- Separate memberships and private database RLS/default-deny checked.
- Password-reset request and owner-reported email delivery.
- Security advisor shows no WARN as of Nov 14.
- Owner screenshot confirms scheduled physical backups; restore not tested.
- Official contact hello@mycareandstay.com confirmed as working.
- No-solicitation policy appears on staging guidelines and terms (previous live commit 37ab63b).

## Release candidate changes after last verified deploy
- Updated participation checkbox references guidelines, membership terms and privacy.
- Fail-closed signup switch; do not enable until legal and signup QA passes.
- Staging publish script forces registrationOpen=false and checks key policies.
- Privacy draft uses confirmed support email.
- Some updates are committed but not yet deployed.

## Hard GO / NO-GO
1. Final privacy policy and membership terms approved and accurately reflect retention, account closure, support, and sponsorships; replace draft labels and publish only approved copy.
2. Choose an operational moderator backup or a tested pause process. Confirm response handling.
3. Test full signup -> confirmation email -> community join -> sign-out/sign-in -> password recovery with a disposable nonowner account. Test unauthorized cross-community access.
4. Complete actual mobile-width QA with a small touchscreen/device emulator; don't equate desktop inspection with mobile QA.
5. Confirm backup inventory and perform non-destructive restore to isolated project with known costs, OR document an explicit accepted residual restore risk.
6. Reconcile branch with current main via fresh integration branch; avoid overwriting new production changes and editorial content.
7. Do a single staging deployment and browser smoke test against the exact commit. Then approve public release.
8. Only after gates pass: make separate public deploy, enable public registration and the private database discussion gate, verify sign-up and a test post, and monitor moderation queues.

## Rollback
Disable server settings.enabled first. This immediately denies general membership access independently of the UI. Then set registrationOpen=false and redeploy the web registration page. Preserve posts and audits for investigation, do not drop tables or delete accounts.

No forum content or customer enrollment has been made public by documenting this checklist.
