-- OWNER-ONLY TEMPLATE. Do not execute before approving/applying the six Task 13
-- migrations and independently checking the existing user's identity in Auth.
-- Replace the placeholder with an existing, genuinely email-verified UUID.
-- Do not edit email_confirmed_at or create a hardcoded password to bypass checks.
begin;
select private.cms_bootstrap('YOUR_EXISTING_VERIFIED_USER_UUID'::uuid);
commit;
