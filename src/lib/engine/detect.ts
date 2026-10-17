// OWNER: codex-codex. Pure, no I/O.
import { detectAssumption, detectShortlist, detectVoice } from "./thinking-aids.ts";
import type { ThinkingIdea } from "./thinking-aids.ts";
export { detectBridge, detectVoice, detectShortlist, detectAssumption } from "./thinking-aids.ts";
import { cosine } from "./score.ts";
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
  ideas: (ThinkingIdea & { embedding: number[] })[];
  axes: Axis[];
  /** Type of the most recent provocation, for the cooldown. */
  lastType?: PatternType;
};

/**
 * Check thinking aids on every run (voice, shortlist, assumption priority), then
 * return the strongest legacy pattern, or null. Kind metadata enables assumption cards.
 * - duplicate: any pair with cos >= DUPLICATE_COS. strength = (cos - 0.9) / 0.1. ideaIds = the pair.
 * - fixation: mean pairwise cos of the last FIXATION_WINDOW ideas >= FIXATION_MEAN_COS.
 *   strength = (mean - 0.8) / 0.2. ideaIds = the window.
 * - abandoned: ideas whose nearest-neighbor cosine DISTANCE is in the top OUTLIER_TOP_FRACTION
 *   (at least 1 idea, needs >= 6 ideas) AND no later idea is within 0.25 distance of it.
 *   strength = normalized NN distance. ideaIds = [outlier].
 * - unexplored: an axis where every |score| < UNEXPLORED_ABS. strength 0.6. axisId set.
 * - gap: for each axis end (side -1 = poleA, +1 = poleB), count ideas with score beyond
 *   ±GAP_THRESHOLD on that side. If >= 5 ideas exist, count <= GAP_MAX_IDEAS, and the opposite end has >= 3,
 *   emit gap with side, axisId, ideaIds = the ideas on the crowded end.
 *   strength = crowded / total (gap is the hero pattern; break ties in its favor).
 * Cooldown: drop candidates whose type === lastType.
 * Strength is clamped to [0, 1].
 */
export function detect(input: DetectInput): DetectionSignal | null {
  const { ideas, axes, lastType } = input;
  if (ideas.length < MIN_IDEAS_FOR_DETECTION) return null;
  const candidates: DetectionSignal[] = [];
  for (let i = 0; i < ideas.length; i++) for (let j = i + 1; j < ideas.length; j++) {
    const similarity = cosine(ideas[i].embedding, ideas[j].embedding);
    if (similarity >= DUPLICATE_COS) candidates.push({ type: "duplicate", strength: (similarity - DUPLICATE_COS) / (1 - DUPLICATE_COS), ideaIds: [ideas[i].id, ideas[j].id] });
  }
  if (ideas.length >= FIXATION_WINDOW) {
    const recent = ideas.slice(-FIXATION_WINDOW);
    let sum = 0, count = 0;
    for (let i = 0; i < recent.length; i++) for (let j = i + 1; j < recent.length; j++) { sum += cosine(recent[i].embedding, recent[j].embedding); count++; }
    const mean = sum / count;
    if (mean >= FIXATION_MEAN_COS) candidates.push({ type: "fixation", strength: (mean - FIXATION_MEAN_COS) / (1 - FIXATION_MEAN_COS), ideaIds: recent.map(i => i.id) });
  }
  if (ideas.length >= 6) {
    const distances = ideas.map((idea, i) => ({ i, distance: Math.min(...ideas.filter((_, j) => j !== i).map(other => 1 - cosine(idea.embedding, other.embedding))) }));
    distances.sort((a, b) => b.distance - a.distance);
    for (const { i, distance } of distances.slice(0, Math.max(1, Math.ceil(ideas.length * OUTLIER_TOP_FRACTION)))) {
      // A fresh point has not yet had an opportunity to be followed up.
      if (distance > 0.25 && i < ideas.length - 2 && !ideas.slice(i + 1).some(other => 1 - cosine(ideas[i].embedding, other.embedding) <= 0.25)) {
        candidates.push({ type: "abandoned", strength: Math.min(1, distance / 2), ideaIds: [ideas[i].id] });
      }
    }
  }
  for (const axis of axes) {
    if (ideas.every(i => Math.abs(i.axisScores[axis.id] ?? 0) < UNEXPLORED_ABS)) candidates.push({ type: "unexplored", strength: 0.6, ideaIds: [], axisId: axis.id });
    for (const side of [-1, 1] as const) {
      const reached = ideas.filter(i => (i.axisScores[axis.id] ?? 0) * side > GAP_THRESHOLD);
      const crowded = ideas.filter(i => (i.axisScores[axis.id] ?? 0) * side < -GAP_THRESHOLD);
      if (ideas.length >= 5 && reached.length <= GAP_MAX_IDEAS && crowded.length >= 3) candidates.push({ type: "gap", strength: crowded.length / ideas.length, axisId: axis.id, side, ideaIds: crowded.map(i => i.id) });
    }
  }
  const fixation = candidates.find(c => c.type === "fixation");
  const assumption = detectAssumption(ideas, fixation);
  if (assumption && fixation) candidates.splice(candidates.indexOf(fixation), 1);
  const extra = [detectVoice(ideas, axes), detectShortlist(ideas, axes), assumption].filter((s): s is DetectionSignal => s !== null);
  // Actionable thinking aids take precedence, with the same per-type cooldown.
  const aid = extra.find(c => c.type !== lastType);
  if (aid) return aid;
  const available = candidates.filter(c => c.type !== lastType);
  available.forEach(c => { c.strength = Math.max(0, Math.min(1, c.strength)); });
  available.sort((a, b) => b.strength - a.strength || Number(b.type === "gap") - Number(a.type === "gap"));
  return available[0] ?? null;
}
