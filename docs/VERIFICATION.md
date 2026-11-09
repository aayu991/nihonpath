# Task 13 local verification

The existing project now includes a permissioned, revision-based CMS. No hosted migrations or role grants were performed. Read [the implementation/activation guide](TASK13_ADMIN_CMS.md) and [verification evidence](TASK13_VERIFICATION.md). The six 20261028 migrations follow all existing migrations; the initial Super Admin bootstrap is owner-only and requires an existing verified account.

# Verification — platform expansion

Latest tutor-marketplace evidence is recorded in [TASK10_VERIFICATION.md](TASK10_VERIFICATION.md). Organization evidence is in [TASK9_VERIFICATION.md](TASK9_VERIFICATION.md), and Japan Guide evidence is in [TASK8_VERIFICATION.md](TASK8_VERIFICATION.md); earlier sections below describe prior tasks.

## Passed

- ESLint with zero warnings.
- Strict TypeScript (`tsc --noEmit`).
- Production Next.js build: compilation, TypeScript and route generation succeeded; 19 prerendered framework entries and the expected dynamic public/account/admin routes were listed.
- Vitest: 21 tests across scoring/input validation, taxonomy/recommendations/localization and server-action authorization.
- PostgreSQL integration: 22 tests against PGlite, executing all six migrations and actual PostgreSQL roles/RLS/functions.

The SQL tests cover all 33 public tables with RLS; published/hidden content; owner-only profiles/progress/reviews/attempts; idempotent review and quiz saves; server-scored attempts; non-privileged goal selection; admin-only draft writes and review transitions; parent publication; translation visibility; stale-edit rejection; organization isolation; staff report writes; cross-tenant attendance prevention; mismatched module/lesson rejection; private review-audit protection; and no client writes to unconnected AI/booking services.

## Commands executed

The installed package scripts were executed through their Node entrypoints to avoid the environment's package-manager auto-install behavior:

```text
node node_modules/eslint/bin/eslint.js . --max-warnings 0
node node_modules/typescript/bin/tsc --noEmit
node node_modules/vitest/vitest.mjs run
node --test tests/database.test.mjs
node node_modules/next/dist/bin/next build
node node_modules/next/dist/bin/next dev --hostname 127.0.0.1
node node_modules/prettier/bin/prettier.cjs --write ...
```

The first sandboxed build was blocked by native SWC cache permissions. The same build passed with approved native compiler access; no configuration checks were disabled. The final source was then checked by lint, TypeScript, tests and build.

## Route and browser checks

HTTP 200 checks: existing English homepage, all eight new category landing pages, Japanese learning landing, retained N5 vocabulary deck and N4 grammar practice. The initial learning-page response contained no `correctIndex` answer key. Protected-route requests did not expose content-editor forms. A browser navigation to onboarding completed at `/en/login?notice=session` with a visible login form.

Manual browser checks:

- Desktop category navigation opens, and Escape closes it.
- All eight categories are present in the mobile disclosure.
- Expandable module shows its outline and ruby/rt Japanese example.
- Flashcard preview flips and exposes its reading, meaning and example.
- Mock-test radio selection retains its selected state; no correct answer is revealed.
- English-to-Japanese switch changes route, labels, page copy and title metadata.
- Desktop and 390×844 mobile layouts were visually inspected. Screenshots are in `outputs/platform-desktop.png` and `outputs/platform-mobile.png`.

This is focused manual UI verification, not an automated cross-browser accessibility audit. The existing Playwright dependency/script was retained; a full Playwright suite was not run. Authenticated onboarding/editor browser workflows still need staging verification.

## Hosted integration status

The configured Supabase Auth settings endpoint responded with HTTP 200. Existing `courses` and new `learning_programs` REST endpoints both returned HTTP 404 in read-only checks. No hosted migrations, test accounts, admin grants or content were created. Therefore live account onboarding, preference saves and content publication have not been claimed as verified; follow `SUPABASE_SETUP.md` before using those features.

## Deliverable inventory

- Existing-code audit: `docs/AUDIT.md`.
- Updated architecture and relationship diagram: `docs/ARCHITECTURE.md`.
- Three new additive migrations: `202610230001_platform_architecture.sql`, `202610230002_content_workflow.sql`, `202610230003_course_progress.sql`.
- Eight localized discovery sections and expanded shared navigation/footer.
- Authenticated onboarding, editable multi-goal preferences, deterministic recommendations and dashboard navigation.
- Reusable platform components and published program/course/lesson readers, including actual owner-scoped completion tracking.
- Global-admin content studio for six resource kinds, draft/review/approval/publication, edit-conflict checks and private audit events.
- Typed and RLS-protected organization/future-service contracts, without paid provider connections or unsupported product claims.
- Setup and migration-risk documentation, empty environment example and preview screenshots.

## Next step

Apply the documented migrations in staging, configure email confirmation/recovery and appoint an explicitly trusted content reviewer. Verify a complete learner and editorial journey with separate real test accounts, then publish one reviewed program. Add editorial pagination/revisions before scaling the catalog.

## Task 6 verification — 2026-10-24

For the subsequent AI tutor, see [Task 7 verification](TASK7_VERIFICATION.md).

Executed from `<project-root>` using Node directly (pnpm is not required for these installed entry points):

```powershell
node scripts/generate-preparation-content.mjs
node scripts/generate-preparation-seed.mjs
node node_modules/eslint/bin/eslint.js . --max-warnings 0
node node_modules/typescript/bin/tsc --noEmit --incremental false
node node_modules/vitest/vitest.mjs run
node --test tests/database.test.mjs tests/learning-database.test.mjs tests/exams-database.test.mjs tests/preparation-database.test.mjs
node node_modules/next/dist/bin/next build
node scripts/check-preparation-routes.mjs
node scripts/check-learning-routes.mjs
node scripts/check-exam-routes.mjs
```

Results: lint, strict type checking and production build passed; 62 unit tests and 71 database tests passed. The preparation database suite was rerun after the final translation/seed update: all 15 tests passed. The route scripts passed 42 preparation, 37 existing learning and 10 examination checks (89 total). Unknown streamed routes use Next.js's documented not-found marker/noindex response where HTTP status is already 200. Initial quiz route checks exclude answer keys/explanations.

Manual browser checks: completed guest JFT practice scored 2/3 with explanations and an unsaved-result notice; workplace scenario submission scored 1/1; workplace flashcards flipped and recorded an explicitly unsaved guest review. Interview draft/reveal/reset/industry filtering and workplace scenario next navigation worked. Furigana/translation toggles and English→Japanese route switching worked. Desktop 1440px, tablet 768px and mobile 390px layouts had no horizontal overflow. Screenshots: `outputs/task6-jft-desktop.png` and `outputs/task6-ssw-mobile.png`.

This is focused local verification, not a full automated cross-browser accessibility audit. Hosted authenticated learning, administration and actual audio upload/playback remain pending the migration/account checks in [TASK6_SETUP.md](TASK6_SETUP.md). Full JFT simulations and listening question delivery remain unavailable.
# Latest: Task 11 sandbox billing

See [Task 11 verification](TASK11_VERIFICATION.md) for production build, strict types, lint, payment security/regression tests and browser evidence. Real provider sandbox acceptance remains pending merchant credentials. Earlier task evidence below remains historical.

# Latest: Task 12 launch readiness

See [Task 12 evidence](TASK12_VERIFICATION.md) and [launch gates](TASK12_LAUNCH_REPORT.md). Hosted identity/email/payment/deployment/backup acceptance is not established by local tests. No production release or live gateway was activated.
