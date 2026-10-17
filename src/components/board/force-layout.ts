// A small, deterministic force layout for the thought map.
// Runs to completion synchronously (no ticking on screen), so the UI only ever animates
// from the old settled positions to the new settled ones: no jitter, and reduced motion
// can simply jump. Similar ideas (edges) attract; everything repels; pinned points stay put.

export type Vec = { x: number; y: number };
export type LayoutEdge = { a: string; b: string; similarity: number };
export type LayoutBounds = { left: number; top: number; right: number; bottom: number };

type Node = { id: string; x: number; y: number; vx: number; vy: number; pinned: boolean };

const ITERATIONS = 260;
/** Labels sit to the right of the dot, so points need more room sideways than up and down. */
const ASPECT = 1.9;

function hash(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i += 1) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  return (h >>> 0) / 4294967295;
}

function seedPosition(id: string, bounds: LayoutBounds): Vec {
  const cx = (bounds.left + bounds.right) / 2;
  const cy = (bounds.top + bounds.bottom) / 2;
  const angle = hash(id) * Math.PI * 2;
  const r = 40 + hash(`${id}:r`) * Math.min(bounds.right - bounds.left, bounds.bottom - bounds.top) * 0.3;
  return { x: cx + Math.cos(angle) * r * ASPECT * 0.6, y: cy + Math.sin(angle) * r * 0.6 };
}

export function forceLayout({
  ids,
  edges,
  bounds,
  previous,
  pinned,
}: {
  ids: string[];
  edges: LayoutEdge[];
  bounds: LayoutBounds;
  previous: Map<string, Vec>;
  pinned: Map<string, Vec>;
}): Map<string, Vec> {
  const out = new Map<string, Vec>();
  if (!ids.length) return out;
  const width = Math.max(1, bounds.right - bounds.left);
  const height = Math.max(1, bounds.bottom - bounds.top);
  const index = new Map<string, number>();
  const nodes: Node[] = ids.map((id, i) => {
    index.set(id, i);
    const pin = pinned.get(id);
    const start = pin ?? previous.get(id) ?? neighbourSeed(id, edges, previous) ?? seedPosition(id, bounds);
    return { id, x: start.x, y: start.y, vx: 0, vy: 0, pinned: Boolean(pin) };
  });

  // Ideal spacing shrinks as the map fills up, so a big session still fits.
  const spacing = Math.max(70, Math.min(150, Math.sqrt((width * height) / Math.max(1, nodes.length)) * 0.62));
  const links = edges
    .map((e) => ({ a: index.get(e.a), b: index.get(e.b), s: Math.max(0, Math.min(1, e.similarity)) }))
    .filter((e): e is { a: number; b: number; s: number } => e.a !== undefined && e.b !== undefined && e.a !== e.b);
  const cx = bounds.left + width / 2;
  const cy = bounds.top + height / 2;

  for (let iter = 0; iter < ITERATIONS; iter += 1) {
    const alpha = 1 - iter / ITERATIONS;
    // repulsion (elliptical, so labels don't overlap sideways)
    for (let i = 0; i < nodes.length; i += 1) {
      for (let j = i + 1; j < nodes.length; j += 1) {
        const a = nodes[i];
        const b = nodes[j];
        let dx = (b.x - a.x) / ASPECT;
        let dy = b.y - a.y;
        let d2 = dx * dx + dy * dy;
        if (d2 < 0.01) {
          dx = hash(a.id + b.id) - 0.5;
          dy = hash(b.id + a.id) - 0.5;
          d2 = dx * dx + dy * dy + 0.01;
        }
        const d = Math.sqrt(d2);
        if (d > spacing * 2.2) continue;
        const f = ((spacing * spacing) / d2) * 0.9 * alpha;
        const fx = (dx / d) * f * ASPECT;
        const fy = (dy / d) * f;
        a.vx -= fx;
        a.vy -= fy;
        b.vx += fx;
        b.vy += fy;
      }
    }
    // springs: similar ideas pull together
    for (const l of links) {
      const a = nodes[l.a];
      const b = nodes[l.b];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = Math.sqrt(dx * dx + dy * dy) || 1;
      const rest = spacing * (1.5 - l.s * 0.7);
      const f = (d - rest) * 0.04 * (0.4 + l.s) * alpha;
      const fx = (dx / d) * f;
      const fy = (dy / d) * f;
      a.vx += fx;
      a.vy += fy;
      b.vx -= fx;
      b.vy -= fy;
    }
    for (const n of nodes) {
      if (n.pinned) {
        n.vx = 0;
        n.vy = 0;
        continue;
      }
      // gentle gravity keeps islands on the page
      n.vx += (cx - n.x) * 0.004 * alpha;
      n.vy += (cy - n.y) * 0.006 * alpha;
      n.vx *= 0.55;
      n.vy *= 0.55;
      n.x = Math.max(bounds.left, Math.min(bounds.right, n.x + n.vx));
      n.y = Math.max(bounds.top, Math.min(bounds.bottom, n.y + n.vy));
    }
  }

  for (const n of nodes) out.set(n.id, { x: Math.round(n.x), y: Math.round(n.y) });
  return out;
}

function neighbourSeed(id: string, edges: LayoutEdge[], previous: Map<string, Vec>): Vec | null {
  for (const e of edges) {
    const other = e.a === id ? e.b : e.b === id ? e.a : null;
    const p = other ? previous.get(other) : undefined;
    if (p) return { x: p.x + (hash(id) - 0.5) * 60, y: p.y + (hash(`${id}y`) - 0.5) * 60 };
  }
  return null;
}
