// OWNER: codex-codex. Pure, no I/O.

/** Axis-pair projection: x = scores[xAxisId], y = scores[yAxisId] (missing → 0). */
export function axisPair(
  axisScores: Record<string, number>,
  xAxisId: string,
  yAxisId: string,
): { x: number; y: number } {
  void axisScores;
  void xAxisId;
  void yAxisId;
  throw new Error("not implemented");
}

/**
 * Small PCA for the overview toggle: center embeddings, power-iterate the top 2 components
 * (deterministic start vector, 50 iterations, deflate after the first), project, then scale
 * each coordinate by max |value| into [-1, 1]. n < 3 → all {x:0,y:0}.
 */
export function pca2(embeddings: number[][]): { x: number; y: number }[] {
  void embeddings;
  throw new Error("not implemented");
}
