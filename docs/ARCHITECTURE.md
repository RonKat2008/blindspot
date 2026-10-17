# Blind Spot — Architecture (one page)

```
 Browser (cursor)                         Next.js route handlers (codex)              Supabase (pgvector)
 ───────────────                          ─────────────────────────────              ───────────────────
 /  ──createSession──────────────────▶   POST /api/sessions ──proposeAxes()──▶ prompts ─▶ Sonnet
 /s/[id]/axes ──updateAxes───────────▶   PUT  /api/sessions/[id]/axes ─embedMany(poles)─▶ Gateway
 /s/[id] ──addIdeas─────────────────▶   POST /api/sessions/[id]/ideas                     │
   ▲          (every 3rd idea)            embed → engine/score → engine/diversity          ▼
   │                                      → engine/detect → prompts.writeProvocation ──▶ sessions, axes,
   └──getState (poll 1s: join/ambient)◀─ GET  /api/sessions/[id]/state                     ideas, provocations,
 card ──updateProvocation────────────▶   PATCH /api/provocations/[id]                       devices
 /join/[id], /ambient/[id] (stretch)      POST /api/extract (vision) · POST /api/reality (Glasser)
```

All shapes: `src/lib/contract.ts` (frozen). Frontend calls only `src/lib/api-client.ts` (mocks when `NEXT_PUBLIC_USE_MOCKS=true`).

## Data flow per route
| Route | Steps |
|---|---|
| `POST /api/sessions` | validate → insert session → `proposeAxes(prompt)` (4–6) → `embedMany` all poles → insert axes with embeddings → `{sessionId, axes}` |
| `PUT /api/sessions/[id]/axes` | validate → diff vs DB → re-embed changed poles only (`user_edited=true`) → replace axes → rescore all ideas → `{axes}` |
| `POST /api/sessions/[id]/ideas` | validate → `embedMany(texts)` → load all ideas+axes → `scoreIdeas` (z-norm over session) → insert new, update all `axis_scores` → `diversity` → if total count crossed a multiple of 3: `detect` → `writeProvocation` → insert provocation → `{ideas, allIdeas, provocation?, diversity, diversityBreakdown}` |
| `GET /api/sessions/[id]/state` | load session, axes, ideas, provocations → `pca2` for overview coords → `diversity` → `SessionState` |
| `PATCH /api/provocations/[id]` | validate status → update → `{ok:true}` |
| `POST /api/extract` | image → Sonnet vision via gateway → `{texts[]}` (confirm chips, then normal addIdeas with source 'photo') |
| `POST /api/reality` | ideaIds → Glasser search queries → `{queries, resultCounts}` |

Engine (`src/lib/engine/*`) is pure TS, no I/O; same code runs under DEMO_MODE with cached embeddings from `src/lib/demo-data.json`.
Score sign: `+1` = poleB end, `-1` = poleA end.

## Ownership
| Owner | Files |
|---|---|
| codex-codex | `src/app/api/**` (except reality), `src/lib/engine/**`, `src/lib/db.ts`, `src/lib/ai.ts`, `scripts/smoke.sh`; stretch `src/app/join/**`, `src/app/ambient/**`, `src/app/api/extract/**` |
| cursor-cursor | `src/app/page.tsx`, `src/app/s/**`, `src/components/**`, `src/app/globals.css`, `src/app/layout.tsx` |
| Claude subagents | `src/lib/prompts/**`, `scripts/eval-provocations.ts`, `src/lib/demo.ts`, `src/lib/demo-data.json`, `src/app/api/reality/**`, `src/components/reality-button.tsx` |
| Orchestrator only | `src/lib/contract.ts`, `src/lib/api-client.ts`, `src/lib/mock-state.ts`, `src/lib/motion.ts`, `docs/**`, `tsconfig.json`, `package.json` |

## Integration checkpoints
- **2:50 merge** — codex: smoke.sh green against a real session (create → 6 ideas → provocation). Prompts module real impl merged. Cursor: full flow on mocks.
- **3:10 merge** — cursor flipped to real API (`NEXT_PUBLIC_USE_MOCKS` unset); seed/DEMO_MODE in; tune detect/diversity thresholds on the seeded session; deploy.
- 3:55 stretch hard cut · 4:10 code freeze.
