# Task 9 verification

Commands from `<project-root>` (direct Node entrypoints avoid a globally installed pnpm dependency):

```powershell
node scripts/organization-messages.mjs
node node_modules/prettier/bin/prettier.cjs --write src/components/organizations src/lib/organizations src/actions/organizations.ts
node node_modules/eslint/bin/eslint.js . --max-warnings 0
node node_modules/typescript/bin/tsc --noEmit --incremental false
node node_modules/vitest/vitest.mjs run
node --test --test-concurrency=1 tests/database.test.mjs tests/learning-database.test.mjs tests/exams-database.test.mjs tests/preparation-database.test.mjs tests/ai-database.test.mjs tests/guides-database.test.mjs tests/organizations-database.test.mjs
node node_modules/next/dist/bin/next build
```

Final results:

- **113 unit/action tests passed** across eighteen files, including thirteen organization-specific unit/action cases.
- **113 PostgreSQL tests passed** across all seven suites, including sixteen organization cases. All 68 public tables have RLS enabled.
- **ESLint passed with zero warnings.**
- **Standalone strict TypeScript passed.**
- **Production build passed**, including compilation, TypeScript and 116 prerendered framework entries across four locales; expected dynamic organization routes were listed.
- **48 production HTTP checks passed** for public localized organization pages and signed-out management/registration redirects, using `node scripts/check-organization-routes.mjs` against localhost.

The production preview was started with `node node_modules/next/dist/bin/next start --port 3000`. SWC cache access and localhost checks required normal local execution outside the restricted sandbox. No application security settings were weakened. Development was stopped during production type generation to avoid the prior task's generated-file race.

Browser checks succeeded on the public organization page at desktop (1440 × 1000) and mobile (390 × 844) widths, with no horizontal overflow. The actual language switcher navigated English → Japanese → Nepali → Hindi and rendered translated organization content. Signed-out invitation onboarding retained the token field and an unchecked optional sharing checkbox, with a separate sign-in link. Screenshots: [desktop](../outputs/task9-organizations-desktop.png) and [Japanese mobile](../outputs/task9-organizations-mobile-ja.png). Authenticated management layouts, hosted registration/acceptance and private saves still require staging acceptance after migration.

Coverage includes timezone handling across month/year boundaries, verified registration, two-tenant isolation, privately granted platform administration, anonymous denial, invitation hashing/expiry/wrong email/replay, self-promotion denial, teacher class scoping, manager read-only permissions, active enrollment checks, attendance uniqueness/stale editing/auditing, assignment target validation, consent revocation, actual lesson/quiz summary derivation, exclusion of unrelated learning, in-app reminders, deactivation, localization, CSV safety and server-action validation.

Earlier prototype tests expected direct staff writes. Task 9 intentionally denies these writes and uses scoped RPCs; those tests were updated to assert the stronger permissions, with composite foreign-key tests retained under the fixture owner. Nepali is now an implemented interface locale; the previous test rejecting it was updated to reject unsupported French instead.

Hosted migration, email transport, real-account browser management journeys and independent translation review are not confirmed by local tests. No demo tenant or fabricated management statistics were introduced.
