# Task 5 deployment and acceptance

## Apply the additive migration

Back up and inspect your Supabase project. Apply the existing migrations in filename order if they are not already deployed; do not rerun already-applied migrations. Task 5 requires all nine previous migrations. Its new file is:

`<project-root>\supabase\migrations\202610240004_examination_center.sql`

Run it through your normal Supabase migration process or project SQL Editor. A publishable key cannot execute schema changes. Do not place a service-role key in the browser or source files. Existing environment variables remain unchanged and ignored by source control.

This adds seven public RLS tables, private snapshots, functions, indexes, and columns/constraints on existing questions and banks. It does not drop existing tables or promote old practice questions to human-reviewed exam questions. Large existing question tables may incur a schema lock while adding columns/indexes; use an appropriate deployment window. The new exam-only constraint affects only newly flagged banks. The new option trigger only invalidates exam review for exam-only banks. Existing practice bank workflows remain separate.

Roll back application code first if necessary. Preserve newly saved attempts/results rather than dropping the schema to roll back; take a database backup before any later structural rollback. Regenerate Supabase types from the deployed schema when adopting a managed schema generation workflow; the repository currently maintains explicit strict types for its used tables/functions.

## Optional original drafts

After the migration, optionally apply:

`<project-root>\supabase\seeds\20261024_task5_drafts.sql`

This fixture requires the original N5 course, which the earlier migration creates. It leaves every question in Draft. No actual educator approval is implied. Importing the fixture is not sufficient to enable exams.

Sign in using an existing owner-authorized administrator account and visit `/en/admin/exams`. Administrator membership is maintained separately by the project owner in `private.admin_users`, never by learner goals or registration metadata. This task does not grant any account membership.

Choose each draft; verify the Japanese, level, answer ambiguity, explanation, attribution, passage and optional related resources. Save corrections. Use Review → Approve → Publish only after the corresponding review has actually happened. Editing content or options invalidates review. Review audit entries display reviewer IDs and server timestamps. Listening cannot be published through this workflow yet.

## Add more sets

The admin studio can author questions for any JLPT level. It finds or creates a private exam-only bank for that level/subject. Published exam questions still require their course and, if present, parent program to be visible. Publish the relevant higher-level course through the existing content workflow when its content is ready; do not publish empty courses merely to make a button available.

Template provisioning currently uses owner SQL. For example, after authoring a sufficient reviewed bank:

```sql
-- Replace BANK_UUID with the exam-only bank's actual UUID.
-- Durations/counts here are independent PRACTICE settings, not official counts.
with template as (
  insert into public.exam_templates(title, level, mode, published)
  values ('N5 grammar practice', 'n5', 'quick', true)
  returning id
)
insert into public.exam_sections
  (template_id, bank_id, title, question_count, duration_seconds)
select id, 'BANK_UUID'::uuid, 'Grammar practice', 5, 300 from template;
```

For quick practice, question_count is the maximum configurable count; learners may select a smaller count and any available reviewed difficulty. Section practice uses the fixed count and mixed difficulty. Keep one section per enabled practice template. Full templates cannot start even if manually published: full-mock completeness and sequential section support remain gated.

Related `lessonId` and `deckId` are optional UUID fields in a draft document, backed by foreign keys. Link relevant published resources. Question metadata supports an optional reading passage and tags. The audio asset FK is reserved for a later verified listening integration. Source keys/explanations remain in the private key table and frozen private snapshots.

## Local preview and checks

From `<project-root>`, with Node available:

```powershell
node node_modules/next/dist/bin/next dev
```

Open `http://localhost:3000/en/exams` or `/ja/exams`. Until the schema and reviewed content exist, the page deliberately shows a preparation/unavailable state.

Run checks from a separate terminal:

```powershell
node node_modules/eslint/bin/eslint.js . --max-warnings 0
node node_modules/typescript/bin/tsc --noEmit
node node_modules/vitest/vitest.mjs run
node --test tests/database.test.mjs tests/learning-database.test.mjs tests/exams-database.test.mjs
node node_modules/next/dist/bin/next build
node scripts/check-learning-routes.mjs
node scripts/check-exam-routes.mjs
```

## Hosted authenticated acceptance

1. With two ordinary learner accounts and an authorized reviewer, confirm learners cannot open editorial data or call admin write RPCs. Selecting an employer/institute goal must not change this.
2. Confirm draft questions do not start exams; publish only independently reviewed content. Full mocks and listening must remain unavailable.
3. Start a quick attempt, select answers, flag a question, navigate backward/forward, and wait for server-save confirmation. Refresh: answers/flags and the original expiration must remain.
4. Open the same attempt as the other learner: no attempt, responses or results may be accessible. Try direct client writes to deadlines/results/responses: they must fail.
5. Submit with unanswered items and confirm the warning. Compare actual stored responses with raw results and subject/type breakdowns. Repeated submission must return exactly the stored result.
6. Test an appropriately short practice template: let it expire, try a late save, and refresh. The database must reject late saves and return a submitted result; changing local storage or reloading must never reset the deadline. If offline/closed, expiration is finalized on next access, not by a background worker.
7. Review explanations and mistakes; verify optional lesson/deck links lead to relevant published content. A new exam must not include question IDs already revealed in that learner's completed results. Author additional reviewed questions when the pool is exhausted.
8. Check keyboard use, dialog focus, radio groups, question-heading navigation, Japanese text, and mobile layouts on real devices. Hosted authenticated browser flows have not been executed by this task.

Next recommended work: deploy and verify this foundation, obtain qualified educator review for an expanded N5/N4 bank, then implement verified listening and sequential sections before enabling full mocks.
