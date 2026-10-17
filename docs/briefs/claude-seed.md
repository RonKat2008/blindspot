# Brief: Claude subagent (haiku) — DEMO_MODE seed (time box: 2:30)

## Goal
`DEMO_MODE=true` must render the full canvas offline: a seeded onboarding session with cached embeddings, canned axes and canned provocations.

## Files you own
`src/lib/demo.ts` (keep existing exports `isDemoMode`, `cannedReply`, `streamText`, `CANNED_AI_REPLIES`), `src/lib/demo-data.json`, `scripts/seed.ts`.
## Do NOT touch
`src/lib/contract.ts`, `src/app/**`, `src/lib/engine/**`, `src/lib/prompts/**`, `.env*`, `supabase/`.

## Steps
1. `scripts/seed.ts`: prompt "How might we improve onboarding for new users?"; the 5 axes and 9 idea texts from `src/lib/mock-state.ts` plus 4 "answer" ideas that land on the radical/social side (e.g. user-written: "Buddy system pairing new users with veterans") — these are demo-script ideas the human types, not AI output. Embed all idea texts and all 10 pole strings with `embedMany({ model: "openai/text-embedding-3-small", values })` from `ai`; write `src/lib/demo-data.json` `{ prompt, axes:[{id,poleA,poleB,poleAEmbedding,poleBEmbedding}], ideas:[{id,text,embedding}], extraEmbeddings: { [text]: number[] } , provocations: [...] }`. Run: `node --experimental-strip-types --env-file=.env.local scripts/seed.ts`. Round floats to 5 decimals to keep the JSON small.
2. `demo.ts` exports: `DEMO_PROMPT`, `demoAxes()`, `demoIdeas()`, `demoEmbeddingFor(text): number[] | null` (exact-text lookup, else null), `demoProvocation(type)` (canned safe question per PatternType).
3. Check: with mock-like scoring (cos(e,poleB) − cos(e,poleA), z-normalized), the 9 seeded ideas leave the radical + social quadrant empty. If not, report which axes misbehave.

## Acceptance
`demo-data.json` < 1.5 MB, `npm run verify` green, commit `feat: DEMO_MODE seed with cached embeddings`.
