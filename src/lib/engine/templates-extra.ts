import type { DetectionSignal, Idea, ProvocationWhy } from "../contract";

/** Quote at most three of the user's words, keeping every question under 22 words. */
const quote = (text: string) => `“${text.trim().split(/\s+/u).slice(0, 3).join(" ")}”`;

/** Null means the caller should use the existing prompt pipeline. No model calls. */
export function templateExtra(
  signal: DetectionSignal, ideas: Idea[],
): { text: string; why: ProvocationWhy } | null {
  const refs = signal.ideaIds.map(id => ideas.find(i => i.id === id)).filter((i): i is Idea => Boolean(i));
  if (!refs.length) return null;
  const first = quote(refs[0].text);
  let text: string;
  let explanation: string;
  switch (signal.type) {
    case "bridge":
      if (refs.length < 2) return null;
      text = `What connection do you see between ${first} and ${quote(refs[1].text)} that the map missed?`;
      explanation = "You linked two cards without an AI connection.";
      break;
    case "voice":
      text = `Whose perspective is missing from this side of the map around ${first}?`;
      explanation = `One participant authored at least 75% of ${refs.length} ideas at this axis end.`;
      break;
    case "shortlist":
      text = `Your shortlist leans one way around ${first}; what does that choice leave unexamined?`;
      explanation = `All ${refs.length} shortlisted ideas reach the same axis end.`;
      break;
    case "assumption":
      if (refs[0].kind === "assumption") {
        text = `What changes if your assumption ${first} is false?`;
        explanation = "At least four ideas were added after this assumption card.";
      } else {
        text = `What shared assumption behind ${first} could you write as an assumption card?`;
        explanation = "Recent ideas cluster together, and no assumption card names what they share.";
      }
      break;
    default: return null;
  }
  return { text, why: { pattern: signal.type, ideaIds: signal.ideaIds, axisId: signal.axisId, explanation } };
}
