# Closed pilot moderator setup

2026-11-14: Owner email verified and moderator role provisioned in both family-caregivers and dd-families on the existing community staging project. Public discussion gate remains disabled. Pending memberships have terms_version=pending and accepted_at=NULL; no agreement is recorded on the owner's behalf. The owner must join each community through the displayed guidelines form before discussion access becomes active.

Applied closed_pilot_moderator_access migration. With the gate disabled, only preassigned, nonsuspended moderators can reach their assigned community and account membership listing. All other verified accounts remain blocked. Existing join flow preserves the preassigned role.

Hosted transaction checks: owner can list both memberships; discussion access before joining is denied; an unrelated verified test account cannot enter the closed pilot. Fixture and test transaction rolled back. No production website or other app database changed.
