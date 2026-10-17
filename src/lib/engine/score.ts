// OWNER: codex-codex. Pure, no I/O. Runnable under `node --test --experimental-strip-types`
// (only `import type` from outside the engine; engine-internal imports use the `.ts` extension).
import type { Axis } from "../contract";

export type Vec = number[];
export type AxisWithEmbeddings = Axis & { poleAEmbedding: Vec; poleBEmbedding: Vec };

/** Clip bound for normalized scores. */
export const SCORE_CLIP = 1;

export function cosine(a: Vec, b: Vec): number {
  void a;
  void b;
  throw new Error("not implemented");
}

/**
 * Score every idea on every axis.
 * 1. raw(e, axis) = cos(e, poleB) - cos(e, poleA)   (so + leans poleB, - leans poleA)
 * 2. Per axis, z-normalize the raw values across ALL ideas in the session
 *    (z = (raw - mean) / std; if std < 1e-6 or n < 3 use raw * 10 as the fallback scale).
 * 3. Scale z by 1/2 (so ±2σ → ±1) and clip to [-1, 1].
 * Returns one Record<axisId, score> per input embedding, same order.
 */
export function scoreIdeas(
  embeddings: Vec[],
  axes: AxisWithEmbeddings[],
): Record<string, number>[] {
  void embeddings;
  void axes;
  throw new Error("not implemented");
}
