# Care & Stay community launch

## Implemented in this branch
- Community hub, distinct family caregiver and DD family entrances, shared guidelines.
- Free basic membership positioning; no subscription or billing changes.
- Public journal structure and one clearly labeled editorial draft.
- Email inquiry links use the existing site contact. No data collection or enrollment is simulated.
- Existing main navigation gains a Community & Journal dropdown.

## Required before discussions open
1. Select the community backend and authentication deployment. Keep care profiles, assessments, and family records separate from discussion data. Existing projects include production Beta, caregiver staging, DD development, and Individual 360; do not choose one by guesswork.
2. Implement verified adult member registration, explicit community opt-in, editable display names, and membership terms acceptance.
3. Enforce membership and moderation roles on the server/database, including direct API access. No public access to posts. Prevent cross-community access without enrollment.
4. Add topics, posts, replies, pagination, reporting, moderator queue, removal/suspension, rate limits, and account/content deletion. Do not enable private messaging or uploads at initial launch.
5. Set notification preferences; never place private post text in public pages or notification emails by default.
6. Publish privacy notice and membership terms; designate the human moderator and publish actual coverage/reporting arrangements.
7. Test anonymous denial, cross-member/community access, privilege escalation, suspension, deletion, malicious content, and reporting using fictional users.
8. Obtain editorial review of the journal draft; invite founding members only once access controls and moderation pass verification.

## Launch cadence
One host-led question per caregiver community weekly. Two journal articles monthly. Leadership discussion remains tied to future paid Academy/coaching groups.

No member discussions, authentication, subscriptions, or database changes are implemented by this foundation branch.
