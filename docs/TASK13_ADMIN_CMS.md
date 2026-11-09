# Task 13 — Admin CMS implementation and activation

This work continues the existing NihonPath application. The registered canonical domain is `https://nihonpath.org`; registration does not imply deployment. No hosted migrations, role grants, uploads, account suspensions, scheduled jobs, payment activation or website deployment were performed.

## Existing application audit

The application already had Supabase verified-session authentication, the private `admin_users` allowlist, 18 versioned migrations and 100 public tables with RLS. Existing models include courses, modules, lessons, lesson blocks, content translations, vocabulary, decks/cards, question banks/options/private answer keys, examination templates/attempt snapshots, guide articles/translations/official sources, organizations, tutoring, billing and operations/support.

Existing studios lived under `/admin/content/[kind]`, `/admin/learning/[kind]`, `/admin/exams`, `/admin/guides`, `/admin/preparation`, `/admin/tutors`, `/admin/billing` and `/admin/operations`. These were platform-admin-only, largely structured-document editors. Editing a live record could invalidate its publication immediately. Granular editorial roles, a shared protected layout, isolated working revisions, controlled scheduling and a media library were missing.

The existing lesson viewer, Japanese ruby renderer, flashcard tables, quiz grading, private answer keys, examination snapshots, guide source checks and role guards are reused. Existing course/lesson/vocabulary/question/guide tables were not replaced. The old guide and exam studios remain at `/admin/guides/legacy` and `/admin/exams/legacy`; other earlier routes remain available. Verified legacy administrators retain access when the new CMS schema has not yet been applied. New CMS screens explicitly report unavailable schema rather than manufacturing statistics.

## Implemented architecture

- `src/lib/cms/`: typed content schemas, permission/session boundary, RPC types, CSV validation, media signature validation and image normalization, published SEO adapters.
- `src/actions/cms.ts`: independently authorized server mutations, optimistic revision versions, safe errors and revalidation. UI permissions are advisory; database permissions decide every mutation.
- `src/components/cms/`: responsive sidebar/top bar, global search, review indicator, catalogs, lesson/course/kanji/question editors, structured text/ruby previews, revision history, translation overview, CSV preview/import, media library and user controls.
- `/[locale]/admin`: actual database statistics, drafts, pending review, recent audit activity and quick actions. Counts are database counts, never demo production metrics.
- Dedicated courses, lessons, vocabulary, kanji, question banks, media, users, search and review routes, plus `/admin/editor/[kind]` for shared editing of programs, modules, translations, guides and examination assemblies.
- Published lessons remain in the existing learner routes. Stable UUID links are retained; `/courses/[level]/lessons/[slug]` provides a database-resolved slug route. Published vocabulary creates real managed flashcard decks; withdrawal hides the managed cards without deleting review history. Published kanji has a real learner page.
- Existing billing entitlements enforce premium course/lesson/deck/bank access. Selecting a premium requirement does not activate payments or invent an entitlement.

Administrative chrome and new editorial labels currently use English; the existing public UI localization remains intact. Lesson content can be separately edited/reviewed/published for English, Japanese, Nepali and Hindi. Incomplete translations are not exposed. Existing guides retain their reviewed translation/version rules.

## Roles and trust boundaries

| Role | Read/preview | Save drafts | Review other authors | Publish/schedule/archive | Users/roles and legacy platform tools |
|---|---|---|---|---|---|
| Super Admin | Yes | Yes | Yes | Yes | Yes |
| Content Admin | Yes | Yes | Yes | Yes | No |
| Content Editor | Yes | Yes | No | No | No |
| Content Reviewer | Yes | No | Yes | No | No |

Both a verified nonanonymous identity and a server-owned assignment are required. User profile metadata and selected learning goals never grant administration. Ordinary learners cannot assign roles, read draft workspaces, execute private projection adapters or write content through REST. Within the new CMS revision workflow, authors cannot approve their own revision, including Super Admins. Self role changes and legacy allowlist changes are protected. Legacy platform operations also require verified identity.

Private CMS tables have RLS and no browser table grants. Only narrow, checked RPCs expose editorial data. User-directory reads are Super-Admin-only and audited; passwords, tokens and private Auth credentials are never selected. Account suspension uses the real Supabase Auth Admin API when server credentials exist; it is disabled otherwise. Self/legacy/Super Admin accounts are protected from this suspension control. Review provider session/JWT lifetime behavior during hosted suspension acceptance; a successful ban is not a claim that previously downloaded data or every issued access token has been revoked instantly.

## First complete publishing workflow

1. Sign in through the existing localized login page using an authorized, verified account. Open the Content Studio link in site navigation or `/en/admin`.
2. An editor creates an N5 grammar lesson, chooses its course/module and unique order, supplies Japanese/English explanations and at least two meaningful bilingual grammar examples, then saves a draft.
3. Preview is private. Saving a new revision does not modify the currently published lesson.
4. Submit for review. A different authorized reviewer inspects the saved revision and leaves at least ten characters of meaningful review notes before approval.
5. A publisher releases the approved revision. The projection and its publication/audit records commit transactionally. Public course and lesson queries see the released content, never the working draft.
6. Further edits restart the draft/review process. Unpublishing revokes public reads through the existing RLS hierarchy. Previously published content is archived rather than hard-deleted; only never-published drafts can be deleted after confirmation. Revision restore creates a new draft and cannot silently republish old content.

The rich lesson editor uses safe structured headings, paragraphs, bullets, explanations and examples rather than accepting arbitrary executable HTML. Ruby syntax is `{漢字|かんじ}`. React rendering escapes text. Imported entries remain drafts. Bank answer keys are projected into the existing private key table; public question reads do not include them.

## Migration plan

There are six additive Task 13 migrations, applied **after all existing migrations**, in this order:

1. `202610280001_admin_cms.sql` — editorial roles, private workspaces/revisions/audit, checked CMS operations and private compatibility adapters.
2. `202610280002_cms_catalog_extensions.sql` — published kanji, publication metadata, safe vocabulary/card projection, entitlement inheritance and transactional draft imports.
3. `202610280003_cms_media.sql` — private media metadata/associations, private Storage bucket and approved access resolution.
4. `202610280004_cms_user_operations.sql` — audited, narrowly scoped user inspection and account-operation authorization.
5. `202610280005_cms_guides_exams.sql` — reuse of source-review checks, guide translations, reviewed practice-exam assembly and translation overview.
6. `202610280006_cms_public_content.sql` — public DTOs/slug lookup/sitemap support and protected unused-media deletion preparation.

The new schema adds one public table (`kanji_entries`, making **101 public tables with RLS**) and eight private CMS tables. Historical migrations remain unchanged. The manifest fingerprints all 24 versions. No SQL has been applied to the hosted project.

Before approving hosted application: back up and restore into a separate staging project, check the installed migration history, review verified legacy-admin identities and validate existing data. Apply only missing versions in order. These scripts use transactions; stop on any error and do not continue with a partial sequence. Do not drop existing learning, attempt, billing, organization or guide records to resolve a conflict.

Important migration/maintenance risks:

- Verified identity is now required for legacy administrative operations too. Resolve unverified legacy accounts through genuine Auth verification, not by editing confirmation timestamps.
- Private projection adapters copy the already-reviewed historical function definitions so their validation can be reused without granting broad platform privileges. Future changes to those legacy validators need a new adapter migration and regression tests; do not modify historical checksums.
- Unique slugs/positions, stale published versions, used bank/deck guards, source freshness and missing parent publication can reject a release. Reconcile or duplicate into a new revision; do not bypass the checks.
- Existing legacy studios and Super Admin direct-content privileges retain their original review behavior; the new workflow does not claim to constrain a fully privileged database owner or every legacy Super Admin write surface. Use the new studio when draft isolation and independent revision approval are required. Rollback planning should retain the additive data and audit history; disabling new entry points is safer than destructive down-migrations.
- The private `cms-education` bucket is created only when the Storage schema is present. An existing public bucket with that name causes migration failure instead of silently publishing private files. Hosted bucket/service permissions must be verified in staging.

## Creating the first authorized Super Admin

This is an **owner-only database operation**, not a public registration or browser RPC.

1. Create or use your existing NihonPath account through normal registration/login. Complete genuine email verification. In Supabase **Authentication → Users**, verify the intended account identity, email confirmation and user UUID. Do not share passwords or secret keys in chat.
2. After reviewing and explicitly approving the migrations, apply them in the order above using the project owner's SQL Editor. Do not run the bootstrap before checking the account identity.
3. In the SQL Editor, replace the placeholder below with that existing verified UUID:

```sql
begin;
select private.cms_bootstrap('YOUR_EXISTING_VERIFIED_USER_UUID'::uuid);
commit;
```

The placeholder deliberately fails until replaced. The private bootstrap function rejects unverified/anonymous users and a second initial Super Admin assignment. Its execution is revoked from public, anonymous and authenticated API roles. The operation is audited. No password is created or hardcoded.

4. Sign out and back in, then open `/en/admin` (or another supported locale). Existing verified legacy allowlist admins are also recognized; do not remove that allowlist casually.
5. Use **Users & permissions** to assign a separate verified reviewer/editor account. A second person/account is needed for independent review; an author cannot approve their own draft. Subsequent assignments belong in the protected UI, not a public signup form.

An executable placeholder template is also in `supabase/admin/bootstrap-super-admin.sql`. Nothing has automatically granted your account privileges.

## Storage and scheduled publishing activation

Keep `SUPABASE_SECRET_KEY` server-only in `.env.local` / the approved deployment's secret store. Public/publishable keys cannot perform Storage/Auth administration. File uploads and account operations show disabled/unavailable states without this server configuration. No secret was added to source control.

Uploads enforce a 25 MB streaming limit and inspect actual signatures. Images are fully decoded with Sharp's strict error handling and a 20-million-input-pixel limit, normalized to at most 2400×2400 and re-encoded. SVG/executable/HTML uploads are rejected. PDF handling rejects known active-action markers and serves attachments with a restrictive CSP; this is not a full antivirus or PDF content-disarm scanner. Human review of actual files and permitted educational use is required before approval.

Public files are served through `/api/media/[id]` only after approved media is attached to accessible, published content; private editorial previews require CMS authorization. No public bucket or long-lived signed URL is issued. Referenced assets cannot be archived/deleted. Replacement uploads create private new versions. Physical deletion is explicitly confirmed, uses protected server credentials, revokes access first and keeps audit/metadata records; failed provider deletion is not reported as success. Real upload/playback/deletion still requires hosted Storage acceptance.

Scheduled revisions remain private and approved until the worker succeeds. `/api/operations/publish` accepts an authenticated **POST** using the existing random server-only `OPERATIONS_SECRET`. `CMS_SCHEDULE_ENABLED=false` is the default. The service-role SQL worker claims bounded due work, rechecks publisher assignment and records failures. No cron provider/job was installed; configure an owner-approved scheduler only after staging acceptance. Scheduling a time does not itself publish content or imply a scheduler is active.

## Scope and incomplete integrations

- The new lesson/course/kanji/question editors use normal fields; advanced guide, examination-assembly, deck and block documents still include validated structured JSON editors and reference directories. This is not a full WYSIWYG HTML editor.
- New administrative labels are English. Public UI and four-language content support remain. Marketing copy, navigation labels and existing legal drafts still live in the current translation/source files; this task does not claim that every UI string is now arbitrary CMS content.
- Reviewed vocabulary/grammar/kanji banks can assemble real quick/section practice exams with immutable private question snapshots. Existing examination controls remain. Full official-style multi-section/listening exams and broader examination formats are not enabled by this task; use existing supported practice and independently reviewed workflows. No fake exam availability is shown.
- The new server worker, Auth administration and Storage controls require actual approved configuration. No production provider calls were made. No paid APIs or payment processing were activated.
- Hosted administrator sign-in, independent editor/reviewer/publisher browser sessions, real media playback and provider-side suspension must be accepted on staging after migration approval. Disposable database and component tests do not prove those hosted integrations.

See `TASK13_VERIFICATION.md` for commands, measured results and the remaining acceptance matrix.

Primary implementation references: installed Next.js 16.4.2 guides in `node_modules/next/dist/docs/`; [Supabase user management](https://supabase.com/docs/guides/auth/managing-user-data), [Storage bucket access](https://supabase.com/docs/guides/storage/buckets/fundamentals), and [Sharp input security options](https://sharp.pixelplumbing.com/api-constructor/).
