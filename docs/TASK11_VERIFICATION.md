# Task 11 verification

Verified locally using the existing project. The owner confirmed there are no sandbox merchant credentials. All external payment, merchant onboarding/KYC, hosted migration and real-account provider acceptance tests remain pending. Mocks do not establish merchant eligibility or successful settlement.

Commands:

```powershell
node scripts/billing-messages.mjs
node node_modules/prettier/bin/prettier.cjs --write src/lib/billing src/components/billing src/app/api/billing tests/billing*.ts tests/billing-database.test.mjs
node node_modules/eslint/bin/eslint.js . --max-warnings 0
node node_modules/typescript/bin/tsc --noEmit --incremental false
node node_modules/vitest/vitest.mjs run
node --test --test-concurrency=1 tests/database.test.mjs tests/learning-database.test.mjs tests/exams-database.test.mjs tests/preparation-database.test.mjs tests/ai-database.test.mjs tests/guides-database.test.mjs tests/organizations-database.test.mjs tests/tutors-database.test.mjs tests/billing-database.test.mjs
node node_modules/next/dist/bin/next build
node node_modules/next/dist/bin/next start --port 3000
node scripts/check-billing-routes.mjs
node scripts/check-tutor-routes.mjs
```

Final local verification on 26 October 2026:

- Production build passed, including TypeScript and generation of all 167 entries. Standalone strict TypeScript also passed.
- ESLint passed with zero warnings. All **163 unit/API tests across 24 files** passed, including **31 billing cases** and the existing 132 tests. The final billing PostgreSQL run also passed all 16 cases after receipt-lock hardening. Webhook cases cover signed backend rechecks, invalid signatures, subscription deletion without a refund, and a refund arriving before subscription activation is saved.
- The full PostgreSQL regression passed **149 tests**, including **16 billing tests**. All **93 public tables** have RLS enabled. `outputs/task11-database-tests.log` contains the consolidated run.
- All **23 billing HTTP checks** passed (four-language public pages, protected account/admin redirects, unauthenticated checkout/manage rejection and disabled webhook response). All **36 tutor HTTP checks** also passed unchanged.
- Actual browser selection of NP/NPR/30-day pass displayed manual renewal wording and no invented available gateway. EN → JA → NE → HI → EN changed the billing interface. Signed-out billing redirected to `/en/login?notice=session`.
- Pricing had no horizontal document overflow at desktop 1440×1000, tablet 768×1024 and mobile 390×844. Saved screenshots: `outputs/task11-pricing-desktop.png`, `outputs/task11-pricing-mobile.png`. The preview remains running at `http://localhost:3000/en/pricing`.
- Compiled client assets contained none of the server secret variable names (`STRIPE_SECRET_KEY`, `ESEWA_TEST_SECRET`, `KHALTI_SANDBOX_SECRET`, `SUPABASE_SECRET_KEY`).

The preview has no configured gateway/price, matching the owner's lack of merchant credentials. Authenticated populated checkout/account/admin layouts, provider infrastructure callbacks, actual sandbox payments, refunds, renewals and settlement statements remain unverified externally. No hosted schema/record/permission changes or live financial operations were made.

Database coverage: all 93 public tables have RLS; owner-only orders/access; blocked direct writes and trusted RPC calls; verified price snapshots; duplicate requests/events; no pending/failed access; single pass activation; stacked renewal; reversal and stale proof denial; exact subscription periods; expiration by database time; premium child reads and legacy RPC authorization; independent admin reports; missing-proof denial; callback verification limits; cancellation separate from refunds; premium exam/AI denial. PGlite uses disposable fixtures and one database scheduler, not hosted multi-connection concurrency.

Provider tests: exact minor units and large aggregate formatting, no forged client amounts, test-only/live-key guard, country/currency gateway restrictions, eSewa initiation/callback HMAC plus independent backend check, amount mismatch denial, Khalti initiation/lookup/cancelled/expired/refunded statuses, forged return/offsite redirect rejection, Stripe raw signature/replay checks, Stripe subscription creation and failed renewal denial, timeouts and translation parity. API tests reject unauthenticated, cross-origin, forged, unconfigured and cross-owner operations. Provider responses are mocked; no external charge occurs.

See `TASK11_SETUP.md` for real sandbox and live-launch acceptance requirements. No sandbox success, refund, renewal or settlement has been falsely marked as externally verified.
