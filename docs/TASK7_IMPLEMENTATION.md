# Task 7 — Text conversation tutor

## Audit and reuse

The existing project uses Next.js App Router, strict TypeScript, next-intl English/Japanese routing, shared buttons/navigation, Supabase SSR cookies and verified `auth.getUser()` identity. Profiles, goals and learning dashboards already exist. Flashcards, quizzes, reviewed lessons, workplace scenarios and the JLPT examination center are retained. There was no AI provider integration. The architecture already had `ai_scenarios` and a future `ai_roleplay_sessions` contract; this migration extends the existing scenario table and preserves legacy roleplay records.

## Implementation

- `/en/ai-practice` and `/ja/ai-practice`: six scenario cards, level N5–N1, correction timing, translation/readings preferences and 5/10/15 learner-turn targets. Text is the only implemented modality.
- `src/components/ai/tutor.tsx`: conversation composer, private history/resume/delete, corrections, vocabulary, useful expressions, summary and published lesson recommendations. Session configuration is fixed after starting; display preferences remain editable. Preferences have an explicit authenticated Save action.
- `src/lib/ai/`: strict input/output schemas, original scenario definitions, explicitly scripted demo, provider adapter, server configuration, typed persistence and server loaders. The demo evaluates only its named sample sentences; arbitrary text is labeled unassessed.
- `src/app/api/ai/route.ts`: same-origin mutations, verified user identity, bounded JSON input, owner-scoped reads and trusted writes. No client-supplied user identity, transcript history, feedback, usage or model is accepted.
- `202610240007_ai_tutor.sql`: extends `ai_scenarios`; adds `ai_sessions`, `ai_messages`, `ai_feedback`, `ai_usage`, `ai_user_settings`. All 52 public tables now have RLS. Private transcripts have owner reads/deletion; trusted generation writes use server-only RPCs granted to `service_role`, not learners or ordinary administrators.
- `20261024_task7_scenarios.sql`: separate original scenario definitions, inserted without overwriting existing definitions. No learner data is included.

The Responses API adapter uses the official `openai` SDK (installed stable version 7.43.0), explicit environment-selected model, structured JSON output, runtime validation, `store: false`, 1,400 output tokens, 25-second timeout and zero automatic retries. No provider calls were made during implementation. Default configuration disables live AI. Missing provider/database configuration exposes an explicitly unsaved scripted demo, never a fake live response.

Every reply is a server-controlled turn with an atomic reservation. The database serializes reservations per learner, rejects overlapping requests and deduplicates successful retries. Failures release the pending turn while still consuming request quota. Stale reservations can recover after 90 seconds; a late old response cannot overwrite a newer turn. Targets end sessions after at most 15 learner replies. Context comes from the saved owner transcript, with bounded message count/size.

Corrections distinguish grammar, wording, register, correct language and non-Japanese guidance; uncertain demo input is unassessed. Correct/register output cannot carry a grammar correction. Explanations use the saved interface language. These checks validate structure and consistency, not linguistic truth; live model accuracy still requires educator evaluation. No JLPT score or validated proficiency rating is generated.

Japanese messages use 22–23px text. Reviewed original openings can contain explicit ruby readings. Generated messages and feedback render as plain text, with no automatic segmentation or invented furigana. There are no microphone buttons, audio capture or raw audio storage. Transport/speech interfaces define future extension points only.

## Privacy and cost boundaries

Signed-in live practice sends learner text and bounded context to OpenAI and saves transcripts privately in Supabase. The interface explains this before starting. Transcript deletion cascades messages and feedback. Non-content usage metadata remains to enforce quotas and monitor costs; it contains no transcript text. API errors and credentials are not rendered or logged by the application.

Hard limits are six generation reservations per minute and thirty per UTC day per learner. Failed/pending requests count. Usage displays actual reported tokens and optional configured-rate dollar estimates; unreported failed/pending usage is explicitly a lower bound. Provider billing remains authoritative. Model prices are not hardcoded. The feature switch disables new generation while owner history/deletion remain available.

## Official references checked during implementation

- [Structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs)
- [Official TypeScript SDK](https://developers.openai.com/api/reference/typescript)
- [Current model catalog](https://developers.openai.com/api/docs/models)

The catalog checked on 2026-10-24 listed `gpt-6-luna` as a cost-sensitive text option. The application has no model fallback: the owner must set `OPENAI_MODEL` after checking current availability, pricing and Structured Outputs support. This avoids silently selecting a stale model. See [setup and remaining acceptance](TASK7_SETUP.md).
