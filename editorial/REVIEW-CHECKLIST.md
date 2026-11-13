# Stay Culture Journal editorial review checklist

An article may be displayed on an editorial preview without approval. This does not constitute permission to publish.

## Content gate
- [ ] Founder approves article wording, headline, byline, and final CTA
- [ ] Every quantitative or factual claim checked against an appropriate original source
- [ ] Quotes attributed accurately; written permission for contributor interviews and guest content
- [ ] No identifiable client or participant information; anonymization reviewed
- [ ] Article category, slug, canonical URL, metadata, and cross-links verified
- [ ] Mobile layout, accessibility, and navigation checked
- [ ] No accidental sample/demo instructions or editorial-review labels in approved production content
- [ ] Owner explicitly authorizes deployment separately from editorial review

## Publication recording
Update `editorial/approval-register.json` for a specific article only after explicit owner consent.
Set status=approved, ownerApproved=true, approvalDate (ISO date), and approvedBy (real approver).
The command `node tools/journal/check-publication.mjs <slug>` rejects articles missing these fields. This is an advisory validation tool, not an enforced CI rule or production deploy gate yet.

## Newsletter gate
- [ ] HubSpot onboarding verified
- [ ] Journal subscription type and consent language approved
- [ ] Sender identity, unsubscribe path, and compliant list selection verified
- [ ] Preview/test email reviewed
- [ ] Explicit owner approval before any email is sent
