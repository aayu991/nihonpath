# Task 13 verification — 2026-10-29

All verification described here is local. Hosted database migrations and administrator role assignments were not performed. No real Storage upload, Auth ban, scheduled provider job, payment or deployment was executed.

## Commands and evidence

```powershell
pnpm add sharp@0.35.5
node scripts/check-migrations.mjs
node node_modules/eslint/bin/eslint.js . --max-warnings=0
node node_modules/typescript/bin/tsc --noEmit --incremental false
node node_modules/vitest/vitest.mjs run
pnpm test:db
node --test tests/cms-database.test.mjs
node node_modules/vitest/vitest.mjs run --config vitest.cms-visual.config.mts
pnpm audit --prod --json
node node_modules/next/dist/bin/next build
node node_modules/next/dist/bin/next start --port 3000
node scripts/check-launch.mjs
node node_modules/@playwright/test/cli.js test
```

Sharp 0.35.5 was already a transitive dependency; it is now a declared production dependency for actual image decoding and normalization. Offline resolution lacked cached metadata, so the declared version was resolved normally. Existing Next.js 16.4.2 / React 19.3.1 were preserved. No paid service was added.

| Check | Result |
|---|---|
| Strict TypeScript / Next production TypeScript phase | Passed |
| Lint, zero warnings | Passed |
| Optimized production build | Passed, exit 0 |
| Unit tests | **189 passed, 26 files** |
| Complete disposable database regression suite | **181 passed, zero failures/skips** |
| Focused CMS database suite after final permission hardening | **19 passed** |
| Migration manifest | **24 checksums match**, historical migrations unchanged |
| Public table RLS | **101 public tables protected** |
| Existing HTTP/security/SEO launch checks | **74 passed** |
| Production-preview Playwright suite | **9 passed, zero skips**, 54.4 seconds |
| Isolated CMS component visual/accessibility check | Passed at five widths |
| Production dependency advisory scan | Zero reported vulnerabilities at scan time |

The final focused role-assignment hardening rechecks authority after its transaction lock and protects the last verified Super Admin. The focused 19-case suite passed again after that SQL-only change. This does not turn the advisory scan into a guarantee of vulnerability absence or the local build into a deployed release.

## Database behaviors actually verified

- Anonymous, ordinary and unverified accounts cannot read/edit CMS content or assign roles. Even an unverified legacy allowlist member does not become an administrator. Content roles never gain legacy platform-wide admin privileges.
- Editors create N5 grammar drafts that do not appear in anonymous lesson queries. A separate reviewer approves, then an authorized publisher projects the approved content into the existing learner tables.
- Editing an already published lesson preserves the public revision. Publication replaces it transactionally. Stale revisions fail. History restore creates a draft. Unpublishing withdraws public access and removes the editor's live-view link.
- Public vocabulary publication writes real flashcard rows; withdrawing it hides managed cards while retaining historical data. CSV preview detects existing duplicates, validates Japanese/required fields and creates private drafts only.
- Kanji uses published-only RLS. Draft edits do not overwrite a public entry; related lessons must belong to the same course and be published.
- Private answer keys stay private. A reviewed bank assembles a real supported practice examination; the started attempt DTO has questions/options without correct-answer fields.
- A future scheduled revision stays private. A trusted due-work worker publishes it; revoked publisher assignments fail closed and are audited.
- Media registration is service-only. Private/approved-but-unattached assets are not publicly resolved. Only accessible published associations permit public delivery; referenced assets cannot be archived. Withdrawn lesson associations stop public delivery. Reviewed guides can expose their approved media under the same guide visibility rules.
- Source verification, Japanese guide translation, independent review notes and explicit additional source-review attestation are enforced for sensitive guides. Actual last-reviewed timestamps are stored.
- Course premium requirements are inherited, and making a course free **does not remove independent lesson billing requirements**. No entitlement or financial transaction is fabricated.
- User-directory access is restricted and audited. No password/token fields are returned. Private projection functions and trusted workers cannot be invoked by normal client roles.

The tests use complete migration replay in disposable PGlite, actual grants/RLS/functions and explicit fake **test accounts/content only**. They do not authenticate to hosted Supabase or grant real people roles.

## Browser and visual checks

The production-preview suite checks home, help, pricing and tutors at **360, 390, 768, 1024 and 1440px** for horizontal overflow and critical/serious axe issues. It also verifies all four interface language switches, keyboard FAQ/flashcard controls, pre-consent analytics silence, and unauthorized billing/support/worker access.

The new CMS browser case verifies unauthenticated admin/lesson/user access in all four locales, the other new admin category routes, and unauthorized media-upload/publishing-worker requests. No editorial data is exposed.

CMS components are separately rendered from a disposable database fixture and checked at those same five widths. The generated HTML/screenshots prominently say **DISPOSABLE TEST FIXTURE — static component render; not a signed-in production session**. This checks actual component markup, layout and axe behavior; it does not claim hosted authentication or button-action integration. There are no critical/serious axe failures or horizontal overflow in those checked states. Desktop/mobile screenshots were visually inspected.

Evidence is in ignored `outputs/task13-*`, including:

- `task13-build.log`, `task13-lint.log`, `task13-types.log`
- `task13-unit.log`, `task13-full-database.log`, `task13-database.log`
- `task13-http.log`, `task13-e2e.log`, `task13-dependency-audit.json`
- `task13-admin-visual.log`, `task13-admin-axe-*.json`
- `task13-admin-390.png`, `task13-admin-1440.png`

Automated axe coverage is not a WCAG certification. Populated, signed-in provider workflows still need real assistive-technology and staging acceptance. Task 12's unresolved mobile performance work remains; no new Lighthouse or field-INP claim is made in this task.

## Hosted acceptance still required

| Scenario | Status |
|---|---|
| Owner applies approved missing migrations and bootstraps the verified Super Admin | Not performed; explicit approval/owner SQL required |
| Real administrator signs in through Supabase Auth | Pending designated verified staging accounts |
| Separate editor → reviewer → publisher browser journey | Database workflow passes; hosted browser acceptance pending |
| New public lesson/flashcard/quiz seen through the hosted website | Local DB projections/queries pass; hosted migration/content acceptance pending |
| Real upload, private preview, normalized image and listening playback | Signature/decode/RLS tests pass; hosted Storage credentials/bucket acceptance pending |
| Physical provider deletion and replacement operation | Protected implementation provided; no hosted file was deleted |
| Real account suspension/restoration | Protected Auth API integration provided; no real account modified |
| Automatic scheduled publishing | SQL worker/due-time/revocation tests pass; external scheduler not installed, flag remains off |
| Full official-style/listening examination formats | Existing availability limits preserved; not activated |
| Domain/HTTPS/production deployment | Domain supplied by owner; no deployment or DNS change performed |

Activate through the reviewed procedure in `TASK13_ADMIN_CMS.md`. Do not equate local evidence with a completed hosted rollout. No authentication bypass, demo admin account or public administrator registration endpoint was introduced.
