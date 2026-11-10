# Stay Culture 360 — Assisted-Sales Customer Launch Runbook

Internal operating procedure. Do not publish customer credentials, personal assessment responses, API keys, or production access tokens.

## Commercial gate
- [ ] Confirm signed proposal with legal entity, primary contact, agreed scope, invited participant cap, assessment window, facilitation/coaching inclusions, price and payment terms.
- [ ] Confirm invoice payment or approved payment terms **before** provisioning.
- [ ] Obtain agreement to privacy notice, data handling terms, retention/deletion policy, and participant communication.
- [ ] Validate customer contact email and designated administrator by a separate trusted channel.

## Provisioning (Care & Stay administrator only)
- [ ] Confirm customer organization is not already registered; never reuse the fictional Master Demo or security-test organization.
- [ ] Create one unique organization ID and a membership for the verified customer admin; use only the admin's authenticated user ID, not an email string or guessed ID.
- [ ] Verify that the new admin can see their organization but not any other organization's assessments or reports.
- [ ] Create assessment in draft; configure the 49 standard questions; confirm correct organization, title, opening and closing dates.
- [ ] Invite participants with appropriate employee/manager/senior-leader perspective and confirm invitation ownership. Never copy test-user identities into a real customer assessment.
- [ ] Confirm the assessment is ready, then open it; question assignments lock after opening.

## Confidentiality and reporting
- [ ] Test a participant's ability to save and submit only their own responses.
- [ ] Confirm administrators cannot read individual raw responses through the client API.
- [ ] Confirm the >=5 completed participant threshold is enforced before aggregate reporting and AI report generation.
- [ ] Confirm small role-based segments are suppressed when their participant counts do not meet the threshold.
- [ ] Verify reports are accessible only to authorized administrators of the assessment's organization.
- [ ] Test access with an outsider and a user who belongs to a different organization.

## Report and delivery
- [ ] Verify completed participant count, pillar scores, written reflections handling, and AI report status.
- [ ] Review generated report for accuracy, unsupported claims, personally identifiable details, and appropriate limitations.
- [ ] Deliver executive debrief and agreed facilitation/coaching services; document next steps.

## Current blockers before first paid customer
- [ ] Finish authenticated cross-organization and RPC security tests.
- [ ] Validate full new-customer workflow end-to-end with a separate test organization and real login.
- [ ] Confirm actual inquiry email inbox, invoice process, terms, privacy notice, and retention/deletion policy.
- [ ] Verify QSR-specific edition and pricing limits before selling QSR as a finished separate assessment.
- [ ] Review public product claims, including sourced restaurant replacement costs and illustrative calculator.

## Current commercial starting prices (proposal-based)
- Assessment & Insights: $2,500, up to 50 invited participants.
- Assessment & Leadership Action: $5,000, up to 50 invited participants.
- Culture Transformation Partnership: from $12,500, scoped individually.
- QSR Essentials pilot: from $495 per location; QSR Leadership pilot: from $995 per location.
- No self-service checkout. Invoices and organization provisioning are managed by Care & Stay.
