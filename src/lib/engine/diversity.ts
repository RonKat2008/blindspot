// OWNER: codex-codex. Pure, no I/O.
import { cosine } from "./score.ts";
import type { DiversityBreakdown } from "../contract";

/** Calibration range for mean pairwise cosine distance (from the seed set; tune at 3:10). */
export const SPREAD_MIN = 0.35;
export const SPREAD_MAX = 0.75;
export const SPREAD_WEIGHT = 0.6;
export const COVERAGE_WEIGHT = 0.4;
export const COVERAGE_THRESHOLD = 0.3; // idea counts toward an axis end beyond ±this
export const COVERAGE_MIN_IDEAS = 2; // an end is "covered" with >= this many ideas

/**
 * diversity = round(100 * (0.6 * spread + 0.4 * coverage))
 * spread   = clamp01((meanPairwiseCosDistance - SPREAD_MIN) / (SPREAD_MAX - SPREAD_MIN))
 * coverage = (# axis ends with >= COVERAGE_MIN_IDEAS ideas beyond ±COVERAGE_THRESHOLD) / (2 * #axes)
 * Fewer than 2 ideas: spread = 0.
 */
export function diversity(
  embeddings: number[][],
  axisScores: Record<string, number>[],
  axisIds: string[],
): { diversity: number; breakdown: DiversityBreakdown } {
  let total = 0, pairs = 0;
  for (let i = 0; i < embeddings.length; i++) for (let j = i + 1; j < embeddings.length; j++) {
    total += 1 - cosine(embeddings[i], embeddings[j]); pairs++;
  }
  const spread = pairs ? Math.max(0, Math.min(1, (total / pairs - SPREAD_MIN) / (SPREAD_MAX - SPREAD_MIN))) : 0;
  let ends = 0;
  for (const id of axisIds) for (const side of [-1, 1]) {
    if (axisScores.filter(s => (s[id] ?? 0) * side > COVERAGE_THRESHOLD).length >= COVERAGE_MIN_IDEAS) ends++;
  }
  const coverage = axisIds.length ? ends / (2 * axisIds.length) : 0;
  return { diversity: Math.round(100 * (SPREAD_WEIGHT * spread + COVERAGE_WEIGHT * coverage)), breakdown: { spread, coverage } };
}
