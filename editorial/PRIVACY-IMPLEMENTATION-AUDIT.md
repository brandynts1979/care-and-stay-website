# Care & Stay Privacy Review — Evidence and Remaining Work
Date: November 13, 2026
Status: Initial technical inventory only; not a legal assessment and not authorization to publish.

## Verified from connected systems
- Website and staging use Render services; the website and Journal review exist in GitHub branches.
- Connected Supabase projects: Care & Stay Beta, community staging, caregiver staging, DD caregiver development, individual 360 development.
- Care & Stay Beta includes care recipient, medication, allergy, authorization, financial, document, care-plan, organizational assessment/response, AI report, snapshot lead and Stripe audit/order-related tables.
- Caregiver staging includes care recipients, medications, allergies, care needs, care teams, authorizations, financial records, documents, plans, family members/invitations, notification tables, and a subscription access table.
- DD development includes person profiles, strengths, goals, goal steps, progress notes, invitations, care tasks, documents, support records.
- Individual 360 development includes coaching, rater nominations, drafts and AI processing/review-related tables.
- All public tables returned in the five inspected Supabase project table lists had RLS enabled. This does **not** establish that access rules are correct, that storage policies are correct, or that the security model has been tested.
- Community staging project currently returned no public tables, but that fact alone does not establish whether it stores or processes data through other systems.
- HubSpot has a marketing subscription type called 'Marketing Information'; the Journal-specific form has not been proven active or connected to an approved policy. A contact property was created by the user in its editor, but no production submission testing has been confirmed.

## Matters not yet verified
- Which projects are presently customer-facing, versus test or staged.
- Data retention periods and deletion workflows for each service, backups, and related providers.
- Data transmitted to AI systems, model retention/training terms, any third-party subprocessors, consent and disclosures.
- Any analytics cookies, marketing pixels or cross-site tracking.
- Role permissions, storage access policies, and individual- versus employer-360 anonymity promises.
- How the community forums process identities, posts and moderation records.
- Whether children or dependent data are collected, age restrictions, authorization model, and applicable healthcare privacy obligations.
- Data subject access/correction/deletion procedure; privacy requests inbox ownership.
- Payment provider and transaction data flow by product.
- Business mailing-address requirement for commercial emails and operational postal contact channel.
- Privacy law analysis and professional review.

## Publication hold
Do not promote the privacy page from the editorial branch or add it to the public HubSpot form until the final policy is verified, approved, and deployed. Do not claim that an RLS-enabled table proves security of the entire product.

No customer data values were fetched for this inventory; only metadata/table names and high-level deployment information.
