# Task 7 verification — 2026-10-25

## Commands

Executed from `<project-root>` using the installed runtime:

```powershell
pnpm add openai@latest
node scripts/generate-ai-seed.mjs
node scripts/ai-messages.mjs
node node_modules/vitest/vitest.mjs run
node --test --test-concurrency=1 tests/database.test.mjs tests/learning-database.test.mjs tests/exams-database.test.mjs tests/preparation-database.test.mjs tests/ai-database.test.mjs
node node_modules/eslint/bin/eslint.js . --max-warnings 0
node node_modules/typescript/bin/tsc --noEmit --incremental false
node node_modules/next/dist/bin/next build
node node_modules/next/dist/bin/next dev
node scripts/check-ai-routes.mjs
node scripts/check-learning-routes.mjs
node scripts/check-exam-routes.mjs
node scripts/check-preparation-routes.mjs
```

The latest unit/API run passed **84 tests** across thirteen files. All **83 database tests** passed sequentially; the twelve AI database tests were rerun after retry handling changes and passed. The first parallel database run exhausted local memory; `test:db` now deliberately uses `--test-concurrency=1`. No schema tests were removed or relaxed. Lint, strict type checking and production build passed. Route checks passed: **5 AI + 37 learning + 10 examination + 42 preparation = 94 checks**.

Coverage includes authentication, cross-origin rejection, body bounds, client-forged fields, disabled provider, owner-derived identity, saved-context use, private transcript access, direct-write denial, quota enforcement, in-flight locking, stale recovery, idempotent successful retries, failed request cleanup, deletion cascades and quota preservation. SDK tests mock Responses calls and assert structured output, environment-selected model, `store: false`, token/timeout limits, zero automatic retries, refusal/truncation rejection and bounded context. No live provider request was made.

## Browser verification

- Started N5 daily scripted practice and completed five learner turns. Grammar sample correction, correct informal sample, non-Japanese guidance and unassessed arbitrary text appeared under distinct labels. Completion displayed summary, vocabulary and useful expressions.
- Started N2 business scripted practice. Its response used more formal language. With end-only corrections selected, feedback stayed hidden until End session. The informal example then appeared as a register improvement, with no grammar correction.
- Furigana and translation toggles worked. Reviewed ruby readings became `display: none` when disabled; translation elements disappeared. Japanese messages measured 23px desktop and 22px mobile.
- Checked 390px mobile, 768px tablet and 1440px desktop with no horizontal overflow. Japanese language switching changed route and interface labels.
- Saved `outputs/task7-center-desktop.png` and `outputs/task7-chat-mobile.png`.

This is focused manual verification, not a full cross-browser accessibility audit. Saved history, refresh/resume, deletion and cross-account persistence have local SQL/API coverage, but their hosted browser workflows are unverified. Live response relevance, linguistic accuracy and provider latency/cost need configured staging credentials and educator review. Demo behavior is not evidence of live model performance. See [hosted acceptance checklist](TASK7_SETUP.md).
