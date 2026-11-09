# NihonPath launch readiness — 27 October 2026

**Current launch decision: NO-GO for a public authenticated/commercial launch.** Local code, disposable database regressions and browser checks are evidence for the application foundation, not proof of hosted merchant, identity, email or operational readiness. No deployment, live gateway, domain purchase, production migration or external email is authorized or performed by this task.

## Audit of the actual checkout

The existing Next.js 16.4.2 / React 19.3.1 application has English, Japanese, Nepali and Hindi routes, reusable UI, Supabase sessions and independent administrator checks. There are 17 pre-existing versioned migrations, including tutor and sandbox billing ledgers. `<project-root>` is **not a Git repository**: GitHub hosting, branch protection and Vercel account integration cannot be assumed from the project vision. Domain ownership, approved email provider and production owner/company details have not been supplied. The owner previously confirmed no sandbox merchant credentials.

| Module | Classification | Evidence / remaining gate |
|---|---|---|
| Homepage/navigation/localized UI | Complete and tested locally | Existing tests and new launch smoke/a11y checks; native-speaker content review remains |
| Authentication/registration/recovery | Implemented but not verified on hosted accounts; external configuration blocked | Server session validation remains; custom SMTP, redirect allowlist, real learner recovery/MFA/admin journeys need staging acceptance |
| Content, courses and flashcards | Implemented with tested local foundations | Available published content and explicit demos; no claim of complete N5–N1 curriculum; content review and populated hosted acceptance required |
| Examinations | Incomplete product, tested supported engine | Server-controlled reviewed practice grading; full multi-section mocks/listening remain intentionally unavailable |
| JFT/SSW/workplace | Implemented but curated content incomplete | Local RPC/content tests; sector completeness and qualified review remain |
| Live AI tutoring | Blocked by external configuration | Demo/usage/auth boundaries tested; no paid model calls, operational budget approval or live acceptance performed |
| Japan Life / immigration guidance | Implemented foundation; publication review required | Draft guidance is hidden in production builds; published source/reviewer/locality freshness needs human verification; no eligibility judgments |
| Tutor marketplace | Implemented but hosted journeys not verified | Local booking/RLS/DST tests; real approved tutors, availability, participants and meeting acceptance required |
| Organization management | Implemented, tested locally | Tenant/role/RLS regressions; real teacher/employer/admin cross-account staging journeys required |
| Payments | External configuration blocked; live mode not implemented | Test-only provider adapters and ledger tests; no genuine Stripe/eSewa/Khalti success, refund, renewal, settlement or KYC acceptance |
| Deployment/GitHub/HTTPS | Configuration prepared; external setup not implemented | No repository or connected domain/project; auto Git deployments disabled; protected preview and owner-approved production rollout required |
| SEO | Implemented; indexing deliberately disabled | Localized metadata/canonicals, conservative hreflang, generated social image, sitemap/robots, structured data; publication approval and Search Console verification pending |
| Email notifications | Implemented queue/templates/adapter; provider blocked | Fixed-content EN/JA/NE/HI templates, scoped outbox, leases/retries/preferences; no approved sender/provider/domain or delivered-message evidence |
| Analytics/monitoring | Implemented local foundation; collection/alerts not activated | First-party aggregate counters, consent controls, fixed-code logs, protected readiness and admin reports; actual uptime/alert routing and retention jobs need operations setup |
| Support | Implemented; hosted migration/accounts pending | Validated private signed-in requests, honeypot, daily quota and admin status review; no external support mailbox/SLA or reply system invented |
| Legal | Incomplete pending approval | Seven review-ready drafts, no fake company identity; jurisdictional/consumer/privacy/tax review and actual commercial disclosure are launch blockers |

## Changes made

- `src/lib/launch/`, `src/instrumentation.ts`, health and protected operations APIs: environment validation, approval gates, readiness, sanitized monitoring and support/notification contracts.
- `src/lib/seo/`, metadata exports on existing routes, robots/sitemap and `social-card.png`: localized distinct public metadata, canonical URLs and genuine translation allowlists. Account/admin/billing/booking and unknown pages default to noindex. Query variants receive noindex headers. Root locale selection no longer uses guessed country or browser locale; explicit locale navigation remains available.
- `supabase/migrations/202610270001_launch_operations.sql`: additive 18th migration; seven RLS tables (100 exposed public tables total), narrow RPCs, support isolation, aggregate events and transactional outbox. Historical migrations are preserved. No hosted SQL was applied.
- `/help`, `/help/faq`, `/contact`, `/legal/*`, `/dashboard/notifications`, `/admin/operations`: responsive four-language help, private support and real-data operational views. Unavailable integration states are explicit.
- `src/lib/email/` and `supabase/templates/{en,ja,ne,hi}`: escaped minimal templates and a gated Resend transport. Authentication confirmation/recovery remains owned by Supabase Auth; template files are prepared but not installed remotely. Optional enrollment/assignment/renewal messages respect stored preferences. Booking/payment events are essential account notifications. Organization invitation templates exist, but automatic mail to unregistered invitees is **not wired**: the existing secure invitation-link workflow is preserved.
- `vercel.json`, `.github/workflows/ci.yml`, migration manifest/check, launch HTTP/browser tests and audit tools: verification without deployments, real users, external payments or destructive SQL.

## Security and privacy boundaries

Support is signed-in only, owner scoped and limited to five new requests/day. Retried UUIDs deduplicate; conflicting retries fail. Only an independent platform administrator can review status with an expected version. Organization goals do not grant administration.

Client analytics is optional, first-party and off by default; DNT/GPC overrides opt-in. The collector rejects identities, raw paths, URL queries, arbitrary event names and transcripts. It stores date/event/locale/source counts and Web Vitals **buckets**, not IPs, user IDs, browsing histories, payment values or conversations. Client counts are untrusted indicative counts, not unique visitors or financial truth. Verified purchase counts come from trusted transaction insert events; server operational counts are separate from optional browser analytics. The in-process request cap is not a distributed firewall; configure edge rate limits before exposing collection at scale. Hosting/platform access logs are separate and need their own privacy/retention review.

New queue and monitoring writes are restricted to trusted service operations; users cannot submit forged payment conversions or arbitrary email jobs. The email worker requires a random >=32-character server secret, explicit provider approval, HTTPS sender origin and configured credentials. Retries retain the same idempotency key, are capped at five attempts and stop within 23 hours to stay within the provider's documented 24-hour key window. `accepted` means the provider accepted the request, **not delivered**. A stale worker lease cannot acknowledge another worker's claim. No scheduler, bounce webhook or delivery-alert destination was installed.

Enforced headers disable framing, MIME sniffing, object embedding and hostile base URLs. A fuller CSP is report-only to avoid breaking existing Next.js hydration/media; it has no external reporting collector. A nonce-based script policy remains a follow-up before allowing arbitrary third-party scripts. Auth failures, payment verification failures and request/API failures emit only fixed event codes. Existing Supabase storage review/role policies remain; actual hosted bucket exposure and project auth settings must be inspected in staging. Financial/support/notification retention and account-deletion dependencies require a reviewed policy; no automatic deletion of existing records occurs.

## SEO and content limits

`LAUNCH_INDEXING_APPROVED` never indexes preview/test/local deployments. Approved production also requires a valid HTTPS custom origin, auth configuration and explicit release approval. Without these, robots disallows crawling and sitemap is empty; this is intentional and can lower Lighthouse SEO scoring. Robots is not authorization: private routes independently verify identities.

Metadata exists in all four interface languages, but hreflang/sitemap advertise only the primary-content translations declared for that route. EN/JA are used conservatively for course/learning content; NE/HI interfaces with English lesson fallback are not advertised as translated course bodies. Published guide articles use only actual published translations. Upcoming kanji/business and legal drafts are noindex. No official exam affiliation, fake rating, company address or fabricated course completion claim is emitted in structured data.

## Performance and accessibility

Existing system fonts avoid external font requests. Public page bodies remain Server Components, with interactivity confined to client controls. Existing image components retain dimensions and safe unoptimized external tutor images; a reviewed media origin/storage pipeline is needed before proxying arbitrary user images through an optimizer. Current large catalogs/history endpoints remain bounded where already implemented, but some catalog RPCs return full snapshots: add indexed server pagination before high-volume operation.

Lighthouse and axe/Playwright tooling is development-only. Actual measurements and any repairs are recorded in `TASK12_VERIFICATION.md`. LCP <=2.5s, INP <=200ms and CLS <=0.1 are goals, not guaranteed measurements. Navigation Lighthouse cannot establish field INP. The consented collector can collect real interaction performance buckets when enabled, but no production field population is available. Automated accessibility checks do not certify WCAG 2.2 AA; keyboard/screen-reader and authenticated populated forms remain manual acceptance gates.

Final local evidence: lint, TypeScript and production build pass; 175 unit tests, 162 disposable database tests, 74 HTTP/security/SEO checks and all 8 browser tests pass. Five widths across four public pages have no critical/serious axe violations or horizontal overflow. Final Lighthouse performance is desktop 99/mobile 68, with CLS 0 in both modes. Mobile LCP 3.71s and TBT 916ms remain unresolved performance work before public-launch sign-off; desktop LCP is 0.85s. Indexing is intentionally disabled, and no field INP claim is made.

## Prioritized launch sequence

1. **NO-GO / P0:** owner provides operating identity, domain, repository/Vercel ownership and approved email provider. Review legal/commercial drafts. No real payments are needed for a limited free pilot, but payment controls must stay disabled.
2. **NO-GO / P0:** staging backup/restore, missing migrations in order, auth SMTP/redirect configuration, independently provisioned admin accounts, storage exposure checks and real cross-role sessions. Run the hosted learner/tutor/teacher/employer/admin acceptance matrix.
3. **CONDITIONAL:** protected staging/free pilot after core hosted auth, content and support pass; keep live AI, paid access, unverified tutor publication and incomplete exams disabled. Verify HTTPS, rollback, external uptime alerts and incident ownership.
4. **NO-GO for paid launch:** obtain sandbox merchant accounts and perform provider success/failure/duplicate/delayed/refund/renewal/reconciliation acceptance, tax/consumer review and explicit separate owner authorization. This task does not implement or activate live payment mode.
5. **GO only after evidence and approval:** approve final content/translations, performance and accessibility results, backups, privacy/retention and support operation; then explicitly approve production release and indexing. Set release flags only after human approval, never as a shortcut to bypass gates.

See `TASK12_OPERATIONS.md` for deployment/rollback/incident steps and `TASK12_VERIFICATION.md` for measured evidence and outstanding errors.
