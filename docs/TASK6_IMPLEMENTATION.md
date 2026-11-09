# Task 6 — JFT-Basic and SSW foundation

## Existing project audit

The project already contained Next.js App Router, English/Japanese routing, shared navigation/footer/buttons, Supabase SSR authentication and recovery, editable onboarding, owner-scoped dashboards, private administrator membership, and reviewed program/course/module/lesson/translation editing. The learning engine provided flashcards, spaced repetition, lesson completion and server-scored quizzes. The examination center provided JLPT-only timed attempts, private question snapshots and result/mistake review. Those flows are retained.

The previous ten migrations provided 43 public RLS tables, including profiles/preferences, curricula, vocabulary/decks/cards/reviews, question banks/options/attempts, learning goals, organizations/memberships and future service contracts. JFT/SSW navigation previously led to category placeholders. Missing infrastructure included an extensible industry taxonomy, workplace dialogues, interview examples, dated official resources and preparation-specific dashboard aggregation.

## Added architecture

- `/[locale]/jft-basic`: seven non-audio categories with quick and section practice using the existing quiz engine. Listening and full simulation are explicitly unavailable pending reviewed audio and examination integration. The current official section-review rules are explained; ordinary practice is not presented as an official simulation.
- `/[locale]/ssw` and `/ssw/[slug]`: database-driven tracks, vocabulary, dialogue practice, industry quizzes and dated official links. `/flashcards` and `/practice` reuse existing learning engines.
- `/[locale]/workplace-japanese`: navigate six dialogue scenarios with furigana and translation controls.
- `/[locale]/interview-preparation`: thirteen examples, industry filters, personal draft, reveal/reset/navigation, and authenticated completion for published lessons. Personal answer text stays in client state and is not uploaded.
- `/[locale]/admin/preparation`: administrator-only structured draft editing, review transitions, publication, audit display and private audio upload/playback review. Existing course, question, vocabulary and deck editors gain preparation metadata through a wrapper RPC.
- JFT, SSW and workplace goals feed deterministic recommendations. Goals never create administrative or organization membership. Progress and weak areas come from actual owner records.

`src/lib/preparation/` separates server-only content/keys, strict schemas, database types, audio signatures and server queries. `src/components/preparation/` provides shared notices, practice selection, scenarios, interviews, progress and administration. Server loaders batch catalog queries and use request-scoped caching. Answer keys are excluded from initial client quiz props; server grading returns explanations after submission.

The two additive migrations add four RLS tables (47 total), preparation metadata, guarded parent relationships, review/audit RPCs, owner-scoped aggregation and a private storage bucket. They preserve existing tables and records. The separate optional seed contains 70 original JFT section questions (quick sets reuse a subset), 60 vocabulary entries across six tracks, six scenario questions, thirty industry quiz questions, thirteen interviews and nine official resources. All imported content remains Draft and unpublished; no independent educator approval is claimed.

## Boundaries

Bundled original content is available as an explicitly unsaved draft preview when the preparation schema is unavailable. A valid deployed catalog with no published rows stays empty; it does not silently show unpublished rows as live content. Published account activity uses existing authenticated persistence. Hosted migrations, email confirmation, authenticated browser journeys and real administrator uploads have not been verified against the remote project.

No paid service, AI speech, payments, tutor workflow, employer reporting or immigration eligibility judgment is implemented. Six industry tracks are an educational starting subset, not a complete official field list. Official links were checked on 2026-10-24; dates and sector notices must be reviewed before publication. Audio supports private asset review only, not listening examinations.

See [deployment and review instructions](TASK6_SETUP.md). Source generators in `scripts/generate-preparation-*.mjs` reproduce the original draft catalog and seed; editing reviewed database content does not require regeneration.
