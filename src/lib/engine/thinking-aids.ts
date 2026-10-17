import type { Axis, DetectionSignal } from "../contract";

export type ThinkingIdea = {
  id: string;
  axisScores: Record<string, number>;
  createdAt: string;
  speaker?: string;
  deviceId?: string;
  kind?: "idea" | "assumption";
  shortlisted?: boolean;
};
const END = 0.3;
const author = (idea: ThinkingIdea) => idea.speaker?.trim() || idea.deviceId;

/** Unknown authors never count as evidence of a second participant. */
export function detectVoice(ideas: ThinkingIdea[], axes: Axis[]): DetectionSignal | null {
  if (new Set(ideas.map(author).filter(Boolean)).size < 2) return null;
  for (const axis of axes) for (const side of [-1, 1] as const) {
    const end = ideas.filter(i => i.kind !== "assumption" && (i.axisScores[axis.id] ?? 0) * side >= END);
    if (end.length < 3) continue;
    const counts = new Map<string, number>();
    end.forEach(i => { const name = author(i); if (name) counts.set(name, (counts.get(name) ?? 0) + 1); });
    for (const [speaker, count] of counts) if (count / end.length >= 0.75) {
      return { type: "voice", strength: count / end.length, ideaIds: end.map(i => i.id), axisId: axis.id, side, speaker };
    }
  }
  return null;
}

/** Every shortlisted idea must reach the same pole; neutral cards prevent a signal. */
export function detectShortlist(ideas: ThinkingIdea[], axes: Axis[]): DetectionSignal | null {
  const selected = ideas.filter(i => i.shortlisted && i.kind !== "assumption");
  if (selected.length < 3) return null;
  for (const axis of axes) for (const side of [-1, 1] as const) {
    if (selected.every(i => (i.axisScores[axis.id] ?? 0) * side >= END)) {
      return { type: "shortlist", strength: 1, ideaIds: selected.map(i => i.id), axisId: axis.id, side };
    }
  }
  return null;
}

/** Explicit kind metadata opts legacy callers into the assumption-card workflow. */
export function detectAssumption(ideas: ThinkingIdea[], fixation?: DetectionSignal): DetectionSignal | null {
  const cards = ideas.filter(i => i.kind === "assumption");
  if (!cards.length) {
    return fixation && ideas.some(i => i.kind !== undefined)
      ? { ...fixation, type: "assumption" } : null;
  }
  // Use the latest assumption so a newly written card gets time to influence the board.
  const card = cards.reduce((a, b) => Date.parse(a.createdAt) > Date.parse(b.createdAt) ? a : b);
  const after = ideas.filter(i => i.kind !== "assumption" && Date.parse(i.createdAt) > Date.parse(card.createdAt));
  return after.length >= 4 ? { type: "assumption", strength: 1, ideaIds: [card.id] } : null;
}

/** Calling this function represents a human link. AI edges are undirected. */
export function detectBridge(
  a: string | { id: string }, b: string | { id: string }, edges: readonly { a: string; b: string }[],
): DetectionSignal | null {
  const left = typeof a === "string" ? a : a.id;
  const right = typeof b === "string" ? b : b.id;
  if (!left || !right || left === right || edges.some(e => (e.a === left && e.b === right) || (e.a === right && e.b === left))) return null;
  return { type: "bridge", strength: 1, ideaIds: [left, right] };
}
