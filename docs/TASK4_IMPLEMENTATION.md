# Task 4 — Interactive learning implementation

Date: 24 October 2026. Project: <project-root>. This extends the existing application; it does not replace the homepage, authentication, localization, program readers or previous learning content.

## Audit before implementation

Already implemented: localized en/ja homepage and routes, N5–N1 course navigation, N5/N4 vocabulary decks (20 cards), the original 20-question N4 grammar practice, server-scored quiz submissions, authenticated review persistence with idempotency keys, basic published lesson completion, personal dashboard metrics/history, multi-goal onboarding, and an admin program/course/module/lesson/block/translation draft/review/publication workflow. Six existing SQL migrations establish the schema, private answer keys, RLS and organization foundations.

Missing: subject dashboards and lesson lists, a connected lesson-to-practice journey, study toggles and previous/next lesson links, higher-level flashcard samples, shuffle, review scheduling/due queue, flexible question banks, per-subject history, course enrollment, and administration of vocabulary/decks/questions.

The connected Supabase project returned HTTP 200 for auth settings but HTTP 404 for courses and lessons during read-only checks. No hosted schema, account, role or learner data was changed by this task.

## Implemented journey

1. Open /en/courses/n4 (or another N5–N1 level).
2. Switch Vocabulary / Kanji / Grammar / Reading / Listening without reloading the page.
3. Open a lesson, toggle furigana and English, read bilingual explanations and examples, and navigate previous/next within the subject.
4. Mark completion. Authenticated database lessons reuse the owner-scoped completion action. Guests/demos explicitly mark only the current view and never pretend to save.
5. Open the vocabulary deck, flip, navigate, shuffle, mark Known / Again, finish, view a summary, and restart.
6. Follow Take a practice quiz. Select answers, use question-status navigation, optionally enable the elapsed timer, confirm submission, review score/explanations, and retry.
7. Signed-in users return to actual dashboard records, enrollment, a due-review queue, weighted subject accuracy and the next incomplete lesson for their selected target level. Guests are redirected to login before opening personal data.

Database mode reads published records through Supabase/RLS. Counts displayed there are based on returned lesson records, not invented totals. When the database schema is unavailable, separately labeled bundled demonstration content is offered. A valid empty/unpublished database record does not silently fall back to a demo of that record. Demonstrations never report saved progress.

## Content delivered

- Ten bilingual text lessons: two grammar, one vocabulary, one kanji and one reading lesson for each of N5/N4. Grammar lessons contain multiple meaningful Japanese examples with ruby markup.
- Ten original demonstration grammar questions for N5 and ten selected/reviewed original N4 items in a new bank. The previous 20-question N4 bank and its route remain available.
- Vocabulary, kanji and reading demonstration banks for N5/N4 (one focused question per subject/level).
- Existing N5/N4 cards retained; nine additional sample cards cover N3/N2/N1. Twenty-nine words can be included in the optional database vocabulary fixture.
- No listening questions or player without verified audio. N3–N1 subject lessons and larger question banks are honestly unavailable until authored.

Answer keys remain in a server-only catalog or the private SQL schema. Public quiz props contain only prompts and options. A complete valid submission is required before keys/explanations are returned. The timed option is an elapsed practice clock with no time limit, not a simulated official JLPT exam.

Content passed automated structural, furigana-format and answer-key checks and an implementation review of wording/grammar. This is not independent human educator approval. Before presenting it as quality-approved curriculum, have a Japanese educator approve level alignment, distractors and explanations. The optional fixture is an explicit owner-reviewed demonstration import, not evidence that an educator has approved it.

## Reused and added code

Reused FlashcardDeck/Flashcard/Controls/Progress/Results, QuizEngine/Question/Progress/Navigation/Submit/Results/AnswerExplanation, Japanese ruby rendering, LessonCompletion, Button/Link, verified auth.getUser checks, the existing content studio, private answer keys and SQL scoring.

New shared learning components are in src/components/learning/: course-dashboard.tsx, course-enrollment.tsx, lesson-viewer.tsx, learning-dashboard.tsx and learning-content-editor.tsx. The viewer exports LessonHeader, LessonContent, JapaneseSentence, FuriganaToggle, TranslationToggle, GrammarExplanation, VocabularyExample and LessonNavigation; persistence reuses the existing LessonCompletion. Existing lesson blocks render inside the toggles and before completion/navigation. Published deck/bank references now link to the shared practice engines.

Data contracts/loaders/validation: src/lib/learning/study-types.ts, study-server.ts, study-catalog.ts, admin-validation.ts; src/data/study-curriculum.json is imported only through the server-only catalog. Generation sources are scripts/create-study-curriculum.mjs and scripts/generate-study-seed.mjs.

New actions: enrollment.ts and learning-admin.ts. Existing learning.ts, lesson.ts and database types are extended. English/Japanese Learning messages and shared readable learning styles are added.

New routes: /[locale]/courses/[level]/practice/[bankId], /[locale]/admin/learning/[kind], /[locale]/admin/lesson-preview/[id]. Existing course, flashcard, lesson and dashboard routes are extended. /courses/n5/grammar-practice redirects to the new N5 grammar bank; the original N4 grammar-practice route is retained.

## Persistence and security

Three additive migrations add subject/category metadata, vocabulary, course_enrollments, flashcard_schedule, administrator learning-document APIs, stricter publication validation, a historical quiz-subject snapshot and dashboard aggregation. All 36 public tables have RLS enabled. No privileged key is introduced into client code.

Prototype scheduling rule: Known advances a consecutive-known streak and schedules 1, 2, 4, 8, 16, then at most 30 days; Again resets the streak and schedules one day later. Only newly inserted server-recorded review events advance the schedule. Repeating an event ID cannot advance it twice. Existing review history is backfilled. This is an initial scheduling rule, not an advanced memory model. The queue contains reviewed cards whose stored due_at is due; unreviewed cards remain available in normal decks.

Review dates are server-controlled: direct authenticated inserts into flashcard_reviews are revoked; the existing record_review RPC still accepts genuine user reviews, derives auth.uid and enforces published parent visibility. Quiz submissions are scored in SQL for members. Guest database practice is read-only; offline demonstrations are graded on the server without writes. Subject statistics remain attached to submitted attempts when the source bank is later unpublished.

Admin access is verified in every action and again inside security-definer RPCs. Ordinary learning goals never grant administrator membership. Vocabulary/deck/bank authoring uses validated structured JSON, draft preview, optimistic versions and review/publish actions. Japanese text/readings, distinct answer options, one valid private key and explanations are checked. Published child records cannot be edited in place; used banks/decks must be saved as a new revision to preserve history. The original course/module/lesson editor remains in place, adds subject selection and saved-lesson preview, and validates new JLPT lessons before publication.

## Verification

- ESLint: passed with zero warnings/errors.
- Production build: passed on the final application source.
- Strict TypeScript: passed with tsc --noEmit; the production build also checks TypeScript.
- Vitest: 31 tests in five files passed, including 10-key integrity for N5/N4, four question types, multiple bilingual grammar examples, all-level cards, malformed furigana/duplicate answers/bad keys and localization parity.
- SQL tests: 38 passed across both database suites, applying all nine migrations in actual PostgreSQL-compatible PGlite role contexts. Coverage includes all prior security checks, real enrollment/completion records, schedule intervals/retries, owner-scoped queues, guest no-write grading, persisted member scores, editor authorization, review publication, stale edits, historical revisions, malformed content, safe fixture reapplication and historical subject accuracy.
- Browser guest walkthrough: N4 subject switch and unavailable listening; first grammar lesson; furigana and translation visibility; honest local completion; full shuffled ten-card session (five Known/five Again); summary; ten-question grammar quiz; answer map and retained choices; confirmation; expected 3/10 score for the selected answers; bilingual explanations; retry and refresh reset; dashboard redirect to login.
- Responsive checks: 390x844, 768x1024 and 1440x1000. No document horizontal overflow. No browser console errors were observed. English/Japanese course-interface switching passed. Japanese quiz prompts measure 23px; lesson examples and learning body copy are readable.
- Route smoke script: 37 route/guest-access checks passed. scripts/check-learning-routes.mjs checks level/deck/lesson/bank/legacy/auth routes, no initial answer-key leak, and guest access redirects. It recognizes Next.js streamed redirects as well as ordinary HTTP redirects.

Commands run: direct Node entrypoints for Prettier, ESLint, TypeScript, Vitest and Next build/dev; node --test tests/database.test.mjs tests/learning-database.test.mjs; node scripts/check-learning-routes.mjs; read-only Supabase API checks; browser interaction and viewport checks. package.json test:db now runs both database suites. No dependencies or paid services were added.

## Deployment and remaining verification

See TASK4_SETUP.md. Hosted migrations are not applied by this task. A real-account browser verification of email confirmation, completion, review dates, quiz history, dashboard refresh and admin publication must follow schema deployment. Do not treat the guest browser walkthrough or PGlite tests as proof of hosted end-to-end authentication.

Listening remains unavailable without audio. N3–N1 full lessons/question banks require content authoring. Independent educator signoff is pending. The admin foundation intentionally uses structured JSON, not a rich text/question builder. Lists use the provider row limit (admin listings show the latest 100 records); larger curricula need pagination and exact server counts before expanding beyond that limit. No AI voice, tutors, subscriptions or unrelated services were added.

Screenshots: outputs/task4-course-desktop.png and outputs/task4-lesson-mobile.png.
