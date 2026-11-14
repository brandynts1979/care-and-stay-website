# Care & Stay DD Family Care — privacy and safety release plan
**Status: INTERNAL REVIEW DRAFT — NOT A PRIVACY POLICY, LEGAL APPROVAL OR CUSTOMER LAUNCH AUTHORIZATION.**
**Environment: development only. Use fictional data.**

## Data flows and current boundaries
- Site: Render Static Site, DD development service. Identity: Supabase Auth. Database: isolated DD tables with owner-based row-level security. Documents: private `dd-private-documents` Storage bucket. Browser temporarily holds access/refresh tokens in sessionStorage.
- Owner-only `dd_support_records` provides initial Health, Education, Benefits and Transition notes; no sharing to invited supporters. `dd_documents` remains owner-only.
- App has no completed AI Family Care Coach. Never send DD records to third-party model APIs without privacy review, data minimization, appropriate contracts and user disclosures.
- App presently allows test sign-up and is not approved for real health, disability, school, child, financial or legal records. Keep the prominent warning and development URL until launch review.

## Security requirements for customer release
1. Enable leaked-password protection in Supabase Auth when supported; security advisor currently flags this as disabled. Verify email confirmation, full password recovery, session expiration, and rate limiting with independent test identities.
2. Verify actual authenticated Storage POST/GET/DELETE with synthetic data and cross-account denial. Owner test passed Nov 13, 2026; unrelated-account denial at the Storage REST API layer remains to be tested (SQL RLS negative tests passed).
3. Implement server-side file content validation, malware screening or a documented approved compensating control; enforce size/type server-side and scan uploaded files before sharing or processing. Client-side signature checks alone are insufficient.
4. Implement resilient error tracking and audit signals for sign-in failures, access denial, failed file removal, and billing entitlement changes without logging personal content or credentials.
5. Confirm backup, restore and disaster recovery for Supabase, Storage and Render, and complete a restore rehearsal. Consider transaction-level backup availability on actual Supabase plan.
6. Create data deletion and portability flows. Ensure removal of stored objects, metadata and account-linked records together; account and profile deletion must not orphan private files. Verify preservation of legally required records where applicable.
7. Restrict production access to paid/authorized customers based on server-verified Stripe entitlements, not a JavaScript toggle.
8. Complete accessibility review: keyboard navigation throughout modules, screen-reader labels, real mobile devices, focus/error management, and WCAG review.
9. Complete threat model, independent security review and a documented incident-response process (detection, containment, notification decision, recovery).

## Privacy and consent decisions requiring owner + counsel review
- Establish the legal entity/controller, privacy contact and service providers/subprocessors; ensure vendor terms and appropriate agreements are signed.
- Determine whether and when HIPAA, state health privacy rules, education records, children's privacy, consumer privacy and other legal regimes apply to the business model and the information collected. Do not assume that a consumer app is automatically HIPAA-covered or HIPAA-exempt.
- Define who may open/manage a family member's profile, guardianship/capacity and consent assertions, supported-decision permissions, correction and revocation of access; verify authority in product policy and operations.
- Publish accurate privacy policy, terms, accessibility support, age eligibility and user disclosures; obtain explicit approval before launch.
- Specify minimum data collected, optional fields, data retention periods by category, account closure/deletion timelines, backup retention and breach response policy. Do not invent retention promises until tooling supports them.
- Decide whether user-submitted documents and records may be processed by AI or analytics. Default to no third-party sharing for AI until a reviewed consent mechanism and appropriate contractual/security controls exist.

## Clinical/education safety
- Clearly state that notes and AI guidance (if later implemented) are not a diagnosis, medication prescription, clinical decision tool, emergency response, or official IEP/benefits determination.
- Do not infer diagnoses, medication dosage, eligibility or guardianship from sparse family records. Encourage confirmation with clinicians, educators, benefits offices and qualified advisers.
- Crisis and emergency interactions should direct to appropriate immediate help instead of generating autonomous care instructions.

## Release approval evidence
Product owner sign-off on scope, price and UX; independent legal/privacy review; security review and backup restore; live authenticated two-account tests; accessibility and actual mobile review; tax registration and Stripe checkout + webhook + entitlement tests; support and incident-response ownership; final production deployment smoke checks.

**No-go until all release blockers are explicitly closed with dated evidence.**
