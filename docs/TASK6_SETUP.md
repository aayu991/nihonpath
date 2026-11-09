# Task 6 — Deployment and review

## Schema

Back up the database and inspect migration history. After the existing ten migrations, apply these once, in order, through the normal Supabase migration process or SQL Editor:

1. `supabase/migrations/202610240005_preparation_centers.sql`
2. `supabase/migrations/202610240006_preparation_editor.sql`

A publishable key cannot apply migrations. No service-role key belongs in browser code or source control. Existing ignored environment configuration remains unchanged.

The migrations add tables, columns, indexes, constraints, triggers and functions; replace goal/preview RPCs while preserving their authorization; and create the private `prep-audio` bucket when Supabase Storage is present. Existing data must satisfy new relationship checks on subsequent edits. Constraints/index creation can lock affected tables; schedule deployment appropriately. An existing public bucket with the same name causes a deliberate failure: inspect and migrate its assets/access before retrying, rather than exposing preparation assets. Test in staging first. Preserve saved records and roll application code back before considering structural rollback; do not drop learning history.

## Optional original drafts

Optionally apply `supabase/seeds/20261024_task6_drafts.sql` after both migrations. It requires the prior foundation and leaves all new material unpublished. Reapplication preserves existing edited/reviewed rows and learner records. It is not a substitute for educator or sector review.

Use an existing project-owner-authorized administrator. This task grants no account administrator membership. Open `/en/admin` for links to the program/course and learning editors, or `/en/admin/preparation` for the new preparation studio. Review and publish dependency order:

1. Programs, then courses; modules and other parents before children.
2. Lessons, complete question banks with options/private keys, vocabulary and decks/cards through the existing editorial workflow.
3. Industry sectors after their course, then related scenarios and interview records after their lessons/banks.
4. Dated official resources after checking the exact current authority page and sector notices.

Save corrections as Draft, request review, approve only after actual review, then publish. Review-state and stale-version checks apply on the server/database. Editing resets publication and review. Used learning content can require a new revision to protect historical results. Do not publish empty parents merely to enable navigation.

## Audio and examination limits

The administrator upload form accepts original/licensed MP3, WAV or OGG files up to 750 KB, below the default Server Action request limit. It checks MIME/signature, stores privately, requires a usage-rights note, supplies a short-lived signed preview, and requires complete browser playback and explicit human confirmation before recording verification. The bucket has a larger defensive 10 MB object limit; the application still enforces 750 KB. Verification records reviewer/date/duration and leaves the asset unpublished. Real playback and rights review remain a human responsibility; file signature checks alone do not establish decodability or content quality.

Listening question delivery and JFT full simulations remain unavailable. Implement a dedicated reviewed multi-section session model, official navigation rules and audio replay controls before enabling them. The existing JLPT examination center remains separate.

## Hosted acceptance still required

- With two test learners, verify registration/confirmation, goal updates, published JFT quizzes, workplace card scheduling, scenario scoring, interview completion and dashboard history across reloads.
- Confirm one learner cannot read/write another learner's records and cannot reach administrator operations.
- With an authorized administrator, verify draft editing, stale edits, review/publish/unpublish, parent visibility, private upload and actual audio playback; check Storage policies in the hosted project.
- Verify public English/Japanese pages show only reviewed published data after schema deployment. A newly deployed but unpublished catalog intentionally appears empty.
- Recheck official JFT/SSW requirements, notices and provider links before publication. Practice results do not determine visa eligibility or official examination outcomes.

Local PostgreSQL-compatible tests execute the actual migrations, policy/RPC rules, optional seed and a Storage policy fixture. They cannot prove hosted provider configuration, email delivery or real media playback. No remote schema changes or test accounts were created during this task.
