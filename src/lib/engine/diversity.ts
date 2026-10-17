// OWNER: codex-codex. Pure, no I/O.
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
  void embeddings;
  void axisScores;
  void axisIds;
  throw new Error("not implemented");
}
