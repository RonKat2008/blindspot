// Script for the hero's background thought map. Pure data + timing, no React.

export interface Vec {
  x: number;
  y: number;
}

export interface FieldPoint {
  id: string;
  label: string;
  cluster: 0 | 1 | 2;
  /** Offset from its cluster centre, in px at scale 1. */
  offset: Vec;
  /** Scattered start position, as a fraction of the field. */
  start: Vec;
}

export const POINTS: readonly FieldPoint[] = [
  { id: "p1", label: "Welcome email", cluster: 0, offset: { x: -64, y: -26 }, start: { x: 0.08, y: 0.18 } },
  { id: "p2", label: "Setup video", cluster: 0, offset: { x: 46, y: -48 }, start: { x: 0.34, y: 0.12 } },
  { id: "p3", label: "FAQ page", cluster: 0, offset: { x: -20, y: 40 }, start: { x: 0.22, y: 0.46 } },
  { id: "p4", label: "Checklist", cluster: 0, offset: { x: 70, y: 22 }, start: { x: 0.44, y: 0.3 } },
  { id: "p5", label: "Laptop guide", cluster: 1, offset: { x: -58, y: -30 }, start: { x: 0.1, y: 0.62 } },
  { id: "p6", label: "Day-one schedule", cluster: 1, offset: { x: 54, y: -40 }, start: { x: 0.36, y: 0.88 } },
  { id: "p7", label: "Tooltips", cluster: 1, offset: { x: -30, y: 42 }, start: { x: 0.06, y: 0.9 } },
  { id: "p8", label: "Reminder emails", cluster: 1, offset: { x: 72, y: 26 }, start: { x: 0.5, y: 0.7 } },
  { id: "p9", label: "Progress bar", cluster: 2, offset: { x: -62, y: -22 }, start: { x: 0.62, y: 0.9 } },
  { id: "p10", label: "Buddy chat", cluster: 2, offset: { x: 40, y: -50 }, start: { x: 0.92, y: 0.56 } },
  { id: "p11", label: "Help widget", cluster: 2, offset: { x: -10, y: 44 }, start: { x: 0.7, y: 0.6 } },
  { id: "p12", label: "Shorter forms", cluster: 2, offset: { x: 70, y: 18 }, start: { x: 0.96, y: 0.86 } },
];

/** Related pairs (indexes into POINTS) that get a thread once clustered. */
export const THREADS: readonly [number, number][] = [
  [0, 1], [1, 3], [0, 2],
  [4, 5], [5, 7], [4, 6],
  [8, 9], [9, 11], [8, 10],
];

export const NEW_POINT_LABEL = "New hires redesign it";
export const QUESTION = "What would a radical version look like?";

export interface Layout {
  clusters: readonly [Vec, Vec, Vec];
  empty: Vec;
}

/** Landscape: clusters hug the left and lower right, the top right stays empty. */
export const WIDE: Layout = {
  clusters: [{ x: 0.15, y: 0.3 }, { x: 0.19, y: 0.77 }, { x: 0.82, y: 0.79 }],
  empty: { x: 0.86, y: 0.25 },
};

/** Portrait (phones): clusters sit above and below the headline. */
export const TALL: Layout = {
  clusters: [{ x: 0.26, y: 0.15 }, { x: 0.26, y: 0.9 }, { x: 0.76, y: 0.9 }],
  empty: { x: 0.78, y: 0.15 },
};

export const CUE = {
  stagger: 160,
  cluster: 3000,
  threads: 4300,
  halos: 4800,
  glow: 6300,
  question: 7300,
  arrive: 9300,
  bloom: 10300,
  fade: 14000,
  end: 16000,
} as const;

export interface FieldFrame {
  count: number;
  clustered: boolean;
  threads: boolean;
  halos: boolean;
  glow: boolean;
  question: boolean;
  arrived: boolean;
  bloom: boolean;
  faded: boolean;
}

export const STATIC_FRAME: FieldFrame = {
  count: POINTS.length,
  clustered: true,
  threads: true,
  halos: true,
  glow: true,
  question: true,
  arrived: true,
  bloom: true,
  faded: false,
};

export function fieldFrameAt(t: number): FieldFrame {
  return {
    count: Math.min(POINTS.length, Math.floor(t / CUE.stagger) + 1),
    clustered: t >= CUE.cluster,
    threads: t >= CUE.threads,
    halos: t >= CUE.halos,
    glow: t >= CUE.glow,
    question: t >= CUE.question,
    arrived: t >= CUE.arrive,
    bloom: t >= CUE.bloom,
    faded: t >= CUE.fade,
  };
}

export function fieldFrameKey(f: FieldFrame): string {
  return Object.values(f).map((v) => (typeof v === "boolean" ? +v : v)).join("|");
}
