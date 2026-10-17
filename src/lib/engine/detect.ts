// OWNER: codex-codex. Pure, no I/O.
import type { Axis, DetectionSignal, PatternType } from "../contract";

// Tunable thresholds (tune on the seeded demo session at the 3:10 gate).
export const DUPLICATE_COS = 0.9; // two ideas with cos >= this are duplicates
export const FIXATION_WINDOW = 5; // last N ideas
export const FIXATION_MEAN_COS = 0.8; // mean pairwise cos of the window >= this = fixation
export const OUTLIER_TOP_FRACTION = 0.1; // top 10% nearest-neighbor distance = abandoned outlier
export const UNEXPLORED_ABS = 0.15; // every |score| < this on an axis = unexplored
export const GAP_THRESHOLD = 0.3; // an idea "reaches" an axis end when score beyond ±this
export const GAP_MAX_IDEAS = 1; // an end with <= this many ideas is a gap
export const MIN_IDEAS_FOR_DETECTION = 3;

export type DetectInput = {
  ideas: { id: string; embedding: number[]; axisScores: Record<string, number>; createdAt: string }[];
  axes: Axis[];
  /** Type of the most recent provocation, for the cooldown. */
  lastType?: PatternType;
};

/**
 * Compute all candidate signals, then return the strongest, or null.
 * - duplicate: any pair with cos >= DUPLICATE_COS. strength = (cos - 0.9) / 0.1. ideaIds = the pair.
 * - fixation: mean pairwise cos of the last FIXATION_WINDOW ideas >= FIXATION_MEAN_COS.
 *   strength = (mean - 0.8) / 0.2. ideaIds = the window.
 * - abandoned: ideas whose nearest-neighbor cosine DISTANCE is in the top OUTLIER_TOP_FRACTION
 *   (at least 1 idea, needs >= 6 ideas) AND no later idea is within 0.25 distance of it.
 *   strength = normalized NN distance. ideaIds = [outlier].
 * - unexplored: an axis where every |score| < UNEXPLORED_ABS. strength 0.6. axisId set.
 * - gap: for each axis end (side -1 = poleA, +1 = poleB), count ideas with score beyond
 *   ±GAP_THRESHOLD on that side. If count <= GAP_MAX_IDEAS while the opposite end has >= 3,
 *   emit gap with side, axisId, ideaIds = the ideas on the crowded end.
 *   strength = crowded / total (gap is the hero pattern; break ties in its favor).
 * Cooldown: drop candidates whose type === lastType unless it is the only candidate.
 * Strength is clamped to [0, 1].
 */
export function detect(input: DetectInput): DetectionSignal | null {
  void input;
  throw new Error("not implemented");
}
