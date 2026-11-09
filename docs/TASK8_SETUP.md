# Task 8 — Deployment and review

Back up and inspect migration history. After the thirteen previous migrations, apply once:

`supabase/migrations/202610250001_japan_guide.sql`

Optionally import original unpublished drafts:

`supabase/seeds/20261025_task8_drafts.sql`

Use the normal Supabase migration process or SQL Editor. A publishable key cannot migrate schema. No hosted migrations, accounts, admin grants, publications or paid calls were performed by the agent. No new secrets are required; optional live role-play uses Task 7 configuration.

The migration extends existing resource/checklist contracts and adds guide/private-plan tables. Existing non-guide checklist behavior and JFT/SSW resources are preserved. Columns, indexes, constraints and triggers may require locks: test in staging and choose an appropriate deployment window. Private progress deliberately prevents deleting referenced tasks; revise or unpublish them instead. Roll application code back first if necessary and preserve saved records/history rather than dropping tables. Seed reapplication preserves edited content and learner notes.

## Editorial order

Use an existing owner-authorized administrator at `/en/admin/guides`. Learner goals never grant this role.

1. Review/publish categories.
2. Check each exact official source, jurisdiction and applicability. Enter an actual verification date and any known publication date; leave unknown dates null. Record review notes and attest to actual review, then approve/publish. ISA references still require direct human checking. Never enter dates just to enable publication.
3. In existing program/learning studios, review/publish the original program/course, lessons, vocabulary/decks and complete banks after educator review. Course slug `japan-life-language` links back to the guide from dashboards.
4. Related AI scenario definitions remain unpublished until owner-controlled Task 7 review/setup. They are optional: remove `ai_scenario_id` if not part of the release. Scripted dialogue is embedded in article content and reviewed with it; it makes no provider call.
5. Review English content and the current Japanese translation. Translation approval records its parent article version. Re-review it after a parent version change.
6. Request article review, record source review for the current version, approve content and publish. Every article needs verified sources; legal, administrative and safety types require the separate source-review record. Actual domain review cannot be replaced by clicking Approve.
7. Review/publish checklist templates after their category, source and tasks are ready. Task edits unpublish the template and advance the task version. Notes remain private; old ticks require reconsideration.

Source edits invalidate dependent approvals. Older resource-editor calls cannot bypass revoked source verification. Outdated marking advances the review version and keeps notes. Revisions are read-only snapshots; copying one into the editor creates a new draft, not restored approval. The structured JSON studio shows the latest 100 history/feedback records; add pagination/search before large-scale content operation. It does not read private checklist notes.

## Preview, privacy and acceptance

Local `next dev` can show labeled drafts when the schema is unavailable. Guest/demo edits last only for the current page. Production never substitutes bundled unreviewed guidance. After schema deployment but before publication, an empty catalog is intentional.

Printing/exporting creates a local copy under the learner's control and does not certify compliance. Notes should not contain identifiers, medical details or financial/document contents. No scan/upload fields or document bucket exist.

With two staging learners, save goals/stage, tick/untick a published task, add a harmless note/date and reload/sign out/in. Confirm owner isolation and learner write denial. With an authorized reviewer, test create/edit, stale versions, source/Japanese review, publish/unpublish/outdated and history. Change/unpublish a source and check dependent visibility; revise a task and check old-tick handling. Test city-hall guidance, vocabulary, culture quizzes, scripts and optional live AI after Task 7 acceptance. Verify English/Japanese, keyboard use, mobile/tablet/desktop, printing and exported-copy accuracy.

Local SQL tests prove policy/RPC behavior, not hosted deployment, browser authentication, legal accuracy or independent review. Recheck official guidance for actual circumstances before publication.
