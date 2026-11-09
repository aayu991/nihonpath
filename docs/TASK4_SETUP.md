# Task 4 — Supabase deployment plan

The application code is ready for the new schema, but no hosted SQL was executed during implementation. The project's auth settings endpoint returned 200; courses and lessons returned 404. Confirm the actual schema in the project's SQL Editor before applying anything.

## 1. Inspect and back up

Use a staging project first. Back up any existing schema/data. Confirm which previous migrations have already been applied; do not rerun existing foundation migrations blindly.

Read-only preflight:

```sql
select to_regclass('public.courses') as courses,
       to_regclass('public.lessons') as lessons,
       to_regclass('public.flashcard_schedule') as schedule,
       to_regprocedure('public.learning_dashboard()') as learning_dashboard;
```

If the original schema is missing, apply the six existing migrations in filename order as described in SUPABASE_SETUP.md. If some are already applied, apply only missing versions in order. Then apply these three new files:

1. supabase/migrations/202610240001_interactive_learning.sql
2. supabase/migrations/202610240002_learning_editor.sql
3. supabase/migrations/202610240003_learning_progress.sql

Use the project owner's SQL Editor or authenticated migration CLI. The public publishable key cannot execute schema changes. Do not place an owner/service-role secret in browser code or paste one into chat.

## 2. Review migration effects

- Adds vocabulary, course_enrollments and flashcard_schedule with foreign keys, indexes and RLS. Existing tables and learner records are retained.
- Adds lesson subject, flashcard category/vocabulary reference and bank subject. Existing lessons default to vocabulary; inspect and retag them where needed. Existing banks default to grammar, matching the original N4 bank.
- Existing published decks/banks receive compatibility review metadata; this does not certify educator review.
- Direct review inserts are replaced by the authenticated record_review RPC, which remains compatible with the app's existing call signature. Server-created review dates determine scheduling. Historical reviews are used to backfill schedules.
- Publishing new/revised JLPT lessons requires a structured body with bilingual explanation and Japanese examples (at least two for grammar). Existing text-only JLPT drafts need upgrading before publication. Existing published content is not automatically removed.
- Published deck/question children cannot be edited in place. Containers with learner reviews/attempts must be cloned with Save as new revision; this avoids deleting or changing historical content.
- Quiz subject is snapshotted on submission and backfilled on old attempts so later unpublishing does not erase subject statistics. The scoring RPC additionally checks the full published course/program parent chain.
- Schema changes and backfills can lock affected tables briefly. Test against a backup/staging copy with realistic data size before production. If rollback is needed, roll back app deployment first; do not drop learner tables or erase history as a shortcut.

## 3. Optionally import demonstration content

After an educator/project owner has reviewed the wording and intended publication, apply:

supabase/seeds/20261024_task4_demo.sql

This optional fixture is separate from schema migrations. It adds ten N5/N4 lessons, twenty new grammar questions plus six focused vocabulary/kanji/reading questions, nine N3–N1 sample cards/decks and twenty-nine vocabulary records. The existing twenty-card and twenty-question N4 data remain intact. It publishes only untouched N3/N2/N1 scaffold courses matching their original IDs/titles/state; review those three conditional updates before running it.

It uses stable IDs and inserts only missing records. A temporary inserted-container list ensures reapplication cannot republish an edited existing draft, replace existing bank/card children or reset learner progress. Two SQL tests verify safe reapplication, including after authored edits and learner activity.

The generated fixture's approved flags are for explicitly approved demonstration publication by its operator, not a claim of independent human review. For an unreviewed production curriculum, create drafts through the studio instead of running the optional fixture.

## 4. Author and publish

Sign in with an account that the project owner has explicitly appointed in private.admin_users using the existing trusted-owner procedure. Selecting Employer/Institute administrator as a learning goal never grants that permission.

- /en/admin/content/course, module and lesson retain the original editorial workflow.
- /en/admin/learning/vocabulary, deck and bank provide structured JSON drafts, validation, previews and publication review.
- Select the subject when creating a lesson; title/course ID supply its JLPT level. Open saved lesson preview before approval.
- Preview the Japanese, furigana, translation and correct answer. Request review → Approve reviewed content → Publish. Parent course/program must already be published.

Lesson body example:

```json
{
  "explanationEn": "Use を after the object of an action.",
  "explanationJa": "「を」は、{食|た}べるものなどの{後|あと}に{置|お}きます。",
  "examples": [
    { "japanese": "パンを{食|た}べます。", "english": "I eat bread." },
    { "japanese": "{水|みず}を{飲|の}みます。", "english": "I drink water." }
  ]
}
```

No audio or listening test should be published until a verified playable asset and a corresponding player/question integration exist. This release labels listening unavailable.

## 5. Hosted acceptance walkthrough

Use two learner accounts and a separately appointed admin in staging. With the first learner, enroll in N4, complete the first grammar lesson, review the deck, submit the ten-question quiz, and refresh the dashboard. Check that completion, history, subject accuracy and enrollment persist. Check that stored due_at follows the documented schedule and that retrying an event cannot duplicate it. With the second learner, confirm none of the first learner's records are visible. Confirm neither learner can open editor writes/previews. With the admin, save a draft, preview it, complete review and publish, then verify learner visibility. Attempt a stale save and a direct published-child edit; both must fail.

Also complete the existing registration/email confirmation/login/recovery checks from SUPABASE_SETUP.md. No test account or email was created during this implementation.

## Local verification commands

```powershell
cd <project-root>
node node_modules/eslint/bin/eslint.js . --max-warnings 0
node node_modules/typescript/bin/tsc --noEmit
node node_modules/vitest/vitest.mjs run
node --test tests/database.test.mjs tests/learning-database.test.mjs
node node_modules/next/dist/bin/next build
node node_modules/next/dist/bin/next dev
# With the local server running, in another terminal:
node scripts/check-learning-routes.mjs
```

If pnpm is missing from a normal PowerShell PATH, the bundled executable previously used here is:

```powershell
& "$env:USERPROFILE\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\fallback\pnpm.cmd" dev
```

The preview is http://localhost:3000/en/courses/n4. Native compiler access is required outside this task's Windows sandbox; no compiler/type/lint safeguards were disabled.
