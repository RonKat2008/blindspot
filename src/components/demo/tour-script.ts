// Scripted, network-free driver for the /demo tour.
// A step is a list of timed keyframes. The snapshot at (step, elapsed) is a pure function:
// settle every keyframe of earlier steps, then apply this step's keyframes up to `elapsed`.
// That makes Back/Next/pause deterministic and keeps the tour working offline.

import type { Idea, Provocation, SessionState } from "@/lib/contract";
import { getDemoProvocations, getDemoSessionState } from "@/lib/demo";

/** Anchor ids the stage must expose as `data-tour="<id>"`. */
export type TourAnchor =
  | "board"
  | "question-heading"
  | "lens-bar"
  | "lens-toggle"
  | "range-meter"
  | "question-note"
  | "add-sticky"
  | "wrap-up";

export type DemoView = "board" | "lens";

export type DemoSnapshot = {
  state: SessionState;
  /** Text currently "typed" into the add-sticky input. */
  draft: string;
  view: DemoView;
  /** "Why am I seeing this?" disclosure on the question note. */
  whyOpen: boolean;
  /** Ideas that just arrived (fly-in animation). */
  freshIds: string[];
  /** Idea that landed in an empty region (pulse ring). */
  revealId: string | null;
  /** Anchors to spotlight; empty = full dim (no cutout). */
  focus: TourAnchor[];
};

type Patch = (snap: DemoSnapshot) => DemoSnapshot;
type Keyframe = { at: number; patch: Patch };

export type TourStep = {
  id: string;
  caption: string;
  /** Optional smaller second line. */
  detail?: string;
  /** Autoplay dwell time. */
  durationMs: number;
  keyframes: Keyframe[];
};

// ---------- scripted data ----------

export const RANGE_START = 41;
export const RANGE_AFTER_NINTH = 40;
export const RANGE_AFTER_GAP = 63;
export const NINTH_IDEA_TEXT = "Auto-fill the profile from their work email";
export const GAP_IDEA_TEXT = "Pair every new user with a veteran user for their first week";
const NINTH_ID = "tour-i-9";
const GAP_ID = "tour-i-10";
const GAP_PROVOCATION_ID = "demo-p-2";
const TYPE_MS_PER_CHAR = 45;
const SCRIPT_TIME = "2026-10-17T21:20:00.000Z";

function seededState(): SessionState {
  const base = getDemoSessionState();
  return {
    ...base,
    // Only the old, dismissed question is visible at the start.
    provocations: base.provocations.filter((p) => p.status !== "shown"),
    diversity: RANGE_START,
  };
}

function meanScores(ideas: Idea[]): Record<string, number> {
  const out: Record<string, number> = {};
  const keys = Object.keys(ideas[0]?.axisScores ?? {});
  for (const key of keys) {
    out[key] = ideas.reduce((sum, i) => sum + (i.axisScores[key] ?? 0), 0) / Math.max(1, ideas.length);
  }
  return out;
}

function ninthIdea(seed: Idea[]): Idea {
  const mean = meanScores(seed);
  const scores = Object.fromEntries(
    Object.entries(mean).map(([k, v], i) => [k, Math.max(-1, Math.min(1, v + (i % 2 === 0 ? 0.06 : -0.05)))]),
  );
  return {
    id: NINTH_ID,
    text: NINTH_IDEA_TEXT,
    source: "typed",
    speaker: "You",
    axisScores: scores,
    pca: { x: scores["demo-ax-1"] ?? 0, y: scores["demo-ax-2"] ?? 0 },
    createdAt: SCRIPT_TIME,
  };
}

/** Hard-coded score vector: strongly radical (ax-1) and strongly social (ax-2). */
function gapIdea(): Idea {
  const axisScores = {
    "demo-ax-1": 0.82,
    "demo-ax-2": 0.86,
    "demo-ax-3": 0.55,
    "demo-ax-4": -0.2,
    "demo-ax-5": 0.45,
  };
  return {
    id: GAP_ID,
    text: GAP_IDEA_TEXT,
    source: "typed",
    speaker: "You",
    axisScores,
    pca: { x: axisScores["demo-ax-1"], y: axisScores["demo-ax-2"] },
    createdAt: SCRIPT_TIME,
  };
}

function gapProvocation(ideaIds: string[]): Provocation {
  const canned = getDemoProvocations().find((p) => p.id === GAP_PROVOCATION_ID);
  const count = ideaIds.length;
  const text = (canned?.text ?? "All 8 ideas sit on the incremental end. What would a radical version even have to change?").replace(
    /All \d+ ideas/,
    `All ${count} ideas`,
  );
  return {
    id: GAP_PROVOCATION_ID,
    type: "gap",
    text,
    why: {
      pattern: "gap",
      ideaIds,
      axisId: "demo-ax-1",
      explanation: canned?.why.explanation ?? "Every idea scores toward “incremental”; the radical end is empty.",
    },
    status: "shown",
    createdAt: SCRIPT_TIME,
  };
}

// ---------- patch helpers ----------

const set =
  (partial: Partial<DemoSnapshot>): Patch =>
  (s) => ({ ...s, ...partial });

const withState =
  (fn: (st: SessionState) => SessionState): Patch =>
  (s) => ({ ...s, state: fn(s.state) });

/** Keyframes that type `text` into the draft, one char at a time, starting at `start` ms. */
export function typewriter(text: string, start: number, msPerChar = TYPE_MS_PER_CHAR): { keyframes: Keyframe[]; end: number } {
  const keyframes: Keyframe[] = [];
  for (let i = 1; i <= text.length; i++) {
    keyframes.push({ at: start + i * msPerChar, patch: set({ draft: text.slice(0, i) }) });
  }
  return { keyframes, end: start + text.length * msPerChar };
}

// ---------- the script ----------

function buildSteps(): TourStep[] {
  const seed = seededState().ideas;
  const ninth = ninthIdea(seed);
  const gap = gapIdea();
  const typeNinth = typewriter(NINTH_IDEA_TEXT, 1200);
  const typeGap = typewriter(GAP_IDEA_TEXT, 1600);

  return [
    {
      id: "board",
      caption: "This is a team’s brainstorm: “How might we improve onboarding for new users?”",
      detail: "Every point is an idea a human added.",
      durationMs: 10_000,
      keyframes: [
        { at: 0, patch: set({ focus: ["board"], view: "board" }) },
        { at: 3500, patch: set({ focus: ["question-heading"] }) },
      ],
    },
    {
      id: "lenses",
      caption: "Blind Spot scores each idea on lenses it picked for this problem.",
      detail: "Here: incremental ↔ radical and individual ↔ social.",
      durationMs: 10_000,
      keyframes: [{ at: 0, patch: set({ focus: ["lens-bar"] }) }],
    },
    {
      id: "flip",
      caption: "Flip to the Lens view: every point lands on two lenses.",
      detail: `Range: ${RANGE_START}. The team feels productive, but they’re circling one corner.`,
      durationMs: 12_000,
      keyframes: [
        { at: 0, patch: set({ focus: ["lens-toggle"] }) },
        { at: 1400, patch: set({ view: "lens", focus: ["board"], freshIds: seed.map((i) => i.id) }) },
        { at: 6500, patch: set({ focus: ["board", "range-meter"], freshIds: [] }) },
      ],
    },
    {
      id: "question",
      caption: "One more idea, same corner. Then a note appears.",
      detail: "Notice: a question, not an idea. The AI never writes ideas.",
      durationMs: 16_000,
      keyframes: [
        { at: 0, patch: set({ focus: ["add-sticky"], draft: "" }) },
        ...typeNinth.keyframes,
        {
          at: typeNinth.end + 500,
          patch: (s) => ({
            ...withState((st) => ({ ...st, ideas: [...st.ideas, ninth], diversity: RANGE_AFTER_NINTH }))(s),
            draft: "",
            freshIds: [NINTH_ID],
            focus: ["board"],
          }),
        },
        {
          at: typeNinth.end + 3000,
          patch: (s) => ({
            ...withState((st) => ({
              ...st,
              provocations: [...st.provocations, gapProvocation(st.ideas.map((i) => i.id))],
            }))(s),
            freshIds: [],
            focus: ["question-note"],
          }),
        },
        { at: typeNinth.end + 7500, patch: set({ whyOpen: true, focus: ["question-note", "board"] }) },
      ],
    },
    {
      id: "gap",
      caption: "The human fills the gap.",
      detail: "The new point lands in the empty radical / social corner. That’s the whole point.",
      durationMs: 16_000,
      keyframes: [
        {
          at: 0,
          patch: (s) => ({
            ...withState((st) => ({
              ...st,
              provocations: st.provocations.map((p) => (p.id === GAP_PROVOCATION_ID ? { ...p, status: "accepted" as const } : p)),
            }))(s),
            whyOpen: false,
            focus: ["add-sticky"],
          }),
        },
        ...typeGap.keyframes,
        {
          at: typeGap.end + 500,
          patch: (s) => ({
            ...withState((st) => ({ ...st, ideas: [...st.ideas, gap], diversity: RANGE_AFTER_GAP }))(s),
            draft: "",
            freshIds: [GAP_ID],
            revealId: GAP_ID,
            focus: ["board", "range-meter"],
          }),
        },
      ],
    },
    {
      id: "wrap-up",
      caption: "You wrote 10 ideas. AI wrote 0 ideas and asked 1 question.",
      durationMs: 14_000,
      keyframes: [{ at: 0, patch: set({ focus: ["wrap-up"], freshIds: [], revealId: null }) }],
    },
  ];
}

export const TOUR_STEPS: readonly TourStep[] = buildSteps();
export const TOUR_TOTAL_MS = TOUR_STEPS.reduce((sum, s) => sum + s.durationMs, 0);

const INITIAL: DemoSnapshot = {
  state: seededState(),
  draft: "",
  view: "board",
  whyOpen: false,
  freshIds: [],
  revealId: null,
  focus: [],
};

function applyUntil(snap: DemoSnapshot, step: TourStep, elapsed: number): DemoSnapshot {
  return step.keyframes.filter((k) => k.at <= elapsed).reduce((acc, k) => k.patch(acc), snap);
}

const settledCache = new Map<number, DemoSnapshot>();

/** Snapshot after steps [0, index) have fully played. */
function settledBefore(index: number): DemoSnapshot {
  if (index <= 0) return INITIAL;
  const hit = settledCache.get(index);
  if (hit) return hit;
  const prev = settledBefore(index - 1);
  const step = TOUR_STEPS[index - 1];
  // Settled snapshots drop transient animation flags so a jump does not replay fly-ins.
  const done = { ...applyUntil(prev, step, Number.POSITIVE_INFINITY), freshIds: [], draft: "" };
  settledCache.set(index, done);
  return done;
}

/** The scripted world at `elapsed` ms into step `index`. Pure. */
export function snapshotAt(index: number, elapsed: number): DemoSnapshot {
  const i = Math.max(0, Math.min(TOUR_STEPS.length - 1, index));
  return applyUntil(settledBefore(i), TOUR_STEPS[i], elapsed);
}

/** Time the step's last keyframe fires (guide mode keeps the clock running until then). */
export function stepScriptEnd(index: number): number {
  const step = TOUR_STEPS[index];
  return step ? Math.max(0, ...step.keyframes.map((k) => k.at)) : 0;
}
