# Blind Spot: build plan and team assignments

## Context
- **Event:** "Build Something AI Cannot Do Alone @ Cal". Hacking started at 1:30, the expo is at 4:30 and the top 5 present at 5:15.
- **Rubric:** taste, creativity and judgment. Judges come from Google Labs/DeepMind and Amazon.
- **Product:** Blind Spot maps a brainstorm onto named axes and asks provoking questions about gaps. The AI never suggests an idea.
- **Team:** `dthacks` agentteams team in `~/Projects/dthacks` (currently empty apart from AGENTS.md and CLAUDE.md). Agents are `ronit-claude` (orchestrator, me), `codex-codex` and `cursor-cursor`.
- **Starting point:** reuse `~/hackathon-template` (Next.js 16, shadcn, Supabase clients, DEMO_MODE pattern, `npm run verify`, Vercel).

## What I'm changing in your plan, and why

1. **Use Supabase + pgvector instead of Neon.** The template already has the clients (`src/lib/supabase/{client,server}.ts`) and the Supabase MCP is connected. That saves about 20 minutes of wiring. Neon adds nothing to the judging. Reply "keep Neon" and I'll switch back.
2. **Make the map meaningful by plotting on axes.** The primary view is a scatter with X = axis A score and Y = axis B score, and the user picks which two axes to show. Empty quadrants then mean something, so the gap is visible and the provocation has a picture to point at. PCA stays as an "overview" toggle.
   - Drop UMAP: it is unstable below about 15 points, which is the demo's size.
3. **Run detection as pure TypeScript.** It works on in-memory vectors (`lib/engine/*.ts`) and doesn't use SQL. A session has fewer than 50 ideas, so there's no reason to use pgvector queries here. The engine can be unit-tested with fixture embeddings and runs identically in DEMO_MODE. pgvector is only for storage and the cross-session query.
4. **Guarantee a provocation always appears, and never a suggestion.**
   1. The LLM writes the question (structured output: `{question, referencedIdeaIds}`).
   2. A Haiku-class judge returns `{containsSuggestion: boolean}`.
   3. Then a regex blocklist runs ("try", "you could", "consider adding", "what about a …").
   4. If any check fails, a deterministic **template question** for that pattern is filled with the user's own idea text and axis names.
   - Outcome: the demo can't break on a bad generation, and the one rule holds.
5. **Add a fifth pattern, "Unexplored axis."** If an axis has every idea within ±0.15 of neutral, nobody has taken a position on it. This is cheap to add and the provocation reads well: "None of your ideas pick a side on *individual ↔ social*. Which side is this problem really on?"
6. **The judge's own blind spot is the demo.** Add a **"Reveal" moment**:
   - When the person accepts a provocation and adds an idea in the gap, the new point animates into the empty quadrant and the diversity score counts up visibly (for example 41 → 58).
   - That is the screenshot moment, so put polish effort here, not on general UI.
7. **Show the reasoning.** Each provocation card has a "why?" disclosure listing the pattern, the referenced ideas (highlighted on the map) and the axis. This covers the "legible system logic" principle at almost no cost.
8. **Show the human/AI split.** The end-of-session summary includes a ledger: "You wrote 14 ideas. AI wrote 0 ideas and asked 4 questions; you took 3." This is the thesis as a single line.
9. **Models, all through the Vercel AI Gateway (AI SDK `ai` package):**
   - **Embeddings:** `openai/text-embedding-3-small` (1536 dimensions).
   - **Axes and provocations:** `anthropic/claude-sonnet-5-5`.
   - **Suggestion checker:** `anthropic/claude-haiku-5-5`.
   - **Photo-to-ideas (stretch):** a vision model through the gateway.
   - Confirm all of these in the gateway model list in the first 10 minutes. If embeddings aren't available, call OpenAI directly.
10. **DEMO_MODE covers everything.** `src/lib/demo.ts` holds a pre-seeded onboarding session with its embeddings cached as JSON, so the map, detection and canned provocations all work offline.
11. **Stretch order is unchanged** (devices → Glasser → cross-session mock), with these scope cuts:
    - Device sync uses polling on `/api/sessions/[id]/state`.
    - The ambient screen is just `/ambient/[id]`, a full-screen page whose background hue comes from the diversity score.
    - The Glasser integration gets one server route and one button.

## Architecture (frozen contract, written first in `src/lib/contract.ts`)

```ts
type Axis = { id: string; poleA: string; poleB: string; userEdited: boolean }
type Idea = { id: string; text: string; source: 'typed'|'voice'|'photo'; speaker?: string;
              x?: number; y?: number; axisScores: Record<string, number> } // -1..1
type PatternType = 'gap'|'fixation'|'duplicate'|'abandoned'|'unexplored'
type Provocation = { id: string; type: PatternType; text: string; ideaIds: string[];
                     axisId?: string; why: string; status: 'shown'|'accepted'|'dismissed' }
type SessionState = { session: {id; prompt; teamName}; axes: Axis[]; ideas: Idea[];
                      provocations: Provocation[]; diversity: number }
```

| Route | Body | Returns |
|---|---|---|
| `POST /api/sessions` | `{prompt, teamName}` | `{sessionId, axes}`: proposes 4–6 axes and embeds their poles |
| `PUT /api/sessions/[id]/axes` | `{axes}` | `{axes}`: re-embeds any edited poles |
| `POST /api/sessions/[id]/ideas` | `{texts[], source, speaker?}` | `{ideas, provocation?}`: embeds, scores, and runs detection after every 3rd idea |
| `GET /api/sessions/[id]/state` | – | `SessionState` (also used for device polling) |
| `PATCH /api/provocations/[id]` | `{status}` | `{ok}` |
| `POST /api/extract` (stretch) | `{imageBase64}` | `{texts[]}` for the confirm chips |
| `POST /api/reality` (stretch) | `{ideaIds}` | `{queries, resultCounts}` from Glasser |

**Engine** (`src/lib/engine/`, pure, no I/O):
- `score.ts`: an idea's axis score is cos(e, A) − cos(e, B), z-normalized across the session and clipped to ±1.
- `detect.ts`: the 5 patterns, each returning `{type, strength, ideaIds, axisId}`. The strongest signal wins, with a cooldown so the same type doesn't fire twice in a row.
- `diversity.ts`: 0–100 score. 60% comes from mean pairwise cosine distance, rescaled using a calibration range taken from the seed set. 40% comes from axis-end coverage (share of axis ends that have at least 2 ideas).
- `project.ts`: axis-pair projection plus a small PCA.

**DB** (`supabase/migrations/0001_blindspot.sql`):
- **Tables:** `sessions`, `axes`, `ideas` (`embedding vector(1536)`, `axis_scores jsonb`), `provocations`, `devices`, as in your plan.
- **RLS:** permissive anon policies scoped by `session_id`. This is a demo with no auth.
- **Server access:** API routes use the service role.

## Team task assignments (agentteams)

The orchestrator does Task 0 alone so the contract exists before anyone forks. After that, tasks 1–3 run in parallel in their own worktrees (`agentteams worktree`), each with **non-overlapping file claims**.

| # | Task | Assignee | Owns (claim_files) | Done when | Due |
|---|---|---|---|---|---|
| 0 | Scaffold from the template into dthacks; write `contract.ts`; add the `ai` dependency and env vars; create the Supabase project and migration; first Vercel deploy | **ronit-claude** (me) | everything (before the fork) | `/api/health` is live on a Vercel URL; the migration is applied; models are confirmed | 2:00 |
| 1 | Backend: all core API routes, the `engine/*` functions with node:test fixtures, Supabase queries | **codex-codex** | `src/app/api/**`, `src/lib/engine/**`, `src/lib/db.ts` | A curl script creates a session, posts 6 ideas and gets a provocation | 2:50 |
| 2 | Frontend: prompt → axis editor → idea input → axis-pair map (SVG and motion, axis selectors, PCA toggle) → provocation card with "why?" → reveal animation → summary ledger | **cursor-cursor** | `src/app/(app)/**`, `src/components/**` | The full flow works against `DEMO_MODE` mocks, then against the real API | 3:00 |
| 3 | Prompts: axis-generation prompt, provocation prompt, suggestion judge, regex blocklist, template fallbacks; an eval script that generates 20 provocations from seeded sessions and prints the judge's pass rate | **Claude subagent (sonnet)**, launched by me | `src/lib/prompts/**`, `scripts/eval-provocations.ts` | At least 19 of 20 outputs pass and none contain a suggestion (I spot-check) | 2:45 |
| 4 | Seed data: `demo.ts` with the onboarding session (8 ideas skewed incremental + individual), cached embeddings, canned axes and provocations | **Claude subagent (haiku)** | `src/lib/demo.ts`, `scripts/seed.ts` | DEMO_MODE renders a map with an obvious empty quadrant | 2:30 |
| 5 | **Gate at 3:15:** integration, threshold tuning on the seeded session, deploy | **ronit-claude** | – | A judge-style run produces a good question | 3:15 |
| 6 | Stretch A: QR join (`/join/[id]`), photo → `/api/extract` → confirm chips, `/ambient/[id]` glow page, state polling | **codex-codex** (finishes backend first) | `src/app/join/**`, `src/app/ambient/**`, `src/app/api/extract/**` | A phone on the public URL snaps sticky notes and the ambient page turns amber | 3:55 hard cut |
| 7 | Stretch B: Glasser reality-check route and cluster button | **Claude subagent (sonnet)** | `src/app/api/reality/**`, `src/components/reality-button.tsx` | The button shows search counts for a cluster | 3:55 hard cut |
| 8 | Polish: cross-session mock slide, backup screen recording, pitch notes in `docs/PITCH.md` | **ronit-claude**, plus you on the pitch | `docs/**` | Recording saved; code frozen at 4:10 | 4:10 |

**How the tasks get started:**
- After Task 0, I create tasks 1, 2 and 6 in agentteams, assigned to codex-codex and cursor-cursor, and start them with `agentteams run`.
- The Claude subagents for tasks 3, 4 and 7 run from my session. Their work merges through my worktree.
- I merge with `agentteams merge` at about 2:50 and again at about 3:10.

**Your parts (the human):**
- Approve the hooks once in Codex with `/hooks` and enable the MCP server in Cursor.
- Get the Glasser $5 credit from their Discord.
- Bring a sticky-note pad.
- Own the pitch.
- Post on LinkedIn or X tagging @Glasserai after judging.

## Verification
- **Engine:** `node --test` on the engine fixtures. Each of the 5 patterns fires on a constructed case and stays quiet on a balanced case.
- **Prompts:** `scripts/eval-provocations.ts` reports the pass rate, and I read all 20 outputs by hand for the one rule.
- **API:** a curl smoke script (create a session, then post 6 ideas; check that the state includes a provocation).
- **End to end:**
  - `npm run verify` passes.
  - Run the demo path in Chrome on the Vercel URL, with DEMO_MODE both off and on.
  - Check the phone join over cellular, not venue Wi-Fi.
- **Gate checks:** 2:00 (deploy is live), 3:15 (core loop gives a good question), 3:55 (stretch cut), 4:10 (freeze).
