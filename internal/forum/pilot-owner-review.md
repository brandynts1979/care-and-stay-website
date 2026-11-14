# Founding-pilot operating plan — ready for owner review
2026-11-14

## Proposed pilot
Keep Family Caregivers and DD Parents & Families separate and free. Begin with a small invited group. Keep leadership articles in Stay Culture Journal; no leadership discussion forum or payment requirement is needed for this pilot.

## Proposed moderation commitment
Brandyn moderates both communities. Review both report queues each weekday. Acknowledge ordinary reports within two business days when possible; do not promise continuous monitoring or emergency response. Before inviting members, confirm that this schedule is realistic and identify backup coverage or a procedure to pause participation during absences.

## Support and removal
Proposed contact: hello@mycareandstay.com. The owner must confirm this mailbox receives messages and is monitored before it is published as a support commitment.
Members may remove their own messages and leave a community. Account closure is assisted, not self-service. Verify ownership, preview affected records, then execute the operator-only closure function after the member confirms the request.
The function removes the forum auth account and memberships, replaces authored text with a removal notice, hides authored posts, removes reports filed by/about that account's messages, and anonymizes directly linked audit records. Other members' replies remain stored; replies beneath a removed root are not visible through the forum.
It does not remove identifying text another member copied into a separate post, historical backups, or external provider logs. Review those separately under the final retention policy. No caregiver or assessment account is touched.

## Retention proposal requiring approval and implementation
Keep ordinary discussions while the community operates, subject to user removal.
Keep resolved reports and moderation audit records for 90 days unless an incident requires a documented exception, then remove them through a scheduled retention process.
Do not state a backup-erasure deadline until the provider's actual backup retention is verified.
The 90-day purge has NOT been implemented; it is a proposed operating decision.

## Release gates still open
1. Authenticated browser tests, including recovery email, mobile layout, and session changes. Database tests passed, but these browser checks are not yet complete.
2. Confirm monitored support mailbox and moderation coverage.
3. Approve and implement retention choices; prepare final privacy/membership copy reflecting actual practices.
4. Verify backup availability and recovery before public launch.
5. Scope pilot invitations without opening general registration/discussion access prematurely.

## Verified account-removal tests
Read-only preview; client roles cannot execute removal; test account removed; authored content scrubbed; other replies preserved; requests using deleted identity denied. All fixture changes rolled back.
Operator-only function deployed to the existing community staging database. No real account deleted. This is not yet a public launch approval.

## Launch readiness update — November 13, 2026 (Mountain Time)
- Authenticated owner-session browser QA passed: sign-in, both communities, report queue access, fictional thread creation, reply with posting rate limit, report, report resolution, own-thread removal, and community switching.
- Desktop-only responsive inspection passed; 390px mobile viewport was not available in the browser automation. Mobile remains unverified.
- Public signed-out inspection found an account-creation button and draft launch copy on the deployed staging revision; staging GitHub changes hiding registration have not yet appeared in Render deploy history. Do not imply the new revision is live.
- Two clearly marked **draft-only** documents were added to the staging branch at community/privacy/ and community/terms/. Final privacy/membership terms, retention details, support monitoring and owner approval still remain open.
- Hosted Supabase advisor: leaked password protection disabled (WARN). Five private schema RLS/no-policy INFO findings are intentional default-deny; all five private tables have RLS and deny direct SELECT to anon and authenticated.
- Confirmed cs_forum_private.settings.enabled=false; the moderator access exception supports owner testing, but broad participation is still blocked.
- Backups and restore test not verified; current Supabase plan and backup inventory not independently verified. Do not announce recovery capability.
- Public launch NOT authorized as complete until support inbox and alternate moderator are verified, security warning reviewed, legal copy finalized, a working deploy is checked, and email recovery/mobile tests pass.
