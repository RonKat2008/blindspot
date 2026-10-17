import { z } from "zod";
import { AXIS_COUNT_MAX, AXIS_COUNT_MIN, type ProposedAxis } from "../contract";
import { GENERATION_MODEL, generateObject } from "./llm";

export const DEFAULT_AXES: ProposedAxis[] = [
  { poleA: "incremental", poleB: "radical" },
  { poleA: "individual", poleB: "social" },
  { poleA: "digital", poleB: "physical" },
  { poleA: "short-term", poleB: "long-term" },
  { poleA: "low-cost", poleB: "high-investment" },
];

const AxesOut = z.object({
  axes: z.array(z.object({ poleA: z.string(), poleB: z.string() })).min(AXIS_COUNT_MIN).max(AXIS_COUNT_MAX),
});

const SYSTEM = `You design the "lenses" for a brainstorm map. A lens is a bipolar axis: two genuinely opposite poles, each 1-3 plain lowercase words.
Return 4 to 6 axes tailored to the brainstorm prompt. Mix kinds of axes, for example:
- ambition (incremental vs radical)
- who it serves or who acts (individual vs social / community)
- mechanism (product or technology vs people or process)
- time (immediate vs long-term)
- plus 1-2 axes specific to this prompt's domain (for example for a campus topic: inside vs outside the classroom).
Hard rules:
- Poles describe a DIMENSION of an idea, never an idea itself. No solutions, products, features or examples in a pole name ("app", "volunteers", "AI" are forbidden as poles).
- Poles must be true opposites, so an idea can sit toward either end.
- No two axes may measure the same thing.`;

function clean(p: string): string {
  return p.trim().toLowerCase().replace(/[.,;:!?]+$/g, "");
}

function isValidAxis(a: ProposedAxis): boolean {
  const words = (s: string) => s.split(/\s+/).filter(Boolean).length;
  return (
    a.poleA.length > 0 &&
    a.poleB.length > 0 &&
    a.poleA !== a.poleB &&
    words(a.poleA) <= 3 &&
    words(a.poleB) <= 3 &&
    a.poleA.length <= 40 &&
    a.poleB.length <= 40
  );
}

/** 4-6 tailored axes; falls back to DEFAULT_AXES on any error or invalid output. Never throws. */
export async function proposeAxesLLM(prompt: string): Promise<ProposedAxis[]> {
  try {
    const out = await generateObject({
      model: GENERATION_MODEL,
      schema: AxesOut,
      system: SYSTEM,
      prompt: `Brainstorm prompt: ${prompt}`,
      timeoutMs: 8000,
    });
    const axes = out.axes
      .map((a) => ({ poleA: clean(a.poleA), poleB: clean(a.poleB) }))
      .filter(isValidAxis);
    return axes.length >= AXIS_COUNT_MIN ? axes.slice(0, AXIS_COUNT_MAX) : DEFAULT_AXES;
  } catch {
    return DEFAULT_AXES;
  }
}
