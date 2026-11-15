# Care & Stay community launch

## Implemented on the draft branch
- Community hub, separate family caregiver and DD family entrances, shared guidelines.
- Free basic membership positioning, public Journal, and one labeled editorial draft.
- Member application: Supabase email/password sign-in, verification resend, password recovery, explicit community opt-in with adult attestation, display names, text discussions/replies, pagination, reporting, own-message removal, and leave-community action.
- Moderator report queue, hide/restore, resolve, suspend/reinstate, and audit trail.
- Backend deployment candidate with private tables, RLS enabled, no direct table access for client roles, and one authenticated RPC gateway. Access requires verified non-anonymous users, community membership, and active membership status. Server defaults closed.
- Browser and database access remain closed. The dedicated staging database is now provisioned and the browser has its URL and publishable key; see `forum/staging-status.md`.

## Validation performed
12 local PostgreSQL-compatible PGlite access tests passed, including anonymous/unverified rejection, membership boundaries, cross-community IDs, forged authors/roles, rate limits, hidden parents, private table denial, reports, suspension/rejoin, moderator scoping, deletion, and closed-state behavior. Build and JavaScript syntax checks passed. Browser inspected the closed member gate, community hub navigation, and DD entrance. Authenticated browser flows and hosted Supabase behavior have NOT yet been verified.

## Next deployment step
Use a dedicated community staging Supabase project. Existing caregiver and assessment projects should not be repurposed by assumption. See `forum/README.md` for the configuration and test procedure. The reviewed schema has now been applied to `care-and-stay-community-staging`; see `forum/staging-status.md` for verification and remaining setup.

## Required before inviting real members
- Select/create staging, configure verified email auth, test redirects, SMTP delivery, CAPTCHA/rate limits and password recovery.
- Apply the reviewed schema, run advisors and direct REST permission tests, then record a proper migration using the Supabase CLI workflow.
- Bootstrap a verified human moderator separately for each community. Members cannot assign roles.
- Publish final privacy/membership terms, coverage hours, report-response expectations, and an account/content deletion process. The current guidelines remain an editorial draft, not final membership terms.
- Complete authenticated desktop/mobile browser tests with fictional users, including network failures, multi-tab account changes, suspended sessions, and public-search exclusion.
- Confirm data retention and backups; test recovery and deletions. Own-message removal currently erases that message but hides rather than deletes replies beneath a removed root; moderators' reports/audit records are retained. No self-service account deletion is implemented.
- Review Journal copy, then invite founding members. No invitations have been sent.

## Scope deferred
Uploads, private messages, email discussion notifications, digest preferences, self-service account deletion, leadership groups, and billing. No care profiles or assessment records are read or copied into the forum.
