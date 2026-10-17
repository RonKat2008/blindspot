// Deterministic fallback questions. Filled only with the user's own idea text and axis names,
// so they can never contain an AI-suggested idea.
import type { Axis, DetectionSignal, Idea, ProvocationWhy } from "../contract";

const quote = (s: string, max = 60): string =>
  `“${s.length > max ? `${s.slice(0, max - 1)}…` : s}”`;

export function templateProvocation(
  signal: DetectionSignal,
  ideas: Idea[],
  axes: Axis[],
): { text: string; why: ProvocationWhy } {
  const axis = axes.find((a) => a.id === signal.axisId);
  const refs = ideas.filter((i) => signal.ideaIds.includes(i.id));
  const first = refs[0]?.text ?? "your first idea";
  const n = refs.length;
  let text: string;
  let explanation: string;

  switch (signal.type) {
    case "gap": {
      const empty = signal.side === 1 ? axis?.poleB : axis?.poleA;
      const full = signal.side === 1 ? axis?.poleA : axis?.poleB;
      text = `Every idea so far leans ${full ?? "one way"}. What would make the ${empty ?? "other"} end of this problem worth taking seriously?`;
      explanation = `${n} ideas sit on the ${full ?? "same"} side of ${axis ? `${axis.poleA} ↔ ${axis.poleB}` : "this axis"}; the ${empty ?? "other"} end is empty.`;
      break;
    }
    case "fixation":
      text = `Your last ${n} ideas circle the same spot as ${quote(first)}. What assumption do they all share?`;
      explanation = `The last ${n} ideas are very similar to each other.`;
      break;
    case "duplicate":
      text = `${quote(first)} and ${quote(refs[1]?.text ?? "another idea")} look like the same idea. What actually separates them?`;
      explanation = "Two ideas are nearly identical in meaning.";
      break;
    case "abandoned":
      text = `${quote(first)} stands alone, and nobody built on it. Was it dropped on purpose?`;
      explanation = "This idea is far from all the others and nothing followed it.";
      break;
    case "unexplored":
      text = `None of your ideas pick a side on ${axis ? `${axis.poleA} ↔ ${axis.poleB}` : "this lens"}. Which side is this problem really on?`;
      explanation = `Every idea scores near neutral on ${axis ? `${axis.poleA} ↔ ${axis.poleB}` : "this axis"}.`;
      break;
  }

  return {
    text,
    why: { pattern: signal.type, ideaIds: signal.ideaIds, axisId: signal.axisId, explanation },
  };
}
