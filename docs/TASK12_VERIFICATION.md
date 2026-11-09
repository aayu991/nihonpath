# Task 12 verification evidence

Verification uses the existing project and disposable local data. No production deployment, hosted migration, live payment, account creation for a real person or external email was performed. Public indexing and all unconfigured integrations remain disabled.

## Commands

```powershell
pnpm add -D lighthouse @axe-core/playwright
node scripts/launch-messages.mjs
node scripts/validate-environment.mjs
node scripts/check-migrations.mjs
node node_modules/eslint/bin/eslint.js . --max-warnings 0
node node_modules/typescript/bin/tsc --noEmit --incremental false
node node_modules/vitest/vitest.mjs run
pnpm test:db
pnpm audit --prod --json
node node_modules/next/dist/bin/next build
node node_modules/next/dist/bin/next start --port 3000
node scripts/check-launch.mjs
node node_modules/@playwright/test/cli.js test
node scripts/measure-performance.mjs
```

The project gained development-only Lighthouse 13.5.0 and axe Playwright 4.14.0. Existing Next.js 16.4.2, React 19.3.1 and application dependencies were preserved. The production dependency advisory scan returned **zero reported vulnerabilities**; this is a registry snapshot, not a proof that no vulnerabilities exist. `pnpm peers check` reports existing ESLint 10 plugin peer-range warnings and OpenTelemetry API 1.10/SDK upper-bound warnings. Lint/build/runtime checks determine observed compatibility; peer maintenance remains a dependency-review item rather than being silently hidden or forcing unrelated upgrades.

## Confirmed local evidence

- Final consolidated unit run: **175 passed across 25 files**, including private SEO-path and malformed operations-credential cases.
- Final complete database run: **162 passed, zero failed or skipped**. The focused launch suite has **13 passed**, including an explicit nonfinancial account-deletion cascade test.
- All **100 public tables** have RLS. The reviewed manifest contains **18 versioned migrations** with matching SHA-256 checksums. No hosted SQL was applied.
- Support tests reject anonymous/forged/direct writes, isolate owners, enforce daily limits, deduplicate retries and restrict stale-safe administrative review. Preferences never grant roles.
- Analytics tests reject identities, transcripts, paths, no-consent payloads and forged verified-conversion events. Fixed server event counts are separate from optional browser counters.
- Email tests perform no network delivery. Disposable SQL tests validate opt-in suppression, bounded claims, stable IDs, leases, stale acknowledgment rejection, accepted/retry logs and exponential backoff. Minimal template rendering is tested in all four languages.
- A complete local PGlite data directory was dumped and restored into a fresh disposable instance; support row counts and RLS/schema readiness matched. This does not verify managed Supabase Auth, Storage, production backup recovery time or credentials.
- A production build compiled, passed Next's TypeScript phase and generated public/private routes. All **74 launch HTTP/security/SEO checks** passed, including locale pages, noindex, empty unapproved sitemap, robots, generated PNG, health/readiness, private redirects and not-found handling.
- Browser functional checks passed for all four language switches, native FAQ keyboard expansion, guest flashcard keyboard flipping and unauthorized billing/operations access.

## Accessibility remediation and final measurements

The initial five responsive axe tests found serious contrast failures in muted homepage notes, step numbers and footer text (examples around 4.2–4.46:1, below the applicable 4.5:1 threshold). The affected gray and green colors were darkened in the existing palette. No functionality or text was removed to improve the score.

Final verification on 2026-10-28:

- Production build: **exit 0**, including Next.js TypeScript validation and route generation. Full lint: **exit 0**, no warnings. Standalone strict TypeScript also passed.
- Launch HTTP/security/SEO: **74 passed** against the rebuilt production preview.
- Final Playwright rerun after all repairs: **8 passed, no skips**, in 1.1 minutes. Home, help, pricing and tutor pages at **360, 390, 768, 1024 and 1440px** passed horizontal-overflow and critical/serious axe checks (20 page/width combinations). All four language switches, FAQ keyboard expansion, guest flashcard keyboard flipping, pre-consent analytics silence and unauthorized-operation rejection passed.
- Mobile and desktop help screenshots were visually inspected: `outputs/task12-help-390.png` and `outputs/task12-help-1440.png`. Per-page raw axe evidence is in `outputs/task12-axe-*.json`.

Lighthouse's first navigation run measured mobile performance 59/100 (LCP 3.72s, TBT 1664ms, CLS 0) and desktop 86/100 (LCP 0.87s, TBT 58ms, CLS 0.257). Both reported accessibility 100, best practices 96 and SEO 66. The SEO score includes the deliberate noindex/restricted robots launch gate; do not enable indexing just to improve it. The desktop shift identified the footer moving when the streamed loading shell was replaced. The loading shell was increased to a full viewport so the footer does not initially occupy the content viewport. Lighthouse also exposed lower-severity label/name mismatches: the brand now uses its visible text as its accessible name, and inactive flashcard faces are visually hidden as well as excluded from the accessibility tree. That visibility change exposed a 4.47:1 flashcard level-label contrast issue in axe; the label was darkened before the final rerun. Final measurements after these repairs follow below. Mobile rendering/main-thread time remains a performance follow-up unless the final measured run establishes otherwise.

Raw local evidence lives under `outputs/task12-*` and the Playwright report. Trace/screenshots use public guest pages only. The tested widths are 360, 390, 768, 1024 and 1440px. Automated axe does not certify WCAG 2.2 AA; authentic populated booking calendars, payment/provider screens, staff workflows and real assistive-technology sessions require staging acceptance.

### Final Lighthouse navigation measurements

The final measurement command exited 0 after sequential mobile and desktop runs against the production build, with the Playwright suite finished first.

| Metric | Mobile (simulated throttling) | Desktop |
|---|---:|---:|
| Performance | 68/100 | 99/100 |
| Accessibility | 100/100 | 100/100 |
| Best practices | 96/100 | 96/100 |
| SEO (indexing deliberately disabled) | 66/100 | 66/100 |
| LCP | 3.71s | 0.85s |
| CLS | 0 | 0 |
| Total blocking time | 916ms | 47ms |

The initial desktop CLS of 0.257 became **0** after the loading-shell repair. Mobile **does not meet** the 2.5s LCP goal and its main-thread blocking remains high. Profile the homepage's layout/style work and client hydration, split nonessential below-fold interactive bundles, and measure again on representative devices and the actual staging host before performance sign-off. A single local laboratory run is not field performance or a guarantee; INP was **not measured** and needs actual interactions/field data. The SEO launch gates remain enabled regardless of the numerical score.

The 96 best-practices score flags browser Issues-panel CSP reports from the documented broader report-only policy. The minimal enforced policy remains active; do not silence reports by weakening it. A tested nonce-based script policy is still a follow-up. The SEO deduction is the explicit blocked-indexing audit.

Reports: `outputs/task12-lighthouse-mobile.report.html`, `outputs/task12-lighthouse-desktop.report.html`, corresponding JSON, and `outputs/task12-performance.log`. Initial JSON reports are preserved as `outputs/task12-lighthouse-*-initial.json` for comparison.

## External acceptance matrix

| Check | Actual status |
|---|---|
| Hosted registration, verification, login/recovery | Pending designated staging users and approved SMTP/auth configuration |
| Learner/tutor/teacher/employer/platform-admin isolation | Disposable RLS regressions pass; independent hosted-account/browser matrix pending |
| Full official-style examinations/listening | Intentionally unavailable; supported reviewed practice tested |
| Live AI provider/budget/usage acceptance | Unconfigured; no paid calls made |
| Real tutor publication/meeting/booking | Hosted migration, genuine review and participant journeys pending |
| Stripe/eSewa/Khalti sandbox transactions | No merchant credentials; adapters/ledger mocked or disposable tests only |
| Email delivered/bounced/unsubscribed behavior | No approved provider/sender; no messages sent; queue/preferences tested locally |
| Real uptime alerts and escalation delivery | Not installed or verified; protected health and fixed-code monitoring foundation provided |
| Custom domain, DNS, HTTPS and Vercel/GitHub deployment | Not connected; no Git repository here and no release approval |
| Search indexing and Search Console | Deliberately disabled pending domain/content/release approval |
| Legal/company/tax/consumer review | Drafts pending owner and qualified review; no company details invented |
| Production managed backup/Auth/Storage restore | Not performed; only a safe disposable local schema/data restore tested |

Public/commercial launch remains **NO-GO** until the critical external gates in `TASK12_LAUNCH_REPORT.md` pass and the owner explicitly approves release. A protected free staging pilot is **CONDITIONAL** on genuine hosted auth, permissions, content and operational acceptance. Local verification alone is not a production-ready claim.
