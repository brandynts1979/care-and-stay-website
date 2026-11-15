# Community pilot operations — working draft
Updated 2026-11-14. Internal procedure, not published membership terms or a service-level commitment.

## Current verified state
The existing staging site serves separate family-caregiver and DD-family communities. The owner has joined both and has active moderator roles. General discussion access remains disabled; preassigned moderators can access their own communities. No invitations have been sent.

Twelve local access-control tests passed. Hosted transaction checks passed for creation, replies, reporting, moderator queue access, hiding/restoring, report resolution, suspension, and cross-community rejection. Fictional accounts and content were rolled back. Tests did not open access to other sessions.

Browser checks confirmed the registration controls and navigation to/from guidelines. The automation browser has a separate signed-out session; authenticated browser workflows, password recovery, mobile usability, and session-change behavior remain unverified. Database tests do not replace those checks.

## Moderation procedure
1. Review the report queue in each community separately. A moderator appointment in one community does not imply access to another.
2. Read the reported post in context and check the guidelines. Avoid copying personal or medical details into the reason field.
3. Hide content when needed to limit exposure while reviewing. Record a short factual reason. A hidden root also blocks its replies.
4. Restore content when appropriate, with an explanation in the audit reason. Resolve the report only after the review is complete.
5. Pause a member only when warranted by conduct. Document the behavior and applicable guideline. Suspended members cannot rejoin to bypass the restriction.
6. Have another moderator review contested decisions where possible. A backup moderator and a verified contact channel must be established before public launch.
7. Urgent concerns are not handled as an emergency service. Do not promise continuous monitoring or an emergency response.
8. Do not publish member stories or use them in marketing without separate permission.

Before launch, the owner must choose coverage hours and a realistic report-response target. Proposed pilot operating practice: inspect both queues each business day and arrange backup coverage. This is a proposal, not a published promise or an automation.

## Account and content removal — proposed assisted workflow
No automated account-deletion feature is implemented. Do not advertise one.

1. Receive a request through an owner-confirmed monitored support channel. The site's existing contact link is not evidence that its inbox is monitored.
2. Verify control of the registered account; never ask for a password, government ID, care records, or another person's sensitive information.
3. Clarify whether the request is to leave one community, remove identified content, or close the entire forum account. A forum request must not affect the caregiver, DD app, or assessment accounts in separate projects.
4. Before removing the sole moderator, appoint a replacement or close the affected community.
5. For full closure, block access and revoke sessions before deleting the auth user. Existing access tokens can outlive session revocation; the forum gateway also checks that the user still exists.
6. Prepare a transaction preview of the user's messages, reports, memberships, and audit links. Apply the agreed retention policy before executing removal.
7. Deleting the auth user alone is insufficient: message bodies remain while author links become null. Explicitly handle authored text and any identifying material. Preserve other people's replies unless the approved policy requires otherwise.
8. Record completion without retaining unnecessary personal details. Explain backup expiry accurately; do not promise immediate erasure from every backup.
9. Test the full procedure on disposable fixtures, including access denial with an existing token, before treating it as production-ready.

Still required: choose retention periods for messages, reports, moderation audit records, and backups; confirm recovery procedures; implement and test the removal operation. No permanent deletion has been performed.

## Launch gates
- Complete authenticated desktop/mobile browser tests and recovery-email checks.
- Finalize membership terms and privacy notice, including retention and removal.
- Confirm support inbox ownership, moderation coverage, and backup moderator.
- Test assisted removal and backup recovery.
- Review published copy so it accurately distinguishes registration, private pilot access, and public launch.
- Keep the Journal editorial draft separate from approved publication.
