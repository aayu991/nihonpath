# Task 8 verification

Commands executed from `<project-root>`:

```powershell
node scripts/generate-guide-content.mjs
node scripts/generate-guide-seed.mjs
node scripts/guide-messages.mjs
node node_modules/vitest/vitest.mjs run
node --test --test-concurrency=1 tests/database.test.mjs tests/learning-database.test.mjs tests/exams-database.test.mjs tests/preparation-database.test.mjs tests/ai-database.test.mjs tests/guides-database.test.mjs
node node_modules/eslint/bin/eslint.js . --max-warnings 0
node node_modules/typescript/bin/tsc --noEmit --incremental false
node node_modules/next/dist/bin/next build
node scripts/check-guide-routes.mjs
```

Initial unit/action/loader run: **100 passed** across sixteen files. Initial full database run: **95 passed**, including prior learning, examination, preparation and AI suites. The expanded fourteen-case guide database suite passed after source/translation-version hardening. Final checks are recorded when complete.

Coverage: draft/public separation; development versus production fallback; goals/stage/circumstances; private progress/notes/dates; cross-owner isolation; write denial; human attestation; stale edits; private-key scoring; source invalidation; current-version translation review; older-editor bypass rejection; revised tasks; history; feedback and repeatable seeds.

Generated Next route types temporarily became stale after adding the guide layout. Build/type generation refreshes generated files rather than replacing working TypeScript configuration.

No hosted migrations or authenticated browser writes were performed. Source retrieval is not independent human review. ISA pages remain unverified after HTTP 403. Hosted learner/admin journeys, legal accuracy and final browser checks must be distinguished from local test evidence. See [staging acceptance](TASK8_SETUP.md).
