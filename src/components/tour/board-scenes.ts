// Per-chapter scripts for the REAL board (<Board snapshot />). Built from the seeded demo
// session and the /demo tour script, so the tour shows exactly what the product renders.
import type { BoardSnapshot } from "@/components/board/board";
import { snapshotAt, TOUR_STEPS } from "@/components/demo/tour-script";
import type { Idea } from "@/lib/contract";
import type { IllustrationKey } from "./chapters";

export type SceneFrame = { snapshot: BoardSnapshot; ms: number };
export type Scene = readonly SceneFrame[];

const END = Number.POSITIVE_INFINITY;

function stepIndex(id: string): number {
  const i = TOUR_STEPS.findIndex((s) => s.id === id);
  return i < 0 ? 0 : i;
}

/** DemoSnapshot → BoardSnapshot (drops the spotlight-only `focus`). */
function at(step: string, elapsed: number, patch: Partial<BoardSnapshot> = {}): BoardSnapshot {
  const { focus: _focus, ...snap } = snapshotAt(stepIndex(step), elapsed);
  void _focus;
  return { ...snap, draft: "", ...patch };
}

function withIdeas(base: BoardSnapshot, ideas: Idea[], patch: Partial<BoardSnapshot> = {}): BoardSnapshot {
  return { ...base, state: { ...base.state, ideas }, ...patch };
}

const ASSUMPTION_ID = "tour-assumption-1";

function build(): Partial<Record<IllustrationKey, Scene>> {
  const seeded = at("lenses", 0);
  const seedIdeas = seeded.state.ideas;
  const lensBefore = at("question", 0, { view: "lens", freshIds: [] });
  const questionShown = at("gap", 0, { view: "lens", whyOpen: false, freshIds: [] });
  // The gap step marks the question accepted; re-show it for the question chapters.
  const questionState = {
    ...questionShown.state,
    provocations: questionShown.state.provocations.map((p) => (p.status === "accepted" ? { ...p, status: "shown" as const } : p)),
  };
  const question = { ...questionShown, state: questionState };
  const finalBoard = at("gap", END, { view: "board", revealId: null, freshIds: [] });
  const finalLens = at("gap", END, { view: "lens" });
  const gapId = finalBoard.state.ideas.at(-1)?.id ?? null;

  const growth: SceneFrame[] = [2, 4, 6, seedIdeas.length].map((n, i, all) =>
    ({
      snapshot: withIdeas(seeded, seedIdeas.slice(0, n), { view: "board", freshIds: seedIdeas.slice(i ? all[i - 1] : 0, n).map((x) => x.id) }),
      ms: 1300,
    }),
  );

  const shortlistIds = new Set(finalBoard.state.ideas.slice(-3).map((i) => i.id));
  const assumption: Idea = {
    ...seedIdeas[0],
    id: ASSUMPTION_ID,
    text: "We're assuming new users have ten spare minutes on day one.",
    kind: "assumption",
    speaker: "Maya",
  };
  const convergeState = {
    ...finalBoard.state,
    ideas: [...finalBoard.state.ideas.map((i) => ({ ...i, shortlisted: shortlistIds.has(i.id) })), assumption],
  };

  return {
    whiteboard: growth,
    lenses: [{ snapshot: { ...seeded, view: "board" }, ms: 4000 }],
    lensView: [
      { snapshot: { ...lensBefore, view: "board" }, ms: 2400 },
      { snapshot: lensBefore, ms: 4200 },
    ],
    question: [
      { snapshot: { ...question, whyOpen: false }, ms: 2200 },
      { snapshot: { ...question, whyOpen: true }, ms: 4800 },
    ],
    guard: [{ snapshot: { ...question, whyOpen: false }, ms: 4000 }],
    connections: [
      { snapshot: finalBoard, ms: 2600 },
      { snapshot: { ...finalBoard, selectedId: gapId }, ms: 4600 },
    ],
    range: [
      { snapshot: { ...question, whyOpen: false }, ms: 2400 },
      { snapshot: { ...finalLens, freshIds: gapId ? [gapId] : [], revealId: gapId }, ms: 4600 },
    ],
    converge: [
      { snapshot: { ...finalBoard, state: convergeState }, ms: 2400 },
      { snapshot: { ...finalBoard, state: convergeState, converge: true }, ms: 4600 },
    ],
    replay: [{ snapshot: { ...finalBoard, replay: true }, ms: 4000 }],
  };
}

let cache: Partial<Record<IllustrationKey, Scene>> | null = null;

export function sceneFor(key: IllustrationKey): Scene | null {
  cache ??= build();
  return cache[key] ?? null;
}
