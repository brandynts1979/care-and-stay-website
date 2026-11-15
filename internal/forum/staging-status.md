# Community staging deployment

- Project: `care-and-stay-community-staging`
- Supabase ref: `nyakemltohexpuoygtgh`
- Organization: Care & Stay (`rivyzuzdmknnallxlaof`)
- Region: `us-west-1`
- Cost approved in conversation: $10/month for this project.
- Created: 2026-11-13 UTC (November 12 in Pacific time).
- Schema migration applied: `community_private_discussions`.
- Browser URL and publishable key configured in `community/members/config.json`; enabled remains false.
- Database enabled remains false. Public website has not been updated.

## Verification

Hosted SQL verified all five private tables have RLS enabled. Anonymous users cannot execute the RPC, and anonymous/authenticated roles lack direct message-table read privileges. Transactional fictional-user tests verified the closed gate, own-community read, denial of role escalation, direct-table denial, moderator restrictions, cross-community/direct-ID denial, and suspension/rejoin restrictions. Direct HTTP checks also returned 401 for anonymous RPC access and 406 for a request to the unexposed private schema. All fixtures and temporary enabling were rolled back; final checks showed zero test users/messages and disabled access.

Security advisors reported five INFO notices for RLS enabled without policies, one for each private table. This is intentional default-deny: clients have no table grants; the checked private RPC gateway is the only application access route. No permissive policies should be added just to remove those notices. Reference: https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy

## Remaining before an invited pilot

Set the staging web address and exact Auth redirect URLs, test verification/reset email delivery, create the designated human moderator account, and test complete browser workflows through real Supabase Auth. Finalize the privacy/membership terms, moderation coverage and account deletion process. Keep both access gates closed until these are complete. No invitations have been sent.
