# Task 9 — Deployment and acceptance

1. Back up the database and inspect the recorded migration history. Test on staging first.
2. Apply the fifteen migrations in order, applying only missing versions. Task 9 is `supabase/migrations/202610250002_organization_management.sql`, after the Task 8 migration. Do not rerun already-applied migrations. A publishable key cannot execute schema migrations.
3. No demonstration organization seed is required. Sign in with a verified account and use `/en/organizations/register` to create your own organization.
4. Use Settings to choose contact information, organization language/timezone and an optional HTTPS logo URL. The logo loads directly in the browser; use an approved organization-controlled image host. No uploaded storage bucket or new secret is required.
5. Generate invitations in Learners & Staff. Deliver the actual links securely yourself; this release does not send email. Invitees must sign in using the matching verified address and explicitly choose whether to share assigned-course progress. A signed-out invitee can use the sign-in link in a new tab and return to the original invitation page.
6. Create classes, assign instructors or employer managers, enroll accepted learners and create dated sessions. Member goals never create permissions. Administrators cannot promote themselves; platform administration remains an owner-controlled SQL process.
7. Assign an existing published course to an individual learner or a class, optionally with a deadline. Learners can open the course from Assignments. Published parent programs are required. Publish real educational content through the earlier content studios; do not publish unfinished material just to populate dashboards.

## Migration considerations

This is additive data migration, but it deliberately replaces broad prototype organization policies and revokes direct tenant writes. Existing custom clients that inserted into memberships, sessions, attendance or training reports must move to the scoped RPCs before deployment. Inspect these integrations first. No existing records are deleted. Existing classless training sessions remain readable to administrators; plan a reviewed backfill before editing them through class-based attendance workflows. Do not invent class enrollment for old attendance.

New indexes and constraints can take locks. Schedule deployment appropriately and inspect existing data/constraints in staging. Settings are stored on `organizations`; no duplicate settings or attendance tables exist. Private progress records and scoring engines remain unchanged. Preserve the data and audit history if rolling application code back; do not drop organization tables as a rollback shortcut.

The four-locale profile check broadens accepted preferences without changing permissions. Existing learning content remains English/Japanese where Nepali/Hindi content has not been authored. Interface translations should receive native-speaker editorial review before release.

## Hosted acceptance checklist

Use two staging organizations and separate owner, administrator, teacher, manager and learner accounts. Confirm:

- Verified registration creates one scoped owner membership and no platform privileges; unverified/expired sessions fail.
- Wrong-email, revoked, expired and reused invitations fail. Accept membership in two organizations and verify independent consent and permissions.
- Organization B cannot fetch A's workspace, memberships, classes, attendance, invitations, reminders, exports or reports, even with forged IDs/cookies.
- An assigned teacher can manage only their classes; a manager can view only assigned employee training and cannot write attendance. An organization administrator cannot grant themselves owner/administrator privileges.
- Learners can share/revoke their assigned-course summaries, complete real lessons/quizzes and refresh to see derived results. Unrelated history and private messages/notes remain inaccessible.
- Create sessions, mark present/absent/late/excused, save a filtered bulk batch, reload and edit it. Two editors should produce a stale-write error, preserving the rejected input. Check monthly summaries and audit entries.
- Assign class/individual courses, follow the course links, set a deadline and send an in-app reminder. Unpublished parent courses must be rejected. Internal completion must never claim official certification.
- Check all report filters and CSV contents, quotes/formula escaping, organization switching, keyboard navigation, mobile/tablet/desktop layouts and four interface languages.

No hosted accounts, permissions or learner data were modified by the agent. Local SQL tests are evidence of database behavior, not hosted deployment or visual acceptance.

Official implementation references consulted: [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [Supabase SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client), and the installed Next.js Server/Client Component and cookies guides in `node_modules/next/dist/docs/`.
