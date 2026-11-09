# Staging, release and operations runbook

## Development / preview / production

Use Node 24 and the pinned package manager from `package.json`. Install with `pnpm install --frozen-lockfile`; direct Node entrypoints remain available when pnpm is not on a user's shell PATH. Run `check:env`, `check:migrations`, lint, typecheck, unit tests, disposable database tests and production build. `test:launch` checks an already running local production server; `test:e2e` launches/reuses a local server and never logs into real accounts or sends mail.

This directory currently has no `.git`. Create/import the repository only under the owner's chosen account, review all staged files (especially no `.env.local`, exports or private logs), and configure protected branches/required CI checks. The prepared GitHub Actions workflow uses read-only permissions, no persisted checkout credentials, no production secrets, frozen dependencies and no database/deployment step. Actual GitHub execution and required-review rules have not been verified. Require explicit human approval for production database changes and releases using repository/environment protection rules.

`vercel.json` intentionally sets `git.deploymentEnabled=false`. No project was created, imported or deployed. Once the owner approves a staging project, configure **Preview** variables separately: a staging Supabase project, HTTPS preview origin, `APP_ENV=preview`, disabled email/AI/billing and no release/indexing flags. Vercel's `VERCEL_ENV` takes precedence. Enable protected preview deployments only after checking the project's deployment protection scope; do not assume noindex hides a public preview. Provider availability and billing country remain separate from interface language and timezone.

For production, configure the actual custom HTTPS domain and approved production Supabase settings. `LAUNCH_RELEASE_APPROVED=true` is permitted only after explicit release approval and passed gates. `LAUNCH_INDEXING_APPROVED=true` is a separate content/SEO decision. Never put a production secret in preview or PR workflows. Live billing remains unsupported: `BILLING_MODE` can only be `disabled` or `test`.

## Domain and HTTPS

Owner chooses/verifies the domain in the hosting project; follow the **actual** DNS records shown by Vercel, not invented addresses. Confirm DNS ownership, certificate validity, HTTPS redirect, canonical hostname, root-to-`/en` behavior and all locale paths. Update Supabase Site URL and exact allowed auth redirect origins for preview/production; avoid broad wildcard callbacks. Exercise registration, verification, recovery and session expiry with designated staging users. HTTPS/certificates/DNS were not verified without a real domain. HSTS is emitted on Vercel production; do not add preload/includeSubDomains without reviewing all subdomains.

## Database migration and backup gate

The migration manifest fingerprints all 18 SQL versions. CI verifies checksums and applies SQL only to disposable PGlite instances. It never applies migrations to hosted Supabase. Before hosted changes:

1. Record current migration versions, schema, provider settings and release revision. Confirm a recent managed backup and its restore procedure under the actual Supabase plan.
2. Take an encrypted logical backup using an approved PostgreSQL client and credentials from a secret store. Include required roles/schema/data; record Storage object backup separately. Do not paste credentials/connection strings into chat, command logs or source control.
3. Restore **into a separate empty staging project** using its own URL/key. Verify table/row counts, FK constraints, auth identities, all RLS/grants, answer-key isolation, organization membership, billing ledger and service role boundaries. Never point a restore command at the current production project.
4. Apply only missing migrations in order, inside their documented transaction plans. The launch migration adds outbox triggers: load-test enrollment/booking/billing write paths and inspect queue growth. Do not drop tables or remove historical migrations to resolve an error.
5. Record restore time and recovery point, run all role tests, compare aggregate integrity and sign off the migration. The local full-schema PGlite dump/restore test is **not** a test of managed Supabase Auth/Storage backups, network access, production credentials or recovery objectives.

## Email operation

No provider/sender is approved yet. Leave `EMAIL_DELIVERY_ENABLED=false`. Prepared Supabase Auth templates are in `supabase/templates/<locale>/`; install them only through a reviewed configuration change. Supabase Auth owns confirmation/recovery links. Locale-specific auth delivery requires a reviewed provider/hook configuration; the existence of files does not configure it remotely.

If the owner approves Resend, verify a sending domain, SPF/DKIM/DMARC, sender identity, provider data processing/retention and budget. Set server-only sender/API key and approval flags, HTTPS origin and random `OPERATIONS_SECRET`. Test to designated **test inboxes only** before delivery to users. Do not add unregistered invite emails to arbitrary jobs or bypass the existing secure invitation-token workflow.

The protected POST `/api/operations/email` processes up to ten leased jobs, first enqueuing eligible manual renewal/expiry reminders. It is not scheduled by this task. Use an approved external scheduler with the bearer secret after staging acceptance; do not expose that secret as a query parameter. Monitor queued/failed/suppressed/accepted states in `/admin/operations`. Add verified provider delivery/bounce webhooks and alerts before claiming delivered messages. Optional learning/renewal mail is opt-in at `/dashboard/notifications`; security/account/booking/payment service notices are separate. In-app renewal reminders remain available without email.

## Analytics, monitoring and uptime

Enable browser analytics only after approving privacy language and the first-party collection policy. The browser obeys consent, DNT/GPC and never sends account IDs, raw paths or transcripts. Configure platform rate limits for `/api/analytics`; local in-process limits are not distributed abuse protection. Review platform logs separately for IPs/URLs and configure retention/access restrictions.

`/api/health` is public no-cache liveness and configuration status, not a hosted dependency probe. `/api/health/ready` requires the server bearer secret and checks the launch schema/RLS via a narrowly granted RPC. Set up a real external uptime service with alert recipients and a documented escalation route; no monitor or paid service was activated. No fake dashboard uptime or alert delivery is displayed.

`OPERATIONS_ENABLED=true` enables database aggregate monitoring of fixed failure codes. The dashboard summarizes API/page/auth/database/payment/email failures and real counters. It never stores exception messages, payloads, secrets or private conversations. Provider/API return errors outside these hooks may need additional dedicated integration monitoring. Alerts are not delivered until a real provider/channel and recipient are approved. Review mail queue failures, payment attempts/retries and signed webhook failures daily during a pilot.

Set a reviewed retention period for support, notifications, analytics and operations. No destructive retention job is installed here. Export/reconcile financial data under its separate policy. Test any cleanup against a copy before scheduling it.

## Incident response and rollback

1. Identify the affected feature and owner. Disable new checkout, live AI, collection or email worker through server-side flags as appropriate. Keep payment verification/reconciliation working when safely possible; do not erase evidence.
2. Preserve sanitized event counts, release revision and provider event IDs through authorized access. Never copy secrets, full payment payloads or private transcripts into issue trackers.
3. For credential exposure, rotate through the provider's approved process and revoke compromised sessions/keys. For data isolation issues, stop the affected reads/writes and investigate cross-tenant exposure with the security owner.
4. Roll the application back to the last verified deployment using the hosting dashboard after explicit owner authorization. Verify compatibility with already-applied additive database migrations. Do not automatically roll back financial data or drop new tables/functions.
5. A database restore is a separate high-impact operation requiring explicit authorization, a recovery-point decision, isolated validation and communications. Reconcile provider payments received since that recovery point before reopening paid access.
6. Run health, authorization, lesson/exam, booking and billing smoke checks. Restore features gradually, document cause/impact and obtain sign-off before reopening or indexing.

## Official references

- [Vercel Git deployment configuration](https://vercel.com/docs/project-configuration/git-configuration) and [deployment protection](https://vercel.com/docs/deployment-protection).
- [GitHub deployment environment protection](https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments).
- [Supabase production checklist](https://supabase.com/docs/guides/deployment/going-into-prod), [custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp) and the actual project's backup documentation/plan.
- [Web Vitals lab and field limitations](https://web.dev/articles/vitals) and [Resend idempotency](https://resend.com/docs/dashboard/emails/idempotency-keys).
