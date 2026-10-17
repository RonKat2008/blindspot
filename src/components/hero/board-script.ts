// Script for the hero's miniature whiteboard loop. Pure data + timing, no React.

export const STAGE_W = 560;
export const STAGE_H = 440;
export const NOTE_W = 120;
export const NOTE_H = 84;
export const LENS_SCALE = 0.58;

export type Tone = "butter" | "blush" | "mint" | "sky";

export interface ScriptNote {
  id: string;
  text: string;
  author: string;
  tone: Tone;
  /** Top-left corner on the board view. */
  board: { x: number; y: number; r: number };
  /** Centre point on the lens view. */
  lens: { cx: number; cy: number; r: number };
}

export const NOTES: readonly ScriptNote[] = [
  { id: "n1", text: "Welcome email with a checklist", author: "J", tone: "butter", board: { x: 28, y: 66, r: -3 }, lens: { cx: 92, cy: 300, r: -6 } },
  { id: "n2", text: "Shorter setup video", author: "A", tone: "blush", board: { x: 204, y: 74, r: 2 }, lens: { cx: 158, cy: 334, r: 4 } },
  { id: "n3", text: "FAQ page for week one", author: "M", tone: "mint", board: { x: 382, y: 62, r: -2 }, lens: { cx: 74, cy: 376, r: 3 } },
  { id: "n4", text: "Better laptop setup guide", author: "A", tone: "sky", board: { x: 92, y: 182, r: 3 }, lens: { cx: 136, cy: 398, r: -4 } },
  { id: "n5", text: "Progress bar in the app", author: "J", tone: "butter", board: { x: 262, y: 188, r: -2 }, lens: { cx: 214, cy: 292, r: 5 } },
  { id: "n6", text: "Clearer first-day schedule", author: "M", tone: "mint", board: { x: 420, y: 178, r: 3 }, lens: { cx: 222, cy: 378, r: -3 } },
  { id: "n7", text: "Tooltips on key screens", author: "J", tone: "blush", board: { x: 40, y: 300, r: 2 }, lens: { cx: 196, cy: 176, r: -5 } },
  { id: "n8", text: "Reminder emails in week two", author: "A", tone: "sky", board: { x: 214, y: 306, r: -3 }, lens: { cx: 104, cy: 158, r: 4 } },
] as const;

/** The idea a human types after reading the question. Lands in the empty corner. */
export const NEW_NOTE = {
  text: "New hires redesign onboarding for the next class",
  author: "M",
  board: { x: 400, y: 304, r: 2 },
  lens: { cx: 412, cy: 128, r: -3 },
} as const;

/** Pairs of related ideas (indexes into NOTES) that get a thread in board view. */
export const THREADS: readonly [number, number][] = [
  [0, 7],
  [1, 3],
  [4, 6],
  [2, 5],
];

export const QUESTION =
  "All 8 ideas sit on the incremental end. What would a radical version have to change?";

export const RANGE_FROM = 41;
export const RANGE_TO = 63;

const TYPE_MS_PER_CHAR = 34;

export const CUE = {
  first: 350,
  stagger: 380,
  threads: 3650,
  lens: 5300,
  hatch: 6200,
  question: 7000,
  type: 8300,
  meter: 8300 + NEW_NOTE.text.length * TYPE_MS_PER_CHAR + 250,
  back: 12900,
  clear: 14000,
  end: 14600,
} as const;

export interface Frame {
  count: number;
  threads: boolean;
  lens: boolean;
  hatch: boolean;
  question: boolean;
  typed: number;
  meter: boolean;
}

export const FINAL_FRAME: Frame = {
  count: NOTES.length,
  threads: false,
  lens: true,
  hatch: true,
  question: true,
  typed: NEW_NOTE.text.length,
  meter: true,
};

export function frameAt(t: number): Frame {
  if (t >= CUE.clear) {
    return { count: 0, threads: false, lens: false, hatch: false, question: false, typed: 0, meter: false };
  }
  const count = t < CUE.first ? 0 : Math.min(NOTES.length, Math.floor((t - CUE.first) / CUE.stagger) + 1);
  const lens = t >= CUE.lens && t < CUE.back;
  const typed = t < CUE.type ? 0 : Math.min(NEW_NOTE.text.length, Math.floor((t - CUE.type) / TYPE_MS_PER_CHAR));
  return {
    count,
    threads: t >= CUE.threads && !lens,
    lens,
    hatch: t >= CUE.hatch && lens,
    question: t >= CUE.question && lens,
    typed,
    meter: t >= CUE.meter,
  };
}

export function frameKey(f: Frame): string {
  return `${f.count}|${+f.threads}|${+f.lens}|${+f.hatch}|${+f.question}|${f.typed}|${+f.meter}`;
}

export function captionFor(f: Frame): string {
  if (f.meter && !f.lens) return "Back on the board. Same team, more ground.";
  if (f.meter) return `Someone answers. Range ${RANGE_FROM} → ${RANGE_TO}.`;
  if (f.typed > 0) return "A person writes the idea. Not the AI.";
  if (f.question) return "It asks a question. It never writes an idea.";
  if (f.lens) return "Lens view: every idea sits in one corner.";
  if (f.threads) return "Blind Spot links ideas that belong together.";
  return "Your team adds ideas to the board.";
}
