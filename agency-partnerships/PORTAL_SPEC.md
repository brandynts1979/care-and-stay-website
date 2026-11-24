# Agency Partner Portal — implementation specification

Status: proposed, not functional. One tenant-aware portal with home_care and dd_services agency types; existing family apps remain independent.

## MVP
- Invite-only agency provisioning by Care & Stay administrator; verified email and agency membership.
- Roles: agency owner, administrator, quality lead; least privilege and revocable access. No access to family records by default.
- Agency-specific family invitation and sponsorship ledger; expiring single-use invitations, no payment until explicit agreement. Track invitation counts, activation and entitlement only.
- Service catalog linking existing Stay Culture 360, Individual 360, Academy and coaching inquiry; separate entitlements for each. No automatic account linking by email.
- Quality improvement workspace: organization-level goals, baseline, owner, due date, action, evidence and review. No identifiable client details in MVP.
- Home care prompts: family communication, reliability, continuity, caregiver support. DD prompts: self-determination, dignity, inclusion, supported decision-making and DSP support.

## Security release gates
Server-side authorization on every request; tenant isolation and RLS; no service credentials in browser; audit membership and entitlement changes; test cross-tenant reads/writes, expired invitations, revoked membership and unauthenticated access. No private family coaching chats or care documents exposed. Future sharing requires specific authorization, revocation, audit, applicable privacy/HIPAA review and appropriate agreements. Aggregate feedback requires minimum reporting thresholds and suppression of small groups.

## Expansion workflow
Onboard family pilot; agree baseline and review at 30/60/90 days; identify quality improvement priorities; offer industry academy and Individual 360; offer Stay Culture 360 and executive coaching where relevant. Track customer goals and renewal dates in CRM. No automatic upselling or unapproved billing.

## Pilot measures
Activation, voluntary family feedback, leadership confidence, improvement actions completed and qualitative outcomes. No unvalidated causal or savings claims.
