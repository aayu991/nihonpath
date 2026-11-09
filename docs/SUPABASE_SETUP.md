# Task 13 CMS activation

The existing project now includes a permissioned, revision-based CMS. No hosted migrations or role grants were performed. Read [the implementation/activation guide](TASK13_ADMIN_CMS.md) and [verification evidence](TASK13_VERIFICATION.md). The six 20261028 migrations follow all existing migrations; the initial Super Admin bootstrap is owner-only and requires an existing verified account.

# Supabase setup and migration plan

## Environment

Create an ignored `.env.local` using `.env.example`:

- `NEXT_PUBLIC_SUPABASE_URL`: project base URL, for example `https://project-ref.supabase.co`; do not append `/rest/v1/`.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: the project's publishable key.
- `NEXT_PUBLIC_SITE_URL`: the exact app origin, for example `http://localhost:3000` locally and the HTTPS production origin after deployment.

Do not put service-role keys, database passwords, SMTP credentials or AI credentials into client-visible variables or tracked files. This app does not need a service-role key. The existing local configuration has been retained without printing its values.

## Migration order

Use a staging project first. Take a backup/snapshot of an existing hosted database. Apply only unapplied migrations, in this order:

1. `202610220001_foundation.sql`
2. `202610220002_curated_content.sql`
3. `202610220003_dashboard.sql`
4. `202610230001_platform_architecture.sql`
5. `202610230002_content_workflow.sql`
6. `202610230003_course_progress.sql`

Use the Supabase SQL Editor as the project owner, or the authenticated Supabase CLI migration workflow. The publishable key cannot run migrations. Do not rerun historical foundation scripts against an already initialized project; inspect migration history first.

The new scripts are transactional. They add tables/columns/constraints and tighten parent visibility without deleting records or changing existing IDs. Deploy the database migrations before the updated app because onboarding and editorial queries depend on the new schema.

## Preflight and behavioral changes

Before applying the expansion to a customized database, check existing slugs:

```sql
select id, slug from public.courses
where slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$';
```

The expansion replaces the old N5–N1-only slug constraint with a lowercase hyphenated-slug constraint, keeping the existing unique slug index. Unexpected customized slugs must be migrated deliberately, not silently rewritten.

- Existing courses remain unlinked (`program_id` null), retaining their current visibility and URLs. Link them to a program only when that program is ready to publish.
- Existing published courses/lessons inherit `approved` status to preserve publication. This is compatibility metadata, not evidence of a new human review. Audit legacy educational content separately.
- Existing user preferences receive a backfilled goal but onboarding remains incomplete until the learner saves a selection. The old single learning-goal field remains intact.
- Editing content resets it to draft and unpublishes it. Unpublishing a parent hides its children through RLS, including translations, rather than deleting their records.
- This is a forward migration; do not drop the new tables to roll back after learner/editor records exist. Roll the application back first if needed, retain the additive schema, and plan a reviewed follow-up migration.

## Auth provider setup

In Supabase Auth:

1. Enable email/password sign-up and email confirmation.
2. Set the Site URL to the same origin as `NEXT_PUBLIC_SITE_URL`.
3. Allow the English and Japanese confirmation paths for the intended local/staging/production origins, for example `http://localhost:3000/en/auth/confirm` and `/ja/auth/confirm` on that same origin.
4. Use confirmation email links that carry a token hash into the existing server confirmation page:

```html
<a href="{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=signup"
  >Confirm email</a
>
```

For password recovery, use `type=recovery` instead. The app's redirect URL has no query string. The confirmation page requires a button press before consuming the token, avoiding consumption by email scanners. It sends successful sign-up verification to onboarding and recovery verification to the password form.

Email delivery and provider-side rate limits/SMTP must be configured in Supabase. No paid email service was added by this task. Use a real test mailbox to verify delivery, expiry and recovery before deploying account functionality.

## Trusted administrator assignment

Only the project owner should appoint a content reviewer. For an explicitly selected, already registered trusted user, run owner-controlled SQL such as the following, substituting the intended account:

```sql
insert into private.admin_users(user_id)
select id from auth.users where email = 'trusted-reviewer@example.com'
on conflict do nothing;
```

This grants global content privileges; it is never run automatically by onboarding or registration. Teacher/employer/institute goals do not grant it. No new administrator was assigned on the hosted project by this task.

Organization memberships are separate assignments in `organization_members`. Global admins can provision organizations and membership rows under RLS. Instructor/organization-admin memberships apply only to the assigned tenant and do not imply global content authority. Organization provisioning/membership-management UI is future work.

## First content workflow

After setup, sign in as the explicitly appointed reviewer:

1. Open `/en/admin` and create a program draft.
2. Request review, approve, then publish the program.
3. Create a course linked to that program, then modules, lessons and components. Publish parents before children.
4. Add translations using a real target and locale. Review and publish translations independently.
5. Verify the program at `/en/programs/{slug}` and its lessons using both a guest and learner account.
6. Complete a lesson as a learner and confirm that only that learner's course/dashboard progress changes.

Example lesson body JSON:

```json
{ "text": "Learn a polite request in Japanese." }
```

Example `example` component content:

```json
{
  "title": "A polite request",
  "text": "{日本語|にほんご}を{教|おし}えてください。",
  "translation": "Please teach me Japanese."
}
```

Program translation content can use `summary`; lesson/component translations use `text` and optionally `translation`. Rich HTML is deliberately not rendered.

## Hosted verification boundary

Read-only checks in this task returned HTTP 200 from the configured Auth settings endpoint, and HTTP 404 from both `/rest/v1/courses` and `/rest/v1/learning_programs`. Their hosted schema availability is therefore unverified. No migrations, test accounts, memberships or editorial changes were applied to the remote project. Local PostgreSQL tests exercise the actual SQL and policies; they do not prove hosted email delivery or provider configuration.

## Task 4 additions

The learning schema now has three additional migrations dated 20261024 and a separate optional demonstration seed. Follow [TASK4_SETUP.md](TASK4_SETUP.md) after completing the original six migrations above; do not rerun already-applied versions.

Task 5 adds the examination center migration `202610240004_examination_center.sql`. See [TASK5_SETUP.md](TASK5_SETUP.md) for prerequisites, optional original question drafts, and the hosted acceptance checklist. Do not publish exam-only banks through the legacy bank workflow.

Task 6 adds `202610240005_preparation_centers.sql` and `202610240006_preparation_editor.sql` after Task 5. See [TASK6_SETUP.md](TASK6_SETUP.md) for the optional unpublished seed, relationship/storage considerations and required human review. No hosted migrations have been applied by the agent.

Task 7 adds `202610240007_ai_tutor.sql` and a separate scenario-definition seed. See [TASK7_SETUP.md](TASK7_SETUP.md) for server-only secret configuration, owner isolation, usage retention and live-provider acceptance. It extends the existing `ai_scenarios` table without replacing legacy roleplay records.

Task 8 adds `202610250001_japan_guide.sql` after Task 7. Follow [TASK8_SETUP.md](TASK8_SETUP.md) for the optional draft seed, independent content/source/translation review, publication prerequisites and staging acceptance. This migration extends existing resources and checklist templates and adds private learner records; it does not publish the bundled drafts.

Task 9 adds `202610250002_organization_management.sql` after Task 8. Read [TASK9_SETUP.md](TASK9_SETUP.md) before deployment: this preserves existing tenant records but replaces prototype direct-write permissions with scoped audited RPCs. Registration, invitations and management need this migration; no demonstration organization seed or new paid service is required.

Task 10 adds `202610250003_tutor_marketplace.sql` after Task 9. Follow [TASK10_SETUP.md](TASK10_SETUP.md) for prototype booking status/type considerations, tutor approval, timezone/concurrency acceptance and private-data retention. No tutor seed, payment processing, document upload or meeting-provider API is activated. Existing booking schedules/participants are retained.
# Task 11 billing migration

Apply `supabase/migrations/202610260001_multi_gateway_billing.sql` only after the previous 16 migrations and a staging backup/review. Gateways and products start disabled; no prices or credentials are seeded. Follow [Task 11 setup](TASK11_SETUP.md), including merchant onboarding, legacy RPC wrapper compatibility and premium-content access checks. The publishable key cannot apply schema changes.

# Task 12 operations migration

The additive 18th migration is `supabase/migrations/202610270001_launch_operations.sql`, after Task 11. It adds support, notification preferences/outbox, aggregate analytics and sanitized operations tables with RLS. Review the outbox triggers, account-deletion cascades, retention policy and worker approval gates on staging before applying. See [operations runbook](TASK12_OPERATIONS.md). No hosted migration was applied by this task.
