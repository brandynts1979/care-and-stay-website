# Stay Culture Journal — Newsletter and HubSpot plan

Current state: PLAN ONLY. No subscription form, CRM mutation, email draft, campaign, workflow, or marketing send was created.

## Current verified account information
- The connected HubSpot account responds to read-only queries but reports onboarding incomplete.
- Available subscription types include a broad "Marketing Information" type, rather than a confirmed Journal-specific type.
- Do not assume readers have consented to the Journal solely because they are already CRM contacts.

## Proposed opt-in
- Public journal may feature a "Subscribe to Journal" form after implementation and owner approval.
- Fields: email (required); first name (optional); optional interests: Healthcare & Senior Living, QSR & Franchising, Leadership & Culture, Research & Insights.
- A clear, unchecked opt-in statement explaining twice-monthly features plus occasional shorter insights, links to privacy policy, and unsubscribe choice.
- Use HubSpot forms/list or another approved provider, with permission-based subscriptions, confirmation handling and duplicate management. Do not invent or manually hard-code endpoint URLs or capture emails into unaudited browser storage.
- Investigate whether a dedicated Journal subscription type is permitted after HubSpot account onboarding; do not automatically reuse general Marketing Information without user decision.
- No subscriber import from existing lead-generation lists without valid newsletter consent.

## Proposed workflow (not yet activated)
Draft article -> owner approves -> production QA -> owner authorizes deployment -> public article available -> optional newsletter draft -> owner approves email + recipients -> send.
Newsletter should segment interests and include unsubscribe and sender identification. No automated sends until expressly authorized.

## Remaining dependencies
1. Confirm and complete HubSpot onboarding.
2. Verify approved contact properties, subscription types and form handling.
3. Validate consent/privacy policy and email compliance.
4. Create a staging-only subscription form; test with fictional or controlled test data.
5. Owner approval before activation or any emails.
