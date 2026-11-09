# Homepage visual and interaction refinement

Implemented in the existing <project-root> project on 24 October 2026. No packages, authentication actions, schema migrations, RLS policies, or Supabase configuration were replaced.

## Audit and changes

The existing Fuji/Torii illustration, navy/blue identity, homepage section structure, shared UI primitives, next-intl routing, account flows, and learning engines were retained. The audit found 8–14px course/navigation/footer text, a decorative level-step graphic that could look like progress, a static vocabulary panel, and a tablet card-span rule that conflicted with the new responsive grid.

- Consistent 17px base text; 56px desktop/36px mobile hero; 30–36px section headings; 26px course titles; 16px descriptions, controls, navigation and footer links; 20–24px Japanese examples and questions; 40–46px flashcard vocabulary. Japanese system-font fallbacks remain available without external font requests.
- Reduced hero padding and preserved both main actions. Added a keyboard/touch-operable vocabulary reveal beneath the hero.
- Retained N5–N1 accent colors. Cards show level, difficulty, description, five topic indicators and a single explicit Explore Course link. Removed decorative level bars. Authenticated users see actual lesson progress only when the existing published-course query and owner-scoped progress RPC return valid nonempty data.
- Course grid: one column on phones, two on tablets, three at 1440px, five above 1500px where each card has enough room. Removed conflicting inherited tablet spans.
- Five existing curated N5 words reuse FlashcardDeck, real card IDs and saveReview. Visitors get session-only reviews. Members use the existing authenticated, idempotent save service; failures are displayed and never reported as saved. Furigana is visible on the front and back.
- MiniTest provides three original sample questions at each N5–N1 level. Answers persist while navigating between questions. Submission requires all three answers, disables controls while checking, and shows score, correct answers, explanations and furigana examples. Restart and changing level reset the attempt. Samples are not official exams or level assessments, and results are explicitly session-only.
- Question prompts/options are public; validated answer keys are in a server-only module. gradeMiniTest validates the level and three option indices and returns the keys/explanations only after submission. No database writes or remote API calls are added for samples.
- Six homepage goals immediately replace resource cards with real localized links. Future areas are marked Coming soon. This exploration is session-only; the existing dashboard goal editor remains the place to save preferences.
- A workplace dialogue offers English translation visibility, furigana, three replies and specific feedback. No nonfunctional audio controls.
- Existing native disclosure navigation retains Escape, focus and link-close behavior, with larger targets. Footer now has Learning, Japan Preparation, Institutions and Support, with stacked sections on phones.
- Focus indicators, loading/disabled states, radio groups, live feedback and reduced-motion behavior are retained or strengthened.

## Source map

Updated: src/components/home/homepage.tsx, src/components/courses/course-grid.tsx, src/components/layout/footer.tsx, src/components/flashcards/flashcard.tsx, src/components/ui/button.tsx, src/app/globals.css, messages/en.json, messages/ja.json.

Added: src/components/home/{vocabulary-peek,mini-test,goal-pathways,conversation-preview}.tsx; src/lib/learning/{mini-test,mini-test-keys}.ts; src/actions/mini-test.ts; tests/home-practice.test.ts; scripts/refine-home-messages.mjs.

## Verification

- ESLint: zero warnings/errors.
- Strict TypeScript: tsc --noEmit passed; production build also performs TypeScript validation.
- Vitest: 25 tests across four files passed, including answer-key integrity at all five levels, all-correct/all-incorrect/mixed scoring, invalid submissions and public prompt data containing no answer keys.
- Database: 22 tests passed against all six existing SQL migrations in PGlite, including owner isolation, authenticated review persistence/idempotency, grading, publication workflow and tenant/RLS boundaries.
- Production build: passed on the final source, including the last layout/label adjustments.
- Browser: checked 390x844, 768x1024 and 1440x1000. No document horizontal overflow. Hero typography measured 36px on mobile and 56px desktop; course titles 26px. Tablet has two proper columns after fixing inherited spans.
- Browser interactions: vocabulary reveal, immediate work-goal recommendations, flashcard flip, known/learn-again review counts, arrow-key next, mini-test navigation, submit disabled until complete, 3/3 score and explanations, restart, level change to N1, English/Japanese switching, mobile menu opening and Escape dismissal, dialogue translation and incorrect-reply feedback.
- All 18 checked public URLs returned HTTP 200, including N5–N1 course destinations and new resource links. The initial homepage response contains no correctIndex fields. No browser console errors were observed. Existing login and registration routes render their original fields and validation constraints. No accounts or remote records were created during testing.

Commands used: direct Node entrypoints for prettier, eslint, typescript, vitest, Next dev/build; node --test tests/database.test.mjs; local HTTP route checks; browser UI checks. The bundled pnpm executable is outside the user's normal PowerShell PATH, so direct Node entrypoints were used. Native compiler/build and localhost HTTP checks needed approved execution outside the Windows sandbox. No protections were disabled.

## Limits and next task

Hosted authentication lifecycle and signed-in homepage progress/review saving were not tested with a real account in this task. They depend on the previously documented Supabase migrations and email configuration. Existing server authorization and RLS are reused, and the database tests cover their persistence contracts. This task performs no remote migration or membership changes.

The fifteen sample items and explanations are version-controlled and reviewable; this is not a claim of independent human editorial approval. Have a Japanese educator review level alignment, distractors and wording before describing them as reviewed exam preparation content. English explanations are intentionally labeled as English in both interface languages.

Next recommended task: complete a staging account/email/review-save walkthrough with the deployed migrations, followed by educator approval of the sample question bank.

Preview: http://localhost:3000/en (dev server must be running). Screenshots are in outputs/home-refined-desktop.png and outputs/home-refined-mobile.png.
