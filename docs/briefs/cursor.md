# Brief: cursor-cursor — frontend (time box: mocks flow by 2:50, real API by 3:10)

## Goal
Build the 4 screens in `docs/DESIGN.md` exactly (field-notebook direction, motion/react, very approachable for first-time users). The Reveal moment (idea landing in an empty quadrant + Range counting up) is the demo's screenshot — polish it first.

## Read first
`AGENTS.md`, `docs/DESIGN.md` (the spec), `docs/ARCHITECTURE.md`, `src/lib/contract.ts` (types), `src/lib/api-client.ts` (the ONLY way to talk to the backend), `src/lib/mock-state.ts`, `src/lib/motion.ts` (springs/variants — use these). Next 16: page `params` is a Promise (`const { id } = await params` in server components, or `use(params)` / `useParams()` in client components) — check `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/page.md`.

## Files you own (claim_files)
`src/app/page.tsx`, `src/app/s/**`, `src/components/**` (add shadcn primitives with `npx shadcn@latest add <name>` if needed), `src/app/globals.css`, `src/app/layout.tsx`.
## Do NOT touch
`src/app/api/**`, `src/lib/**` (contract, api-client, mock-state, motion, engine, prompts, demo, db, ai), `src/app/join/**`, `src/app/ambient/**`, `src/components/reality-button.tsx` (Claude stretch — leave a slot for it in the rail), `.env*`, `supabase/`.

## Routes
`/` landing + prompt → `/s/[id]/axes` lens review → `/s/[id]` canvas → `/s/[id]/summary`.

## Steps
1. `agentteams worktree <task>`; claim files.
2. Tokens + fonts: paste DESIGN.md §1 into `globals.css`, map to Tailwind `@theme inline`; add Fraunces via `next/font/google` in `layout.tsx`; title "Blind Spot". Fix the `LayoutProps` typecheck error if still present (type children explicitly: `{ children: React.ReactNode }`).
3. Run with `NEXT_PUBLIC_USE_MOCKS=true npm run dev`. Build landing → lens review → canvas (map with axis selectors + PCA toggle, Range meter, provocation card + "why?" highlight, pinned input, QR panel with `QRCodeSVG` from `qrcode.react` linking to `${location.origin}/join/${id}`) → summary ledger.
4. Approachability: 3-step skippable tour, teaching empty states, tooltips on lens names and Range, one primary action per screen, keyboard (Enter adds; `/` focuses input), microcopy rules — all per DESIGN.md.
5. Motion: dot flight from input, card slide/layout, Reveal (wash fade + ring pulse + count-up), `useReducedMotion` fallbacks.
6. Canvas state: load `api.getState(id)`; on add, replace `ideas` with `allIdeas`, set diversity, and show `provocation` if present. Card actions call `api.updateProvocation`.
7. At the 3:10 merge: unset `NEXT_PUBLIC_USE_MOCKS`, run against the real API, fix mismatches (report contract problems to the orchestrator, don't patch `src/lib`).
8. `npm run verify`, commit after each screen (`feat: …`), `agentteams done <task> -m "…"`, release files.

## Acceptance
On mocks: prompt chip → lenses → canvas with visibly empty radical+social corner and a gap question → "Take it" → type an idea → dot flies into the empty corner, Range 41 → 58 counts up → Wrap up → "You wrote 10 ideas. AI wrote 0." Works at 375px and 1440px. `npm run verify` green.
