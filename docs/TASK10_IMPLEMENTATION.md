# Task 10 — Human Japanese tutor marketplace

## Audit and approach

NihonPath already provided Supabase SSR authentication, independently maintained private platform administrators, four next-intl locales, reusable buttons/navigation, learner/admin dashboards, learning engines, organization management and an unused `tutor_bookings` foundation. There were no tutor applications/profiles, marketplace, availability, review or tutor-admin screens. No payment/video provider was configured. The foundation booking table already restricted reads to its student and tutor and had no client write grants.

Task 10 extends that table and the existing application. Database permissions and booking dependencies were tested first, then application/approval, discovery, calendars, dashboards and moderation were connected. No hosted migration, accounts, real applications, publications, paid calls or messages were created by the agent. No fictitious tutor/rating seed or production fallback was introduced.

## Architecture and changed files

- `supabase/migrations/202610250003_tutor_marketplace.sql`: transactional additive migration after Task 9. Extends `tutor_bookings`, maps the equivalent prototype `requested` status to `pending`, preserves identities and UTC appointment times, and adds twelve RLS tables. Total public RLS table count: 80.
- New tables: `tutor_applications`, `tutor_profiles`, `tutor_lesson_types`, `tutor_availability_rules`, `tutor_availability_exceptions`, `tutor_booking_events`, `tutor_lesson_notes`, `tutor_meetings`, `tutor_reviews`, `tutor_reports`, `tutor_moderation_logs` and `tutor_request_limits`. Specialties/languages/levels/durations are validated arrays; private credential descriptions are kept in applications, not copied into public profiles.
- `src/lib/tutors/`: strict input/output schemas, typed tables/RPCs, server-only catalog/workspace loaders, currency/time helpers and a type-only future meeting-provider contract. Existing platform/Supabase database types were extended.
- `src/actions/tutors.ts`: authenticated application/booking/review/report commands, public bounded slot reads and independently authorized administrative actions. Whitelisted fields, owner-derived identities, predictable localized error keys and stale-version rejection are used throughout.
- `src/components/tutors/`: stable reusable forms, application editor, public discovery/filtering/cards, timezone-aware seven-day booking calendar, availability management, student/tutor dashboards, reporting and administrative moderation.
- Routes in every locale: `/become-a-tutor`, `/tutor/application`, `/tutor/dashboard`, `/tutor/availability`, `/tutors`, `/tutors/[slug]`, `/tutors/[slug]/book`, `/dashboard/lessons`, `/admin/tutors`. Private tutor layouts verify sessions; administrator pages/actions also check private administrator membership. Loading/error boundaries and shared navigation/footer/dashboard links were added.
- `scripts/tutor-messages.mjs`, `messages/{en,ja,ne,hi}.json`: isolated Tutor namespace for forms, filters, calendar labels, statuses, errors, privacy and administration. Existing namespaces and educational content are preserved.
- `tests/tutors-database.test.mjs`, `tests/tutors.test.ts`, `tests/tutor-actions.test.ts`, `tests/tutor-server.test.ts`, `scripts/check-tutor-routes.mjs`: policy/state-machine, date/price/localization, action, loader and HTTP checks. The serial full database script includes the tutor suite.

## Applications and public information

Existing users save private drafts or atomically save and submit an application. The workflow supports draft, submitted, under review, approved, rejected and suspended. Independent administrators review applications and record feedback/audit notes. Credential verification additionally needs actual reviewer attestation and a curated public summary; approval alone never creates a verified-credentials claim. Administrators can revoke or update credential verification independently of suspending a tutor.

An approved tutor chooses whether to publish. Public profiles expose only teaching information and separately published lesson options. Authentication email, private credential descriptions, student identities, meeting URLs and personal notes are excluded. Approved-profile edits create a new private draft, withdraw search publication and clear the old credential badge pending re-review; existing confirmed appointments retain their UTC schedules.

Profile photos are optional HTTPS links, and introduction videos open as external links. There are no identity/credential uploads, document buckets or embedded video controls. Tutors are instructed not to place identifiers or contact details in application/public text. Administrators must review the public-facing content and actual credential evidence; database tests do not constitute human verification.

Discovery searches actual published profiles and filters level, specialty, teaching language, currency-specific price range, experience and reviewed-credential status. Sorting supports name, experience, published-review rating and price within a selected currency. Cards are paged twelve at a time. Availability checks apply to the current results page and use actual server-generated slots filtered to learner-local preferred hours. An unavailable schema and a valid empty catalog are kept distinct. No ratings, tutor photos or testimonials are fabricated.

## Scheduling and booking

Weekly windows use the tutor's IANA timezone. One-off availability/holiday fields explicitly accept UTC, avoiding ambiguous local input. UTC timestamps are stored and displayed with a user-selected or detected timezone and offset. PostgreSQL generates candidate instants, converts calendar-day boundaries with IANA rules and rechecks availability server-side. Nonexistent local hours never appear; repeated-hour instants remain distinct. Lessons crossing an offset change in the tutor's zone are deliberately not offered. Overnight weekly windows require two same-day windows; no misleading cross-midnight rule is accepted.

Minimum notice is 0–168 hours; maximum horizon is 7–90 days. Public requests expose at most seven local calendar days. The booking RPC locks student/tutor identities in deterministic order and checks overlapping active appointments for both, including a tutor who is also a learner. Pending holds expire after at most 24 hours or the scheduled start. Expired holds stop blocking availability. Confirmation revalidates rules, exceptions, type publication, approval, hold expiry and overlaps. Notice applies when requesting, rather than making a previously valid request impossible to confirm merely as its start approaches.

Request UUIDs make identical retries idempotent and conflicting/closed retries fail. A learner may have at most five active pending requests and twenty successful requests per database day. Cancellation does not reset the daily count. Pending requests may be cancelled; a confirmed learner requests cancellation for the tutor to accept. Tutors can confirm/decline/cancel and record a no-show with a reason after the end. Both participants acknowledge completion after the scheduled end before a review is eligible. A tutor cannot unilaterally manufacture review eligibility.

Dashboards show actual booking counts, status/date filters, local schedules, shared learning goals, private personal notes, confirmation/cancellation/completion controls and history. Expired holds are clearly labeled. Cancellation/dispute and suspension events preserve booking records. Suspending a tutor withdraws publication and cancels future pending/confirmed lessons with audit events.

## Payments, meetings, reviews and retention

**Paid booking is unavailable.** Tutors may propose/publish informational prices, but only zero-priced lesson types can produce requests. The database rejects positive-priced requests even when a client bypasses the UI. Booking title/duration/currency/price are snapshots, with integer minor units and zero-decimal JPY handling. No cards, collection, commission, payout, refund or tax service is active. Future payment integration needs a separate audited financial ledger and retention model.

Confirmed tutors may attach a private HTTPS Google Meet, Zoom or Teams link. Only the two participants can read it; marketplace administrator membership alone does not grant meeting/note access. NihonPath hides the link one day after the scheduled end. The external provider controls actual room access; NihonPath does not claim to expire or revoke that room. The future provider interface has no fake live implementation.

Personal notes are author-only, distinct from learning goals explicitly shared with the tutor. An administrator-run retention function removes hidden old meeting rows after one day, personal notes/shared goals after one year, and request-limit records after 31 days. This is a manual/schedulable operation, not an installed background job. Tutor-specific account foreign keys cascade private records/reviews/bookings on account deletion. Platform-wide account deletion still needs the earlier modules' retention/deletion workflow; this task does not bypass their restrictive foreign keys or introduce an unsafe delete-account button.

One 1–5 review with bounded text is allowed per mutually completed booking. New reviews and tutor responses await moderation. Public review DTOs omit learner/booking IDs; aggregates derive solely from published review rows. Profile/review reports and booking disputes are private to the reporter and authorized administrators. Moderation, review decisions and credential changes are audited. Organization roles grant no tutor privileges or access to another user's lessons.

## Remaining rollout work

Deploy missing migrations in order on staging; configure genuine tutor/admin/student accounts and perform independent content/credential review. Hosted multi-connection contention, authenticated browser journeys, real external meeting behavior and native-speaker translation review remain staging acceptance steps. PGlite transactional contention tests exercise one database scheduler, not a multi-connection load test.

The initial public catalog/private workspaces load authorized snapshots, with client paging and bounded seven-day slot queries. Add server-side search/pagination, bounded history/report queries and operational monitoring before a large marketplace launch. No email/push/calendar delivery is configured: confirmations are persisted in-app statuses. Legacy bookings without a mapped lesson type stay visible and cancellable; they cannot be silently converted into a newly bookable lesson or assigned invented prices.

See [deployment and local verification](TASK10_SETUP.md) and [test evidence](TASK10_VERIFICATION.md).
