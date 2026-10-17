# Brief: Claude subagent (sonnet) — prompts module + eval (time box: 2:45)

## Goal
Replace the template-only stub in `src/lib/prompts/index.ts` with the real implementation of `PromptsModule` (see `src/lib/contract.ts`): `proposeAxes(prompt)` and `writeProvocation(signal, ideas, axes, prompt)`. The one rule: **the AI never suggests an idea** — it only asks questions about the user's own ideas.

## Files you own
`src/lib/prompts/**` (keep `index.ts` exports `proposeAxes`, `writeProvocation`, `prompts`, `DEFAULT_AXES` and `templates.ts` `templateProvocation`), `scripts/eval-provocations.ts`.
## Do NOT touch
Everything else, especially `src/lib/contract.ts`, `src/app/api/**`, `src/lib/engine/**`, `.env*`.

## Design
- Models via AI Gateway as plain strings: `anthropic/claude-sonnet-5-5` (writer, axes), `anthropic/claude-haiku-5-5` (judge). `generateText({ model, output: Output.object({ schema }), system, prompt })` → `result.output` (from `ai` v7; zod v4 schemas).
- `proposeAxes`: 4–6 bipolar lenses, each pole 1–3 lowercase words, genuinely opposed, specific to the prompt, never ideas themselves. On any error/invalid → `DEFAULT_AXES`. Timeout ~8s (AbortSignal).
- `writeProvocation`: writer returns `{question, referencedIdeaIds}`; constraints: one question, ≤ 30 words, references the user's own idea text or lens names, no nouns/solutions the user hasn't written. Then (1) regex blocklist (`blocklist.ts`: /\btry\b/i, /you could/i, /consider (adding|using|building)/i, /what about (a|an|the)\b/i, /how about/i, /\bimagine\b/i, /\bfor example\b/i, /\be\.g\./i, /\bsuch as\b/i, /\bmaybe\b/i …), (2) Haiku judge `{containsSuggestion: boolean}`; any failure/timeout → `templateProvocation`. `why.explanation` always comes from the template (deterministic). Never throws.
- Per pattern guidance: gap → name the empty pole; fixation → the shared assumption; duplicate → what separates two ideas; abandoned → why the lone idea was left; unexplored → which side of the lens the problem is on.

## Eval
`scripts/eval-provocations.ts`: build 20 signals (4 per pattern) from the mock data in `src/lib/mock-state.ts`, call `writeProvocation`, print each question, whether it fell back to template, and the judge pass rate. Run with `node --experimental-strip-types --env-file=.env.local scripts/eval-provocations.ts` (or `npx tsx` if strip-types can't resolve `@/` paths — use relative imports with `.ts` extensions).

## Acceptance
≥19/20 LLM outputs pass judge + blocklist; zero suggestions on manual read; `npm run verify` green; commit `feat: provocation prompts, judge and eval`.
