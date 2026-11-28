# Shared Secure QA — industry Academy acceptance

One runner, five exact pathway configurations; no new infrastructure. This is a development candidate, not a hosted acceptance claim.

## Preconditions

- Master coordination grants exclusive use of the existing Secure QA worker after the Sales 360 pilot and QSR priority acceptance; do not deploy or interrupt either workspace.
- Shared Academy approves the exact integrated preview revision and required database migration/manager compatibility, with billing disabled. Never run against production. Existing QSR preview must not be repurposed independently.
- Staging-only synthetic fixture for each requested pathway, with exactly one approved course per owner, GM and learner; no other membership/course for those users. Outsider has no membership or enrollment. GM is assigned reviewer for the learner. Use existing authorized Auth Admin workflow; do not provision directly in this runner. Publish only under coordinated isolated staging acceptance approval.
- For video acceptance, private reviewed media must already be registered and authorized for the exact modules. Transcript delivery must be independently integrated and verified through Shared Academy before it is marked accepted.
- Store inputs in a temporary mode-0600 file inside the authorized shell. Do not commit or print it, use ordinary chat for passwords, or set persistent credentials. Remove input securely after completion. Retain dedicated synthetic learner writes for rerun only; approved operator cleans up fixtures after acceptance. Never reuse real customer or QSR fixtures.

## Input

The private JSON file contains revision `industry-hosted-v1`, staging `https://dvdvjzqiiekakxzkhora.supabase.co`, preview `https://care-and-stay-qsr-staging.onrender.com`, pathway (senior-care, hospice, home-care, dd-services, hospitality), course_id (see industry-hosted-config.mjs), publishable_key, location_id, location_name (starts with "Synthetic industry QA "), write_fixture:true, and owner/gm/learner/outsider objects with exact user_id, email, password and enrollment_id (null for outsider). Dedicated emails begin industry-qa- and use reserved example domains. All four identities and three enrollments are distinct. Do not use placeholder values to run a hosted test.

## Execution

Use the same pinned Playwright Core/Chromium runtime as Sales 360/QSR. Copy only the exact reviewed runner and configuration into a private operator-approved runtime location (or include them in the coordinated worker image candidate). Do not deploy independently.

    node industry-hosted-acceptance.mjs runner-check

After protected input creation and exclusive approval, set INDUSTRY_PROTECTED_OPERATOR_CONFIRM=true and INDUSTRY_QA_INPUT_FILE to the private file path in that shell:

    node industry-hosted-acceptance.mjs browser
    node industry-hosted-acceptance.mjs browser-media

Run each pathway separately using its own exact fixture. The second mode requires all eight authorized videos and additionally verifies actual playback and outsider media denial; it repeats the browser journey on the same dedicated fixture. No Stripe Checkout or payment activation. No test passes count as signed Stripe, transcript, full-course graduation, account recovery/invitation acceptance or production evidence.

Report only PASS lines and sanitized checkpoint failures; do not share response bodies, passwords, signed links, private content or traces. Browser sessions use local-scope logout and isolated contexts. The runner refuses nonfixture writes, production origins, incorrect identity/course/location, and billing-enabled preview configuration.

## Evidence status

Exact five-course configuration and four fixture contract test groups verified using independent V8 execution with PostgreSQL SHA-256 adapter; native Node/Playwright and real authenticated industry browser runs remain pending. Two lesson configurations corrected against actual staged worksheet rows. Shared worker execution remains gated by Sales 360 protected preflight and master coordination.
