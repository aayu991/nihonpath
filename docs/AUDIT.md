# Existing implementation audit — 23 October 2026

## Existing code preserved

- Public homepage: `components/home/homepage.tsx`, vector Japan illustration, shared Brand/Header/Footer, SectionHeading, shadcn-style Button/Card, course cards and N5–N1 navigation.
- Localized App Router shell and messages: English and Japanese with typed next-intl navigation/request/proxy configuration. Existing URLs include `/[locale]`, `/courses`, `/courses/[level]`, `/login`, `/register`, `/forgot-password`, `/reset-password`, `/auth/confirm`, `/dashboard`, `/dashboard/profile`, `/admin`, and placeholder vocabulary/grammar/business/life pages.
- Interactive decks: FlashcardDeck, Flashcard, Controls, Progress, Results; 10 N5 and 10 N4 vocabulary examples, ruby/rt furigana, keyboard controls, idempotent review IDs.
- Quiz: Start/Question/Progress/Navigation/Submit/Results/AnswerExplanation; 20 N4 questions; answer keys imported through a server-only boundary, PostgreSQL scoring RPC for account attempts, visitor scoring on the server.
- Supabase: cookie-based browser/server clients, proxy token refresh, server user verification, registration/email verification/login/logout/password reset/profile actions. These are implemented code paths; delivery of real verification mail and a complete hosted account lifecycle were not verified in the earlier work.
- Dashboard: owner-filtered real progress, reviews, attempts and SQL summary; explicit empty and database-error states.
- Admin: only a membership check and status message, not a content manager.

## Existing database migrations

`202610220001_foundation.sql`, `202610220002_curated_content.sql`, and `202610220003_dashboard.sql` define profiles, courses, lessons, lesson_progress, flashcard_decks, flashcards, flashcard_reviews, question_banks, questions, question_options, quiz_attempts and quiz_answers. Private tables hold administrator membership and answer keys. RLS separates private learner records; public content reads depend on publication; scoring and review RPCs validate identity. Users cannot edit private admin membership.

## Gaps and implementation decisions

- Add an independent program taxonomy and nullable links on existing courses; keep existing IDs, slug URLs, reviews and attempts.
- Relax the old N5–N1-only course slug constraint through a versioned migration, preserving the existing level routes separately.
- Add modules, reusable lesson blocks, translations, review/publication lifecycle and admin mutation RPCs.
- Store multiple self-selected goals separately from all permission/membership tables. New and existing accounts can complete onboarding, and edit it later.
- Add tenant-scoped organizations and memberships; selection of an employer/teacher goal grants no organizational or global privileges.
- Add minimal relational contracts for audio, AI sessions, examinations, tutor bookings, attendance, reports and informational checklists. Do not expose nonfunctional launch/book/pay/audio actions.
- Retain existing learning widgets and add composed cards/modules/progress/preview components.
- Document hosted migration status separately from local SQL/RLS tests. A publishable key cannot run schema migrations.

## Verification baseline

The preceding work had eight scoring/validation tests and twelve local PostgreSQL/RLS tests passing. Its final UI/build verification was interrupted on the slow G: filesystem. This task reruns the checks against the expanded implementation rather than assuming that earlier build succeeded.
