import type { Axis, Idea } from "@/lib/contract";

/** An idea sits on a lens end when its score is at least this far from the middle. */
export const END_THRESHOLD = 0.3;

/**
 * Share of lens ends (pole A and pole B, each counted separately) that already
 * hold at least two ideas. Returns 0 when there are no lenses.
 */
export function rangeShare(axes: Axis[], ideas: Idea[]): number {
  if (axes.length === 0) return 0;
  let covered = 0;
  for (const axis of axes) {
    let poleA = 0;
    let poleB = 0;
    for (const idea of ideas) {
      const score = idea.axisScores[axis.id];
      if (score === undefined || Number.isNaN(score)) continue;
      if (score <= -END_THRESHOLD) poleA += 1;
      else if (score >= END_THRESHOLD) poleB += 1;
    }
    if (poleA >= 2) covered += 1;
    if (poleB >= 2) covered += 1;
  }
  return covered / (axes.length * 2);
}
