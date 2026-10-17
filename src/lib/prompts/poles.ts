// Pole descriptions for lens scoring. Embedding a bare pole word ("radical") only matches ideas that
// contain that word; embedding a short description of what that end of the lens means scores by meaning.
import { z } from "zod";
import { JUDGE_MODEL, generateObject } from "./llm";

type Pole = { poleA: string; poleB: string };

const POLE_TIMEOUT_MS = 4000;

const KNOWN: Readonly<Record<string, string>> = {
  incremental: "a small, safe tweak that improves how things already work",
  radical: "a bold, unconventional idea that throws out the current approach and reinvents it",
  individual: "something a person does alone, on their own, at their own pace",
  social: "something people do together with others, a team or community",
  community: "something people do together with others, a team or community",
  "in-product": "something that happens inside the product or app itself",
  "outside-the-product": "something that happens outside the product, in the real world or other channels",
  guided: "a structured, step-by-step experience where someone leads the way",
  "self-directed": "an open experience where people explore and choose their own path",
  immediate: "something that pays off right away, in the first minutes or days",
  "short-term": "something that pays off right away, in the first minutes or days",
  "long-term": "something that builds value slowly over months or years",
  digital: "something that happens on a screen, in software or online",
  physical: "something that happens in person, in a physical place or with physical things",
  "low-cost": "a cheap, lightweight idea that needs almost no money or effort",
  "high-investment": "an ambitious idea that needs significant money, time or people",
};

const DescribedOut = z.object({ descriptions: z.array(z.string()) });

const SYSTEM = `For each lens pole you are given, write one general description of what an idea at that end of the lens is like.
Rules: at most 18 words; plain language; describe the dimension, not a specific idea; no examples, products or features; do not mention the brainstorm topic.
Return descriptions in the same order as the poles.`;

function fallback(pole: string, other: string): string {
  return `an idea that is strongly ${pole} rather than ${other}`;
}

/** Descriptions for every pole, in input order as [poleA, poleB] pairs. Never throws. */
export async function describePoles(axes: Pole[]): Promise<{ poleA: string; poleB: string }[]> {
  const pairs = axes.map(a => [
    { pole: a.poleA.trim().toLowerCase(), other: a.poleB.trim().toLowerCase() },
    { pole: a.poleB.trim().toLowerCase(), other: a.poleA.trim().toLowerCase() },
  ]);
  const unknown = pairs.flat().filter(p => !KNOWN[p.pole]);
  const generated = new Map<string, string>();
  if (unknown.length > 0) {
    try {
      const out = await generateObject({
        model: JUDGE_MODEL,
        schema: DescribedOut,
        system: SYSTEM,
        prompt: unknown.map((p, i) => `${i + 1}. "${p.pole}" (opposite of "${p.other}")`).join("\n"),
        timeoutMs: POLE_TIMEOUT_MS,
      });
      unknown.forEach((p, i) => {
        const text = out.descriptions[i]?.trim();
        if (text) generated.set(p.pole, text);
      });
    } catch {
      // Fall through to the template description below.
    }
  }
  const describe = ({ pole, other }: { pole: string; other: string }) => KNOWN[pole] ?? generated.get(pole) ?? fallback(pole, other);
  return pairs.map(([a, b]) => ({ poleA: describe(a), poleB: describe(b) }));
}
