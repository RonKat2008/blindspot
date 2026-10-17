import type { Idea, SessionState } from "@/lib/contract";

export type Pos = { x: number; y: number; rot: number };
export type PosMap = Record<string, Pos>;
export type Edge = { a: string; b: string; similarity: number };
export type Cluster = { id: string; ideaIds: string[] };
export type HumanLink = { a: string; b: string };

/** Sticky footprint in board pixels. */
export const STICKY_W = 168;
export const STICKY_H = 128;
/** In lens view stickies shrink so the scatter stays readable. */
export const LENS_SCALE = 0.62;

const STICKY_COLORS = [
  "oklch(93% 0.09 95)", // butter
  "oklch(91% 0.06 20)", // blush
  "oklch(92% 0.06 150)", // mint
  "oklch(91% 0.05 240)", // sky
  "oklch(91% 0.06 300)", // lilac
];

export function stickyColor(speaker?: string): string {
  if (!speaker) return STICKY_COLORS[0];
  let h = 0;
  for (const ch of speaker) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return STICKY_COLORS[1 + (h % (STICKY_COLORS.length - 1))];
}

export function randomRot(): number {
  return Math.round((Math.random() * 6 - 3) * 10) / 10;
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage blocked (private mode); positions just won't persist
  }
}

export const store = {
  positions: (sessionId: string) => readJson<PosMap>(`bs-pos-${sessionId}`, {}),
  savePositions: (sessionId: string, value: PosMap) => writeJson(`bs-pos-${sessionId}`, value),
  links: (sessionId: string) => readJson<HumanLink[]>(`bs-links-${sessionId}`, []),
  saveLinks: (sessionId: string, value: HumanLink[]) => writeJson(`bs-links-${sessionId}`, value),
  flag: (key: string) => readJson<boolean>(key, false),
  setFlag: (key: string) => writeJson(key, true),
};

/** Next empty grid slot on the board that doesn't overlap an existing sticky. */
export function nextFreeSpot(taken: Pos[], width: number, top = 24): Pos {
  const gapX = STICKY_W + 28;
  const gapY = STICKY_H + 28;
  const cols = Math.max(1, Math.floor((width - 32) / gapX));
  const left = Math.max(16, (width - cols * gapX) / 2 + 14);
  for (let i = 0; i < 400; i += 1) {
    const x = left + (i % cols) * gapX;
    const y = top + Math.floor(i / cols) * gapY;
    const clash = taken.some((p) => Math.abs(p.x - x) < STICKY_W * 0.8 && Math.abs(p.y - y) < STICKY_H * 0.8);
    if (!clash) return { x, y, rot: randomRot() };
  }
  return { x: left, y: top, rot: randomRot() };
}

export type PlotBox = { left: number; top: number; width: number; height: number };

export function plotBox(w: number, h: number, rightInset = 0): PlotBox {
  const padX = w < 640 ? 16 : Math.max(48, w * 0.06);
  const padTop = 64;
  const padBottom = w < 640 ? 120 : 96;
  return { left: padX, top: padTop, width: Math.max(120, w - padX * 2 - rightInset), height: Math.max(120, h - padTop - padBottom) };
}

/** Centre of an idea in lens view, in board pixels. */
export function lensPoint(idea: Idea, xId: string, yId: string, box: PlotBox): { x: number; y: number } {
  const sx = clamp(idea.axisScores[xId] ?? 0);
  const sy = clamp(idea.axisScores[yId] ?? 0);
  return {
    x: box.left + ((sx + 1) / 2) * box.width,
    y: box.top + ((1 - sy) / 2) * box.height,
  };
}

function clamp(v: number): number {
  return Math.max(-0.92, Math.min(0.92, v));
}

export type QuadKey = "tl" | "tr" | "bl" | "br";

export function quadOf(idea: Idea, xId: string, yId: string): QuadKey {
  const x = idea.axisScores[xId] ?? 0;
  const y = idea.axisScores[yId] ?? 0;
  return `${y >= 0 ? "t" : "b"}${x >= 0 ? "r" : "l"}` as QuadKey;
}

type Connections = { edges: Edge[]; clusters: Cluster[]; islands: string[] };

/** Reads the optional connection fields; absent until the backend ships them. */
export function connectionsOf(state: SessionState | null): Connections {
  const s = state as (SessionState & Partial<Connections>) | null;
  return {
    edges: Array.isArray(s?.edges) ? s.edges : [],
    clusters: Array.isArray(s?.clusters) ? s.clusters : [],
    islands: Array.isArray(s?.islands) ? s.islands : [],
  };
}

export function hasEdge(edges: Edge[], a: string, b: string): boolean {
  return edges.some((e) => (e.a === a && e.b === b) || (e.a === b && e.b === a));
}

/** Soft curved path between two points, bowed slightly for a hand-drawn feel. */
export function threadPath(ax: number, ay: number, bx: number, by: number): string {
  const mx = (ax + bx) / 2;
  const my = (ay + by) / 2;
  const dx = bx - ax;
  const dy = by - ay;
  const bow = 0.18;
  return `M ${ax} ${ay} Q ${mx - dy * bow} ${my + dx * bow} ${bx} ${by}`;
}
