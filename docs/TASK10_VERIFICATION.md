# Task 10 verification

Commands run from `<project-root>`:

```powershell
node scripts/tutor-messages.mjs
node node_modules/prettier/bin/prettier.cjs --write src/components/tutors src/lib/tutors src/actions/tutors.ts
node node_modules/eslint/bin/eslint.js . --max-warnings 0
node node_modules/typescript/bin/tsc --noEmit --incremental false
node node_modules/vitest/vitest.mjs run
node --test --test-concurrency=1 tests/database.test.mjs tests/learning-database.test.mjs tests/exams-database.test.mjs tests/preparation-database.test.mjs tests/ai-database.test.mjs tests/guides-database.test.mjs tests/organizations-database.test.mjs tests/tutors-database.test.mjs
node node_modules/next/dist/bin/next build
node scripts/check-tutor-routes.mjs
```

Complete runs passed **132 unit/action/loader tests** and **133 PostgreSQL tests**, including **20 tutor marketplace database tests**. The database suite also covers independent verification updates and atomic submission/public review privacy. All **80 public tables** have Row Level Security enabled. Final production/HTTP/browser evidence follows.

Final local verification on 26 October 2026:

- ESLint completed with zero warnings; all 21 Vitest files / 132 tests passed.
- Production build exited successfully, including TypeScript and generation of 144 entries. The separate strict TypeScript check also passed.
- All 36 tutor HTTP checks passed across English, Japanese, Nepali and Hindi: public pages, unknown-profile handling and signed-out protection of private/admin routes.
- Browser language selection changed the tutor interface through English → Japanese → Nepali → Hindi → English. Selecting JPY enabled the price filters and price sorting.
- Desktop tutor discovery (1440×1000), mobile discovery (390×844), and tablet application-entry page (768×1024) had no horizontal document overflow. Application entry redirected the signed-out browser to the existing login page (`?notice=session`).
- Saved desktop/mobile evidence: `outputs/task10-tutors-desktop.png` and `outputs/task10-tutors-mobile.png`. The production preview was left at `http://localhost:3000/en/tutors`.

The public preview currently reports the undeployed marketplace schema. Authenticated tutor/student/admin forms, populated profile layouts, real meetings and hosted multi-connection scheduling were not browser-verified; follow `TASK10_SETUP.md` for staging activation and acceptance.

Coverage includes private applications, forged approval denial, independent administrative transitions, credentials not copied publicly, free-only booking, currency precision, owner-scoped lesson types/rules, UTC/local slot generation, DST gaps/folds, blocking exceptions, request-key idempotency, overlap rejection, revalidation at confirmation, expiry/cancellation, quotas, private meeting links, author-only notes, mutual completion, eligible/unique moderated reviews, reports/disputes, suspension, retention, four-language parity, stale actions and unavailable-schema empty states.

Contention tests use PGlite transactions on one database scheduler. Hosted multi-connection stress and authenticated real-account browser journeys remain staging acceptance work. SQL fixtures are disposable in-memory records, not marketplace seed profiles or real credential verification. No hosted schema/content/permission changes or paid API calls were made.
