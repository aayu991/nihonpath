# Task 8 — Japan Life Guide

## Audit

The existing project provided Supabase SSR authentication, private administrator membership, English/Japanese routing, goals/dashboard, published lessons, flashcards/scheduling, server-scored quizzes, examinations and the text AI tutor. Japan Life was a placeholder. Existing `visa_checklist_templates`, `visa_checklist_items` and `official_resources` were extended rather than duplicated. Existing records and prior features remain intact.

## Architecture

- `src/lib/guides/`: structured schemas, server-only draft content/keys, public catalog, owner plans/progress and database types.
- `src/components/guides/`: explorer/search/filter, preferences, checklist, article components, feedback, scripted conversations, dashboard progress and administrator editor.
- `/[locale]/japan-guide`: ten categories with recommendations based on self-selected goals and arrival stage.
- `/japan-guide/my-checklist`: adaptive tasks, notes, optional personal dates, progress, filtering, printing and local JSON export.
- `/japan-guide/[slug]`, `/vocabulary`, `/practice`: reusable structured reader, source/review metadata, existing flashcard and quiz engines.
- `/japan-guide/culture` and `/japan-guide/role-play`: eight culture lessons and seven scripted conversation settings. A published related scenario opens the existing AI tutor when configured; no new provider or voice controls were added.
- `/admin/guides`: structured JSON editing for categories, articles, translations, sources, templates and tasks; human review, publication, outdated marking, revisions and feedback.
- `/life-in-japan` redirects to the new center. Shared navigation, footer, recommendations and dashboards link to it. The AI tutor now accepts scenario preselection.

Named reusable article components include GuideHeader, GuideTableOfContents, GuideContent, ProcedureSteps, DocumentChecklist, OfficialSourceLinks, LastReviewedDate, RelatedJapaneseVocabulary, RelatedLessons, RelatedRolePlay and ArticleFeedback. Translation records support Japanese now and Nepali/Hindi content for future routing.

## Original drafts

The generator/optional seed contains ten categories, ten orientation guides, eight culture lessons, nine checklist templates, twenty-seven tasks, thirty vocabulary cards, thirty-eight questions, eighteen related lessons and seven AI scenario definitions. Everything remains unpublished Draft. No independent educator/legal/government approval is implied.

Content distinguishes suggestions, legal applicability checks, municipal arrangements, workplace policies and cultural recommendations. No statutory deadlines are invented. Document sections ask what the responsible authority actually requests; they are not universal document lists. Goals are planning preferences, not verified immigration/employment status. Ticks never certify legal compliance.

Unreviewed bundled guidance is a **local development preview only**, with `noindex`. Production schema failures produce an empty catalog rather than unreviewed guidance. Valid empty deployed catalogs stay empty. Demo quiz grading is also disabled in production.

## Security and review

`202610250001_japan_guide.sql` adds nine RLS tables, bringing the public total to sixty-one. Owner RPCs derive identity from `auth.uid()`, bound notes, require published tasks and protect against stale edits. Revised tasks get new versions; old ticks do not count as current completion. Private notes are absent from public catalogs and the editorial library.

Editorial RPCs check existing private administrator membership, whitelist fields and record reviewer/date/notes. Publication needs a published category, human-verified sources, a Japanese translation approved against the current article version, and published learning links. Legal/administrative/safety content also needs a source-review record for that version. Source edits revoke verification and dependent approvals; the older resource editor cannot bypass the source gate. Outdated marking advances the review version. History snapshots remain readable.

The 365-day source freshness window is an internal editorial policy, not a statutory deadline. Importing content never creates human approval.

## Official sources and limits

JASSO/JNTO references were accessed on 2026-10-25. ISA pages returned HTTP 403 and remain explicitly unverified. Unknown publication dates remain null. Outdated physical insurance-card wording on a reference page is not repeated as current procedure; the draft asks learners to confirm accepted evidence with their provider.

References: [ISA new entrants](https://www.moj.go.jp/isa/support/guidance/index.html?hl=en), [ISA guidebook](https://www.moj.go.jp/isa/support/portal/guidebook_all.html), [JASSO life](https://www.studyinjapan.go.jp/en/life/), [housing](https://www.studyinjapan.go.jp/en/life/accomodation/), [insurance](https://www.studyinjapan.go.jp/en/life/insurance/), [residence](https://www.studyinjapan.go.jp/en/life/residing-in-japan/), [JNTO planning](https://www.japan.travel/en/plan/), [emergency preparation](https://www.japan.travel/en/plan/emergencies/).

No document uploads, employer dashboards, bookings, payments or advanced storage were added. See [setup](TASK8_SETUP.md) and [verification](TASK8_VERIFICATION.md).
