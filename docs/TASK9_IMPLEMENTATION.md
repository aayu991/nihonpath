# Task 9 — Organization management

## Audit and preservation

The existing application already had Supabase SSR authentication, privately maintained platform administrator membership, English/Japanese routing, courses/lessons, flashcards, quiz attempts, examinations, preparation centers, AI practice and Japan Guide. Organization-related tables existed as an unused foundation: `organizations`, `organization_members`, `organization_programs`, `training_sessions`, `attendance_records` and `training_reports`. There were no organization registration, invitation, class, attendance or reporting interfaces.

Task 9 extends that foundation rather than replacing it. Existing sessions/attendance remain intact; old sessions may have a null class. They are readable by organization administrators but must be associated with a class through a separately reviewed data migration before class workflows can edit them. No existing learner records, content or hosted Supabase data were deleted. No hosted migration, account creation, administrator grant or email sending was performed.

## Implemented architecture and files

- `supabase/migrations/202610250002_organization_management.sql`: extends existing organization/member/session/profile contracts; seven new tables bring the public RLS total to 68. New tables: invitations, classes, class teachers, class enrollments, course assignments, reminders and append-only organization audit logs. Settings are columns on the existing organization record; attendance reuses existing session and attendance tables.
- `src/lib/organizations/`: strict input/output schemas, role helpers, safe CSV output, message-key validation, typed RPC interfaces and server-only organization context. Existing platform database types were extended.
- `src/actions/organizations.ts`: verified-session registration, organization selection, whitelisted commands, random invitation secrets, acceptance and private cookie selection. Every RPC independently checks tenant permissions; the cookie never grants access.
- `src/components/organizations/`: responsive sidebar, organization switcher, registration/onboarding, settings/logo, member management, class/instructor/enrollment/session forms, attendance editor, assignments, reports, charts, CSV downloads and personal dashboard entry.
- `src/app/[locale]/organizations/`: public introduction, authenticated registration and email-bound invitation onboarding. Signed-out invitees can sign in in another tab and return without losing their token.
- `src/app/[locale]/organization/`: authenticated layout, loading/error handling and nine allowlisted workspace views: dashboard, learners, classes, attendance, assignments, teacher, employer, reports and settings. Teacher/employer pages also verify the appropriate role on the server.
- `scripts/organization-messages.mjs`, `messages/{en,ja,ne,hi}.json`: organization labels and feedback in four languages. Routing, language switching, profile validation and profile creation support these four locales. Existing learning content uses English/Japanese fallback; this is stated in the workspace. Learning content translations remain separate.
- `tests/organizations-database.test.mjs`, `tests/organizations.test.ts`, `tests/organization-actions.test.ts`: actual PostgreSQL policy/RPC tests, schema/CSV/localization tests and action-boundary tests. Existing tests now expect direct tenant writes to be denied and four supported interface locales.

## Permissions and privacy

Platform administrators are still maintained in `private.admin_users`, never profile metadata or selected goals. A verified user can create up to five organizations and becomes owner of only those organizations. Owners/organization administrators manage their tenant. Only owners/platform administrators change staff roles; owner and self membership edits are protected. Teachers can create their own assigned classes and manage their assigned learners. Employer managers have read access to assigned classes only and cannot mark attendance or assign courses. Learners see their own information.

Invitations store only SHA-256 hashes of random 32-byte secrets. Acceptance requires the matching verified email, a live seven-day invitation and a new membership. Tokens are single-use, revocable and absent from audit/public responses. Bulk generation allows up to twenty addresses per request and one hundred invitations per organization per day. **Email transport is not configured**: the UI provides actual links for manual secure delivery and never claims an email was sent.

Members may belong to multiple organizations. Progress sharing defaults to false and only the member can change their own preference. Shared reports include lesson counts, practice score/subject summaries and lesson activity dates for assigned courses. AI transcripts, private guide notes, quiz answers, unrelated study and private examination results are excluded. Attendance is an organization-owned record independent of progress sharing. Revoking consent hides progress from subsequent reports; previously downloaded CSV copies cannot be recalled.

Class/session/member relationships use tenant-composite foreign keys. Direct client writes are revoked, including formerly broad legacy staff writes; audited RPCs replace them. Attendance is unique per session/learner, checked against active class enrollment, transactionally saved and protected against stale overwrites. Class edits also use optimistic versions. Membership deactivation immediately removes tenant access without deleting historical records.

## Reporting definitions and limits

All counts come from database records. Attendance rate is present plus late divided by marked, non-excused records; unmarked records are excluded. Lesson completion counts currently published visible lessons in assigned courses. Empty/withheld denominators display `—`. Practice accuracy is weighted by answered question count, with duplicate learner/course assignment summaries deduplicated for aggregate charts. Date filters and monthly groupings use the configured organization timezone and affect practice events and session attendance; current completion/enrollment snapshots are labeled separately. Class, course, teacher, level, industry and organization filters operate on authorized data only. A month selector supports attendance summaries. CSV exports reflect visible filtered records and escape spreadsheet formulas and quoted fields.

Reports describe internal training, never official JLPT/JFT/SSW certification. They currently use existing `quiz_attempts`; full mock `exam_results`, listening certification, vocabulary mastery and official skills certification are not inferred. Some course families remain drafts or placeholders from earlier tasks and therefore cannot be assigned until published. Reminders are real in-app assignment records, not email or push notifications.

The current workspace fetch is intended for initial institute-sized tenants. Add server-side pagination, bounded report ranges and report aggregation before large-scale enrollment; audit display is already limited to the latest 100 entries. Ownership transfer, organization deletion, uploaded logo storage, external email delivery and exam-result sharing workflows are not implemented. No subscription billing, tutor payments or marketplace was added.

See [deployment and hosted acceptance](TASK9_SETUP.md) and [verification](TASK9_VERIFICATION.md).
