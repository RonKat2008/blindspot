// Suggestion guard: regex blocklist + Haiku judge. A text is only shown if both pass.
import { z } from "zod";
import { generateObject, JUDGE_MODEL } from "./llm";

const BLOCKLIST =
  /\b(try|trying|you could|you should|you might|consider(?:ing)? (?:adding|building|using|making)|what about (?:a|an|adding|building|using)|how about|maybe (?:add|build|try|use)|for example|for instance|e\.g\.|i\.e\.|such as|imagine (?:a|an)|what if (?:you|we|there were|it were)|an app|a platform|a tool that|a service that)\b/i;

export function passesRegex(text: string): boolean {
  return !BLOCKLIST.test(text);
}

const JudgeVerdict = z.object({ containsSuggestion: z.boolean(), reason: z.string() });

const JUDGE_SYSTEM = `You are a strict safety judge for a brainstorming tool whose one rule is: the AI must NEVER suggest an idea.
You receive a QUESTION the AI wants to show a team, plus the ideas the team has already written.
Set containsSuggestion=true if the question, directly or by implication, does ANY of:
- proposes, names, hints at or sketches a solution, product, feature, mechanism, approach, direction or example the team did not already write
- supplies concrete new content (e.g. "what if it were run by volunteers?" introduces "volunteers")
- uses a leading frame that smuggles in an answer ("Would a subscription model work?")
Set containsSuggestion=false ONLY if the question is purely about the team's own ideas, their pattern, or an axis/region of the idea space, and asks them to reflect or supply content themselves. Re-using the team's own words or the names of axis poles is fine. Naming a region ("the radical end", "the social side") is fine.
Reply with the verdict and a short reason.`;

/** Judge a text. Throws on timeout/provider error so callers can retry or fall back. */
export async function judgeIsSafe(
  text: string,
  ideaTexts: string[],
): Promise<{ safe: boolean; reason: string }> {
  const verdict = await generateObject({
    model: JUDGE_MODEL,
    schema: JudgeVerdict,
    system: JUDGE_SYSTEM,
    prompt: `Team's existing ideas:\n${ideaTexts.map((t) => `- ${t}`).join("\n") || "(none)"}\n\nQUESTION:\n${text}`,
  });
  return { safe: !verdict.containsSuggestion, reason: verdict.reason };
}

export function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}
