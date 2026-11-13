# Stay Culture Journal — Subscription Form Specification

Status: READY FOR HUBSPOT IMPLEMENTATION REVIEW. No live form, contact collection, CRM writes or email sending enabled.

## Form placement
- On the Journal homepage, below featured articles, with a compact newsletter panel.
- An optional inline sign-up at article end after owner approval.
- The Journal remains publicly readable without subscribing.

## Proposed reader-facing copy
**Heading:** Ideas worth staying for.
**Description:** Get two original Stay Culture Journal features each month, plus occasional shorter insights about leadership, healthcare, and quick-service restaurants.
**Email field label:** Email address (required)
**First name field label:** First name (optional)
**Interest selection label:** What would you most like to read about? (optional, multi-select)
- Healthcare & Senior Living
- QSR & Franchising
- Leadership & Culture
- Research & Insights

**Consent checkbox:** [unchecked, required] “Yes, I’d like to receive the free Stay Culture Journal by email. I understand that Care & Stay will use my information to send the Journal and related editorial updates. I can unsubscribe at any time.”
**Action button:** Subscribe to the Journal
**Confirmation message:** Thanks for your interest in the Stay Culture Journal. Please check your email for any confirmation steps.

## Security and privacy safeguards
- Do not pretend a mockup is an active sign-up form.
- Do not collect emails until the HubSpot form is actually configured, verified, and approved.
- Use HubSpot native form handling or a secure backend, not email parameters, query strings or unaudited local storage.
- Configure subscriber consent separately from sales lead imports. Do not enroll existing contacts without valid newsletter permission.
- Link to an approved Privacy Policy before launch.
- Prefer confirmed opt-in where supported, and test unsubscribes.
- Collect only required data. Ensure field submission labels and accessibility.
- Include sender identification, unsubscribe functionality, and any applicable legal requirements in outbound messages.

## Integration checklist
1. Complete HubSpot marketing form setup for the connected account.
2. Determine whether the portal permits a distinct Journal subscription type, or an equivalent separate purpose/consent model.
3. Create a native form with these field labels and required checkbox.
4. Create a Journal subscriber segment using confirmed opt-in and optional interests.
5. Configure consent record, double opt-in if supported, and privacy policy.
6. Obtain HubSpot embed identifier and trusted script only after creation; avoid guessing endpoints.
7. Embed on the staging Journal and test with a controlled test address.
8. Request owner approval for production form enablement; deploy separately.
9. Do not enable automatic marketing emails.

## Status
Current HubSpot connector exposes email and CRM functionality, but not a direct native forms creation action. Therefore the live HubSpot form must be created using HubSpot's form editor or a future compatible connected workflow.
