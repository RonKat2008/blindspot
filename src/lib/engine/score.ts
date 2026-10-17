// OWNER: codex-codex. Pure, no I/O. Runnable under `node --test --experimental-strip-types`
// (only `import type` from outside the engine; engine-internal imports use the `.ts` extension).
import type { Axis } from "../contract";

export type Vec = number[];
export type AxisWithEmbeddings = Axis & { poleAEmbedding: Vec; poleBEmbedding: Vec };

/** Clip bound for independent axis scores. */
export const SCORE_CLIP = 1;
export const SCORE_SCALE = 0.08;

export function cosine(a: Vec, b: Vec): number {
  if (a.length !== b.length) throw new Error("Vector dimensions differ");
  let dot = 0, aa = 0, bb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; aa += a[i] ** 2; bb += b[i] ** 2; }
  return aa && bb ? Math.max(-1, Math.min(1, dot / Math.sqrt(aa * bb))) : 0;
}

/** Score one idea against bare-word pole embeddings, independently of other ideas. */
export function scoreIdea(
  embedding: Vec,
  axes: AxisWithEmbeddings[],
): Record<string, number> {
  return Object.fromEntries(axes.map(axis => {
    const raw = cosine(embedding, axis.poleBEmbedding) - cosine(embedding, axis.poleAEmbedding);
    return [axis.id, Math.max(-SCORE_CLIP, Math.min(SCORE_CLIP, raw / SCORE_SCALE))];
  }));
}

/** Returns scores in input order; adding ideas never changes existing scores. */
export function scoreIdeas(
  embeddings: Vec[],
  axes: AxisWithEmbeddings[],
): Record<string, number>[] {
  return embeddings.map(embedding => scoreIdea(embedding, axes));
}
