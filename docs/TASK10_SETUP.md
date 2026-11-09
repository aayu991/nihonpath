# Task 10 deployment and verification

1. Back up the database and inspect the applied migration history. Task 10 is the sixteenth migration, `supabase/migrations/202610250003_tutor_marketplace.sql`, after Task 9. Apply only missing versions in order on staging. A publishable key cannot execute schema migration SQL.
2. The migration is transactional and preserves existing bookings. Review the `requested` → `pending` status mapping with any existing integration. New requests require a published approved profile, lesson type and genuine availability. Legacy rows retain their schedules and nullable price/type fields; plan an explicit mapping before attempting confirmations. Do not invent prices or eligibility for old rows.
3. No new paid service, service-role key or demonstration seed is required. Keep existing `.env.local` secrets out of source control. Use the existing Supabase authentication configuration and a genuinely authorized account in `private.admin_users` for review. Organization owners/teachers and profile metadata are not platform-admin grants.
4. Sign in as an ordinary user, visit `/en/tutor/application`, save or submit real teaching information, and review the application using a separate authorized administrator at `/en/admin/tutors`. Move submitted → under review → approved. Credential badges require actual evidence review and reviewer attestation; do not use test review notes to claim real verification.
5. In `/en/tutor/availability`, publish the approved profile, create a free published lesson type, configure IANA timezone/notice/horizon and weekly windows. Add UTC date-specific availability or blocked holidays as needed. Real photos/video links should be approved and public-facing; no document upload is provided.
6. Use `/en/tutors` and `/en/tutors/[slug]/book` as a separate learner. Select the lesson type/duration, learner timezone and date; fetch server availability, choose a slot and request the free lesson. Check `/en/dashboard/lessons` and the tutor workspace for the pending record. Paid types remain unbookable regardless of the client.
7. Confirm as the tutor. Attach an actual approved-provider meeting link if desired. Verify participant access and exclusion of another learner, organization staff and a marketplace administrator. Personal notes must be readable only by their author.

## Local commands

The direct Node entrypoints work without a global pnpm installation:

```powershell
cd <project-root>
node node_modules/next/dist/bin/next dev
# Open http://localhost:3000/en/tutors
```

For a production preview, stop development first and run:

```powershell
node node_modules/next/dist/bin/next build
node node_modules/next/dist/bin/next start --port 3000
```

Do not restart development while a production type check is running; the prior task demonstrated generated-type races. The environment's restricted sandbox may block native SWC cache access or localhost networking; normal local execution was used for these checks, without weakening application security.

## Staging acceptance

- Use real learner A, learner B, tutor, unauthorized organization manager and independent platform administrator accounts. Cross-user/organization reads, actions and forged profile role/price inputs must fail.
- Submit/review/approve a real application. Verify private credentials stay out of public API responses. Change/revoke a badge independently, edit the application to withdraw publication, and test suspended-account restrictions.
- Test weekly and one-off availability, blocks, minimum notice, horizon, invalid and daylight-saving zones. Use both an American/European DST zone and Asia/Tokyo or Asia/Kathmandu. Repeated hours must have distinct offsets; nonexistent local times must not appear. Verify the seven-day window across a DST boundary.
- With two independently authenticated HTTP connections, request the exact same and overlapping slots concurrently. Exactly one must reserve the shared interval. Also try overlapping bookings for the same student with different tutors. Repeat an identical request key and a changed payload. Verify expiry and cancellation release availability and do not erase rate limits.
- Modify availability after a request; confirmation must reject a newly blocked slot. Test stale edits and cancelled/expired requests. Confirmed learner cancellations remain requests until the tutor accepts; observe the actual status in both dashboards.
- After the real lesson end, confirm completion as both parties. Only that learner can submit one review. Check pending moderation, publication, tutor-response re-review, reporting and hidden reviews disappearing from ratings. Test no-show/dispute/suspension history.
- Verify meeting links and author-only notes never appear in public catalogs or the admin workspace. A captured external link cannot be revoked by merely hiding it on NihonPath; manage external room access with the provider.
- Review and run the retention procedure deliberately. Schedule `tutor_purge_private()` with appropriately privileged server-side administration if automatic cleanup is wanted; no scheduler was installed. Inspect earlier modules before any full account deletion.
- Check public and authenticated forms at desktop/tablet/mobile widths, keyboard focus, readable Japanese/Nepali/Hindi, all four language switches, failure/input retention and loading states.

## Migration and operational risks

Indexes, new foreign keys and the status update can require locks. Review and test migration duration on realistic staging data. All writes remain behind scoped RPCs; custom legacy writers must be updated. Preserve data/audit history during rollback; do not drop new tables as a shortcut. Existing learning, examinations, AI, guide and organization tables are not replaced.

No hosted migration or real account/content write was performed by the agent. No payments, payouts, email delivery, provider room provisioning or document storage was activated. Public snapshots and private histories should gain server-side pagination before high-volume launch.

Primary references consulted: [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [PostgreSQL locking](https://www.postgresql.org/docs/current/explicit-locking.html), [PostgreSQL time zones](https://www.postgresql.org/docs/current/functions-datetime.html), and the installed Next.js Server/Client Component and mutation guides under `node_modules/next/dist/docs/`.
