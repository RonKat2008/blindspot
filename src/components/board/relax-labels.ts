// Label-aware collision pass. Each point owns a box made of its dot plus its label
// (to the right, or to the left when flipped). Overlapping boxes are pushed apart,
// mostly vertically, while a weak spring keeps every point near its true position.

export type LabelPoint = { id: string; x: number; y: number; flip: boolean; fixed?: boolean };
export type RelaxOptions = {
  labelW: number;
  labelH: number;
  bounds: { left: number; top: number; right: number; bottom: number };
  iterations?: number;
};

type Box = { x1: number; x2: number; y1: number; y2: number };

function boxOf(p: { x: number; y: number; flip: boolean }, o: RelaxOptions): Box {
  return p.flip
    ? { x1: p.x - o.labelW, x2: p.x + 8, y1: p.y - 9, y2: p.y + o.labelH - 9 }
    : { x1: p.x - 8, x2: p.x + o.labelW, y1: p.y - 9, y2: p.y + o.labelH - 9 };
}

export function relaxLabels(points: LabelPoint[], o: RelaxOptions): Map<string, { x: number; y: number }> {
  const cur = points.map((p) => ({ ...p, ox: p.x, oy: p.y }));
  const iterations = o.iterations ?? 70;
  for (let it = 0; it < iterations; it += 1) {
    let moved = false;
    for (let i = 0; i < cur.length; i += 1) {
      for (let j = i + 1; j < cur.length; j += 1) {
        const a = cur[i];
        const b = cur[j];
        const A = boxOf(a, o);
        const B = boxOf(b, o);
        const ox = Math.min(A.x2, B.x2) - Math.max(A.x1, B.x1);
        const oy = Math.min(A.y2, B.y2) - Math.max(A.y1, B.y1);
        if (ox <= 0 || oy <= 0) continue;
        moved = true;
        // separate along the cheaper axis, preferring vertical (labels are wide)
        if (oy < ox * 1.6) {
          const push = oy / 2 + 1;
          const dir = a.y <= b.y ? -1 : 1;
          if (!a.fixed) a.y += dir * push;
          if (!b.fixed) b.y -= dir * push;
        } else {
          const push = ox / 2 + 1;
          const dir = a.x <= b.x ? -1 : 1;
          if (!a.fixed) a.x += dir * push;
          if (!b.fixed) b.x -= dir * push;
        }
      }
    }
    for (const p of cur) {
      if (p.fixed) continue;
      p.x += (p.ox - p.x) * 0.02;
      p.y += (p.oy - p.y) * 0.02;
      p.x = Math.max(o.bounds.left, Math.min(o.bounds.right, p.x));
      p.y = Math.max(o.bounds.top, Math.min(o.bounds.bottom, p.y));
    }
    if (!moved) break;
  }
  return new Map(cur.map((p) => [p.id, { x: Math.round(p.x), y: Math.round(p.y) }]));
}
