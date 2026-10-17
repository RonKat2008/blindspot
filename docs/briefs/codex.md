# Brief: codex-codex — backend + engine (time box: done by 2:50, stretch until 3:55)

## Goal
Make every route in `src/lib/contract.ts` real: sessions, axes, ideas (with scoring, diversity, detection every 3rd idea, inline provocation), state, provocations. Then the stretch pages.

## Read first
`AGENTS.md` (agentteams rules), `docs/ARCHITECTURE.md`, `src/lib/contract.ts` (frozen — do not edit; message the orchestrator if it must change), `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md` (Next 16: `params` is a Promise — `{ params }: { params: Promise<{ id: string }> }`, `const { id } = await params`).

## Files you own (claim_files these)
`src/app/api/sessions/**`, `src/app/api/provocations/**`, `src/app/api/extract/**`, `src/lib/engine/**`, `src/lib/db.ts`, `src/lib/ai.ts`, `scripts/smoke.sh`. Stretch: `src/app/join/**`, `src/app/ambient/**`.
## Do NOT touch
`src/lib/contract.ts`, `src/lib/api-client.ts`, `src/lib/mock-state.ts`, `src/lib/prompts/**`, `src/lib/demo*`, `src/app/api/reality/**`, `src/components/**`, `src/app/s/**`, `src/app/page.tsx`, `globals.css`, `layout.tsx`, `.env*`, `supabase/`.

## Facts
- DB: Supabase project `janvsokxxofdsaxgpwbt`, tables already exist: `sessions(id, prompt, team_name, created_at)`, `axes(id, session_id, pole_a, pole_b, pole_a_embedding vector(1536), pole_b_embedding vector(1536), user_edited, position)`, `ideas(id, session_id, text, speaker, source, device_id, embedding vector(1536), axis_scores jsonb, created_at)`, `provocations(id, session_id, type, text, why, idea_ids uuid[], axis_id, status, created_at)`, `devices(id, session_id, role, capabilities text[], speaker_name, last_seen)`. Permissive anon RLS.
- `db.ts`: plain `createClient` from `@supabase/supabase-js` with `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, created inside a function. Pass embeddings as `JSON.stringify(vec)`; they come back as strings → `JSON.parse`. Map snake_case ↔ camelCase contract types. `provocations.why` column is text: store `why.explanation`; rebuild `why` from `type`, `idea_ids`, `axis_id`.
- `ai.ts`: `embed`/`embedMany` from `ai` with `model: "openai/text-embedding-3-small"` (string, via Vercel AI Gateway, `VERCEL_OIDC_TOKEN` in `.env.local`). Structured output: `generateText({ model, output: Output.object({ schema }), prompt })` → `result.output`.
- Prompts: import `{ proposeAxes, writeProvocation }` from `@/lib/prompts` (stub returns templates now; real impl lands later with identical signatures — both never throw).
- Engine stubs in `src/lib/engine/{score,detect,diversity,project}.ts` contain the exact algorithm and threshold constants in doc comments. Implement them as written. Score sign: +1 = poleB.
- Detection: after inserting, if `floor(total/3) > floor((total - newCount)/3)` run `detect` with `lastType` = latest provocation type; if a signal comes back, `writeProvocation`, insert with status `shown`, return inline as `provocation`.
- DEMO_MODE (`process.env.DEMO_MODE === "true"`): if `src/lib/demo.ts` exports cached embeddings, use them instead of the gateway; coordinate via orchestrator, don't edit demo files.

## Steps
1. `agentteams worktree <task>`; claim files.
2. Engine + tests: `src/lib/engine/*.test.ts` using `node:test` + `node:assert`. Run with **`node --test --experimental-strip-types src/lib/engine/`** (verified working on installed Node v22.23; tsx is NOT installed). Engine files must only use `import type` from outside the engine and `.ts` extensions for engine-internal imports (tsconfig has `allowImportingTsExtensions`). Each of 5 patterns fires on a constructed case and stays quiet on a balanced case.
3. `ai.ts`, `db.ts`.
4. Routes in order: POST sessions → GET state → POST ideas → PATCH provocation → PUT axes → POST devices. Validate bodies with the zod schemas in contract (`safeParse`), 400 `{error}` on failure, 404 for unknown session, 500 `{error}` with a safe message otherwise.
5. `scripts/smoke.sh` (curl + jq, `BASE=${BASE:-http://localhost:3000}`): create session → 6 ideas in two posts of 3 → GET state → assert ≥1 provocation.
6. `npm run verify`, commit (`feat: …`), `agentteams done <task> -m "…"`, release files.
7. Stretch (only after 6): `/join/[id]` (mobile page: name field, text input, photo capture → `/api/extract` → confirm chips → addIdeas with source 'photo'), `/api/extract` (Sonnet `anthropic/claude-sonnet-5-5` with image part, returns short sticky-note texts), `/ambient/[id]` (polls `api.getState` every 1s; spec in `docs/DESIGN.md` §7). Use `src/lib/api-client.ts` from the pages.

## Acceptance
`bash scripts/smoke.sh` against `npm run dev` prints a provocation; `node --test --experimental-strip-types src/lib/engine/` green; `npm run verify` green. Commit small and often.
