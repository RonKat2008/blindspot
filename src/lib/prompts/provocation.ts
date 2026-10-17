// Provocation pipeline: generate -> regex -> Haiku judge -> (retry once) -> template.
import { z } from "zod";
import type { Axis, DetectionSignal, Idea, PatternType, ProvocationWhy } from "../contract";
import { GENERATION_MODEL, generateObject } from "./llm";
import { judgeIsSafe, passesRegex, wordCount } from "./guard";
import { templateProvocation } from "./templates";

export const MAX_QUESTION_WORDS = 30;
const MAX_ATTEMPTS = 2;
const LEAN = 0.15;

const Out = z.object({
  question: z.string().describe("One question, 12-22 words"),
  explanation: z.string().describe("One plain sentence stating the observed pattern, with counts"),
});

const SYSTEM = `You are the question-writer inside "Blind Spot", a tool that widens a team's brainstorm WITHOUT ever contributing an idea. You only ask a question about a gap in what the team has already said.

THE ONE RULE: the question must never propose, name, hint at, or exemplify any solution, product, feature, mechanism, approach or direction. No "what if it were ...", no "have you thought about <thing>", no lists of options, no examples, no "such as". You may ONLY use (a) the team's own idea wording, (b) the axis pole names, (c) the structure of the pattern. Do not import words from the brainstorm prompt that the team's ideas never used. If you cannot ask without introducing new content, ask about the pattern itself.

A great question:
- is ONE short sentence, 12 to 22 words HARD MAXIMUM (count them; over 25 is a failure), and ends with a question mark. Quote at most two short fragments (2-5 words each) of the team's ideas; never paste whole ideas
- quotes or paraphrases one of the team's OWN ideas by its distinctive words, or names the axis poles, so it is obviously about THIS brainstorm
- names the region or pattern concretely (what is crowded, what is empty, what is shared)
- makes the team do the thinking: it asks what they assume, who/what they have not placed, or what would have to be true -- never what to build
- sounds like a sharp, slightly uncomfortable facilitator, not a generic prompt

Pattern guide:
- gap: one end of an axis is empty. Point at the empty pole by name and at the crowded pole; ask what the team's thinking would have to look like / who lives there / what is true there.
- fixation: recent ideas orbit one spot. Quote one; ask what unstated assumption all of them lean on, or what they all take for granted about the problem.
- duplicate: two ideas are near-identical. Quote both; ask what actually distinguishes them, or whether the team sees them as one.
- abandoned: an idea sits far from the rest and nobody built on it. Quote it; ask what it was seeing that the others are not, or why the team moved away from it.
- unexplored: nobody placed anything on an axis. Name the poles; ask which one the problem really belongs to and what made them avoid choosing.

The explanation is one plain sentence about the observed pattern (counts, which idea, which axis). It must also contain no suggestion.`;

function fmtAxis(a?: Axis): string {
  return a ? `${a.poleA} <-> ${a.poleB}` : "(none)";
}

function describe(signal: DetectionSignal, ideas: Idea[], axes: Axis[]): string {
  const axis = axes.find((a) => a.id === signal.axisId);
  const refs = ideas.filter((i) => signal.ideaIds.includes(i.id));
  const lines: string[] = [`Pattern: ${signal.type} (strength ${signal.strength.toFixed(2)})`];
  if (axis) {
    lines.push(`Axis: ${fmtAxis(axis)}  (poleA="${axis.poleA}", poleB="${axis.poleB}")`);
    const scored = ideas.filter((i) => typeof i.axisScores[axis.id] === "number");
    const nA = scored.filter((i) => i.axisScores[axis.id] < -LEAN).length;
    const nB = scored.filter((i) => i.axisScores[axis.id] > LEAN).length;
    const nMid = scored.length - nA - nB;
    lines.push(`Of ${scored.length} ideas: ${nA} lean "${axis.poleA}", ${nB} lean "${axis.poleB}", ${nMid} neutral.`);
    if (signal.type === "gap" && signal.side) {
      const empty = signal.side === 1 ? axis.poleB : axis.poleA;
      const full = signal.side === 1 ? axis.poleA : axis.poleB;
      lines.push(`Empty end: "${empty}". Crowded end: "${full}".`);
    }
  }
  if (refs.length > 0) {
    lines.push(`Ideas the pattern refers to (the team's own words):`);
    refs.slice(0, 6).forEach((r) => lines.push(`- "${r.text}"`));
  }
  return lines.join("\n");
}

function allIdeaTexts(ideas: Idea[]): string[] {
  return ideas.map((i) => i.text);
}

async function attemptOnce(
  signal: DetectionSignal,
  ideas: Idea[],
  axes: Axis[],
  prompt: string,
  feedback: string | null,
): Promise<{ text: string; explanation: string } | { failure: string }> {
  try {
    const out = await generateObject({
      model: GENERATION_MODEL,
      schema: Out,
      system: SYSTEM,
      prompt: [
        `Brainstorm prompt: ${prompt}`,
        `All ideas so far:\n${ideas.map((i) => `- ${i.text}`).join("\n")}`,
        describe(signal, ideas, axes),
        feedback
          ? `Your previous attempt was rejected: ${feedback}\nWrite a different question that introduces no new content at all.`
          : "",
        "Write the question and the one-sentence explanation.",
      ]
        .filter(Boolean)
        .join("\n\n"),
    });
    const text = out.question.trim();
    const explanation = out.explanation.trim();
    if (wordCount(text) >= MAX_QUESTION_WORDS) return { failure: `too long (${wordCount(text)} words)` };
    if (!text.endsWith("?")) return { failure: "not a question" };
    if (!passesRegex(text) || !passesRegex(explanation)) return { failure: "matched suggestion blocklist" };
    const verdict = await judgeIsSafe(`${text}\n(Explanation shown alongside: ${explanation})`, allIdeaTexts(ideas));
    if (!verdict.safe) return { failure: `judge flagged a suggestion: ${verdict.reason}` };
    return { text, explanation };
  } catch (e) {
    return { failure: e instanceof Error ? e.message : "llm error" };
  }
}

export type ProvocationResult = {
  text: string;
  why: ProvocationWhy;
  /** Diagnostic only; not part of the PromptsModule contract. */
  source: "llm" | "template";
  attempts: number;
};

/** Never throws. Output is judge+regex-approved LLM text, or a deterministic template. */
export async function writeProvocationGuarded(
  signal: DetectionSignal,
  ideas: Idea[],
  axes: Axis[],
  prompt: string,
): Promise<ProvocationResult> {
  let feedback: string | null = null;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const r = await attemptOnce(signal, ideas, axes, prompt, feedback);
    if ("text" in r) {
      return {
        text: r.text,
        why: {
          pattern: signal.type as PatternType,
          ideaIds: signal.ideaIds,
          axisId: signal.axisId,
          explanation: r.explanation,
        },
        source: "llm",
        attempts: attempt,
      };
    }
    feedback = r.failure;
    if (process.env.PROMPTS_DEBUG) console.warn(`[prompts] ${signal.type} attempt ${attempt} rejected: ${r.failure}`);
  }
  return { ...templateProvocation(signal, ideas, axes), source: "template", attempts: MAX_ATTEMPTS };
}
