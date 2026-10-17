// OWNER: codex-codex. Pure, no I/O.

/** Axis-pair projection: x = scores[xAxisId], y = scores[yAxisId] (missing → 0). */
export function axisPair(
  axisScores: Record<string, number>,
  xAxisId: string,
  yAxisId: string,
): { x: number; y: number } {
  return { x: axisScores[xAxisId] ?? 0, y: axisScores[yAxisId] ?? 0 };
}

/**
 * Small PCA for the overview toggle: center embeddings, power-iterate the top 2 components
 * (deterministic start vector, 50 iterations, deflate after the first), project, then scale
 * each coordinate by max |value| into [-1, 1]. n < 3 → all {x:0,y:0}.
 */
export function pca2(embeddings: number[][]): { x: number; y: number }[] {
  const n = embeddings.length, d = embeddings[0]?.length ?? 0;
  if (n < 3 || !d) return embeddings.map(() => ({ x: 0, y: 0 }));
  const mean = Array.from({ length: d }, (_, k) => embeddings.reduce((sum, e) => sum + e[k], 0) / n);
  const rows = embeddings.map(e => e.map((v, k) => v - mean[k]));
  const dot = (a: number[], b: number[]) => a.reduce((sum, v, k) => sum + v * b[k], 0);
  const components: number[][] = [];
  const projections: number[][] = [];
  for (let component = 0; component < 2; component++) {
    let v = Array.from({ length: d }, (_, k) => Math.sin((k + 1) * (component + 1)));
    for (let iteration = 0; iteration < 50; iteration++) {
      const weights = rows.map(r => dot(r, v));
      const next = Array.from({ length: d }, (_, k) => rows.reduce((sum, r, i) => sum + weights[i] * r[k], 0));
      for (const previous of components) { const overlap = dot(next, previous); next.forEach((_, k) => { next[k] -= overlap * previous[k]; }); }
      const norm = Math.sqrt(dot(next, next));
      v = norm > 1e-12 ? next.map(x => x / norm) : next.map(() => 0);
    }
    components.push(v);
    const values = rows.map(r => dot(r, v));
    const scale = Math.max(...values.map(Math.abs), 1e-12);
    projections.push(values.map(x => x / scale));
  }
  return embeddings.map((_, i) => ({ x: projections[0][i], y: projections[1][i] }));
}
