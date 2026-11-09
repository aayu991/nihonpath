# Task 7 — Setup and acceptance

## Deploy schema and scenarios

Back up and inspect migration history. Apply all previously unapplied migrations in filename order. After Task 6's twelve migrations, apply once:

`supabase/migrations/202610240007_ai_tutor.sql`

Then import the initial scenario definitions:

`supabase/seeds/20261024_task7_scenarios.sql`

Use your normal Supabase migration process or project SQL Editor. A publishable key cannot migrate schema. No hosted migrations, accounts, admin grants or content edits were performed by the agent.

The migration adds five tables and extends the existing `ai_scenarios` with nullable unique slug and original display/opening fields. Legacy scenarios and `ai_roleplay_sessions` remain intact. New constraints/indexes can require locks; test in staging and schedule deployment appropriately. Supabase's existing `service_role` must be present when migration grants are applied. No client receives its privileges. Roll back application code before considering any structural rollback; preserve saved sessions and make a backup rather than dropping tables.

The separate seed inserts six published role definitions without overwriting existing rows. These are original language role-play settings, not certified assessment content. Inspect their Japanese, prompts, accessibility and cultural context before public use. Further scenarios can be added by trusted owner SQL using the same columns. Keep prompt templates below 2,000 characters and openings below 1,200 characters. Unpublish a scenario to prevent new sessions and generation on it; existing owner transcripts remain readable.

## Server-only configuration

Add these values to ignored `.env.local` or the hosting secret manager. Never paste private keys into chat or put them in `NEXT_PUBLIC_*` variables:

```dotenv
AI_TUTOR_ENABLED=false
OPENAI_API_KEY=your-private-project-key
OPENAI_MODEL=your-current-supported-model
SUPABASE_SECRET_KEY=your-server-only-supabase-secret-or-service-role-key
```

Keep existing Supabase URL/publishable-key/site URL configuration. The additional server secret is needed so authenticated learners cannot forge AI responses or usage through public RPCs. Its client is created only in the server-only AI module; it is never serialized into page props.

Select a currently supported Responses API model with Structured Outputs using the official model catalog. `gpt-6-luna` was listed as a cost-sensitive choice when checked on 2026-10-24; verify account availability and current pricing before setting it. No model is hardcoded or automatically substituted. The implementation uses the model's default reasoning settings, so check latency and output-token sufficiency with your chosen model before release.

Optionally configure current `OPENAI_INPUT_USD_PER_MILLION` and `OPENAI_OUTPUT_USD_PER_MILLION` rates. Without both valid rates, the UI shows token usage and no invented dollar amount. Estimates do not include every billing factor; failed/incomplete requests can have unreported usage. Check the provider dashboard for actual billing and configure project budgets/alerts there.

After staging verification, set `AI_TUTOR_ENABLED=true` and restart the server. Set it back to `false` and restart to stop generation. Never enable the flag just to hide missing configuration. Missing secrets/model/schema leave live practice unavailable; the clearly labeled scripted demo remains the local preview when the preparation schema is absent. A deployed catalog with no published scenarios intentionally remains empty until seeded/published.

## Usage, deletion and recovery

Six requests/minute and thirty requests/UTC day are hard database generation limits; lower or higher product quotas require an explicit reviewed migration. Maximum input is 1,200 characters, session target fifteen replies, provider output 1,400 tokens, and request timeout twenty-five seconds. There are no automatic paid retries. Reopen the transcript after a connection interruption before retrying; successful request IDs replay saved results. A pending reservation expires after ninety seconds so a new request can recover. Session creation is capped at twenty retained sessions created in the preceding day.

History contains the thirty most recent retained sessions. Deleting a transcript removes its messages and feedback, while token/model/status/time metadata remains until account deletion for quota enforcement. Account deletion cascades owner data. `store: false` controls Responses storage; it is not a promise of zero retention under every provider policy. Review current provider data controls and your privacy notice before public launch. No microphone/audio data is collected.

## Required hosted acceptance

The local SQL tests and mocked API tests do not prove hosted credentials, email setup or live model quality. With two staging accounts, verify:

1. Start N5 daily practice and send Japanese; inspect simple, relevant, concise responses.
2. Start N2 business practice; inspect register, vocabulary and one-question follow-ups.
3. Compare a grammar error with a correct informal sentence; have an educator check categorization and explanation accuracy in both interface languages.
4. Toggle English and reviewed readings; confirm generated text has no fabricated readings.
5. Complete and end sessions early; inspect actual summary/vocabulary/published lesson links.
6. Open saved history, refresh its `?session=` URL, resume, save preferences and sign out/in.
7. Verify the second account cannot read or mutate the first account's session/messages/feedback/usage. Try ordinary learner RPC writes and cross-origin API requests.
8. Delete a disposable transcript with confirmation and verify messages/feedback disappear while quota usage remains. Check deletion during a pending reply does not recreate the session.
9. Exercise minute/day quotas, disabled feature, provider 429, timeout, refusal, incomplete/invalid structured output and persistence failures. Ensure no automatic extra provider requests occur and drafts remain available.
10. Test your chosen model's actual latency, token use and cost. Only then consider a separate voice task using current speech/Realtime documentation.

No paid subscriptions, booking systems, employer dashboards or real-time voice were added.
