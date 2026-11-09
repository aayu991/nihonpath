# Task 5 — Examination center

Implemented on 24 October 2026 in the existing Next.js application. No project recreation, package upgrades, authentication replacement, hosted database writes, or administrator grants were performed.

## Audit and reuse

Before this task the application had 36 public tables and nine versioned migrations. Existing routes covered the localized homepage and category pages, N5–N1 courses, lessons, decks, practice banks, the legacy N4 quiz, registration/login/recovery, onboarding, learner dashboard, and content administration.

Reused `createClient`, verified `getCurrentUser`/`requireUser`, owner-maintained `private.admin_users` membership through `getAdminContext`, next-intl routing, the existing button and Japanese ruby renderer, and the existing `question_banks`, `questions`, `question_options`, and `private.answer_keys` tables. Existing practice quizzes, learner progress, flashcard scheduling, and course content remain intact. Existing `examinations` / `examination_reviews` are future program assessment models; templates can optionally reference an existing examination rather than replacing it.

The old quiz engine has an optional elapsed timer and complete-answer submission, but no persisted exam deadline or resumable responses. It was preserved as untimed practice. A separate exam engine handles the different session requirements.

## Routes and components

| Route                      | Behavior                                                                                                                                   |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `/en/exams`, `/ja/exams`   | Level, format, subject, reviewed difficulty and quick-question count; official duration reference; recommendations; own latest 20 attempts |
| `/{locale}/exams/{id}`     | Authenticated, owner-only attempt restoration and results                                                                                  |
| `/{locale}/exams/mistakes` | Incorrect/unanswered review from the latest 20 submitted results                                                                           |
| `/{locale}/admin/exams`    | Verified administrator question authoring, JSON editor and review audit                                                                    |
| `/{locale}/mock-tests`     | Compatibility redirect to the examination center                                                                                           |

Navigation, footer, course pages, and dashboard link to the center. Loading/error states are provided under the exam route. Unavailable content is clearly labeled, and start is disabled where reviewed content is insufficient. No fake local exam persistence substitutes for Supabase.

`src/components/exams/` provides ExamConfiguration, ExamInstructions, ExamTimer, ExamQuestion, QuestionNavigator, AnswerSelector, ExamProgress, ExamSubmission, ExamResults, and AnswerReview. The engine supports radio selection, answer clearing, previous/next, numbered question navigation, persistent review flags, answered counts, confirmation including unanswered counts, server saves, retry errors, and explanations after submission. Timed prompts hide ruby readings; review shows them. Native fieldsets, radios, modal dialog, focus outlines and question-heading focus support keyboard access.

Results show raw total, correct, incorrect, unanswered, accuracy and server-measured elapsed time; subject/type breakdowns; English/Japanese explanations; optional related lessons/decks; and level-specific learning links. These are practice results, not official scaled scores or pass predictions.

## Database and trust boundary

`202610240004_examination_center.sql` adds seven public tables (43 total): exam_templates, exam_sections, question_reviews, exam_attempts, exam_section_attempts, exam_responses, and exam_results. It extends existing banks/questions, adds foreign keys for lesson/deck/audio relationships, and adds private frozen exam items. Every new public table has RLS; learner tables have owner read policies and no direct client write grants.

Exam-only banks must remain unpublished. This is enforced by a database constraint so the older guest/member quiz grading endpoints cannot reveal their keys. Questions undergo Draft → Under review → Approved → Published, with Archived available as a editorial state. Metadata/option changes return a question to Draft, and review changes record the authenticated reviewer and timestamp. Draft save and review RPCs check `is_admin()` independently of the server action. The structured editor validates option uniqueness, answer index, source attribution, question type, difficulty, explanations, and reading passages. SQL independently checks publication requirements. Human review is a deliberate administrator action, never a seed/import side effect.

`start_exam` serializes starts for each verified owner, permits one active attempt, validates configuration and visible parent course/program, requires published questions, freezes prompt/options/keys, and stores a server expiration. Private snapshots preserve historical grading even if source content is edited. Answer RPCs lock the attempt, validate options against the frozen question, and reject changes after expiration/submission. `submit_exam` locks and grades stored responses, permits unanswered items, stores one immutable result, and returns the same result on retry. Scores, owner IDs, start times and deadlines are never accepted from a learner.

`get_exam` strips private keys from active responses and finalizes an expired attempt before returning it. The visible timer uses server time plus elapsed monotonic time, rechecks on tab visibility, and does not allocate a new duration on refresh. While the page is open it automatically submits at expiration (up to three connection retries; manual retry remains available). If closed/offline, grading is finalized on the next authenticated load. There is no background scheduled worker; the server deadline nevertheless rejects every late response.

Questions already present in a learner's submitted exams are excluded from that learner's new active exams. Catalog counts use the same exclusion, so revealed answer keys are not recycled into subsequent attempts. New revisions must be editorially assessed; semantic duplicates across independently authored IDs are not automatically detected.

## Content and official settings

Official sections/durations were checked against [JLPT test sections](https://www.jlpt.jp/e/guideline/testsections.html) on 24 October 2026:

| Level | Vocabulary | Grammar/reading or combined knowledge/reading | Listening |
| ----- | ---------: | --------------------------------------------: | --------: |
| N5    |     20 min |                                        40 min |    30 min |
| N4    |     25 min |                                        55 min |    35 min |
| N3    |     30 min |                                        70 min |    40 min |
| N2    |   Combined |                                       105 min |    50 min |
| N1    |   Combined |                                       110 min |    55 min |

Listening duration may vary slightly with the recording. Practice template times/counts are explicitly separate from this reference.

The optional `20261024_task5_drafts.sql` fixture contains seven original N5 drafts covering kanji reading, vocabulary meaning/usage, grammar completion, sentence ordering, passage reading and information retrieval. It creates four three-minute single-question quick samples and a ten-minute two-question grammar practice subset. The ordering demonstration selects a correctly ordered full sentence; it does not claim to reproduce official item formatting. All question drafts remain unavailable until reviewed. Reapplying the fixture preserves edited/reviewed rows. N4–N1 exam content still needs authoring and review; the architecture supports those levels.

Full mocks are blocked in both UI and SQL. Only single-section practice attempts are currently enabled. Listening is unavailable: an audio FK is prepared, but no verified audio/administration/player integration has been supplied. Multi-section transitions, full-mock completeness certification, and listening verification need a subsequent focused implementation before enabling those formats.

## Verification and remaining integration

Commands used: direct Node entry points for ESLint, TypeScript, Vitest and Next; `node --test tests/database.test.mjs tests/learning-database.test.mjs tests/exams-database.test.mjs`; `node scripts/check-learning-routes.mjs`; and `node scripts/check-exam-routes.mjs`. Direct Node commands avoid relying on the user's missing global pnpm command.

Unit/render tests cover configuration validation, server authorization boundaries, timer calculations, official durations, localization parity, result grouping, accessible question navigation and pre-/post-submission rendering. PostgreSQL-compatible PGlite tests execute all actual migrations and verify ownership, private-key isolation, deadline restoration, expiry rejection, grading, deduplication, frozen history, question review, count/difficulty enforcement, draft fixture preservation, and full/listening gates. Existing database/learning regressions are retained.

Manual browser checks cover responsive center layout at 390, 768 and desktop widths, N5–N1 selection, mode changes, disabled unavailable content, and English/Japanese switching. Screenshots are in `outputs/task5-exams-mobile.png` and `outputs/task5-exams-desktop.png`.

Hosted schema migration and authenticated hosted browser acceptance remain owner setup steps; PGlite is not proof that the remote schema is deployed. No hosted test accounts or real exam attempts were created. See TASK5_SETUP.md for deployment and remaining acceptance checks. Template configuration currently uses owner SQL, while individual questions have an authenticated admin UI. JSON editing is the initial editorial foundation, not a full visual question authoring suite. No paid services, AI speaking, subscriptions, JFT implementation, or tutor marketplace were added.

## Recorded verification results

- ESLint: passed with zero warnings.
- Strict TypeScript: passed, including the production build check.
- Vitest: 46 tests across eight files passed.
- Database suite: 56 tests (22 existing baseline, 16 learning, 18 examination) passed.
- Route checks: 37 existing learning/access checks plus 10 exam/access checks passed.
- Production build: passed with all existing routes and the examination routes present.
- Responsive browser verification: 390, 768 and 1440 px without horizontal overflow; English/Japanese switching and all five level selectors verified.
- Hosted authenticated exam browser flow: not run; pending schema deployment and owner-provided reviewed content/accounts.
