// Seeds the demo session: embeds axis poles + ideas via the AI Gateway and caches everything
// (including raw embeddings) in src/lib/demo-data.json.
// Run: npx tsx --env-file=.env.local scripts/seed.ts
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { embedMany } from "ai";

const MODEL = "openai/text-embedding-3-small";
const PROMPT = "How might we improve onboarding for new users?";
const DECIMALS = 5;

const AXES: ReadonlyArray<readonly [string, string]> = [
  ["incremental", "radical"],
  ["individual", "social"],
  ["in-product", "outside-the-product"],
  ["guided", "self-directed"],
  ["immediate", "long-term"],
];

const IDEAS: ReadonlyArray<{ text: string; speaker: string }> = [
  { text: "Cut the signup form down to two fields", speaker: "Maya" },
  { text: "Tooltip tour on first login", speaker: "Leo" },
  { text: "Progress checklist in the sidebar", speaker: "Priya" },
  { text: "Welcome email with three quick tips", speaker: "Maya" },
  { text: "Let me skip the tutorial", speaker: "Leo" },
  { text: "Better empty states", speaker: "Priya" },
  { text: "Pre-filled sample project to poke at", speaker: "Maya" },
  { text: "Short help videos inside each screen", speaker: "Leo" },
];

const dot = (a: number[], b: number[]) => a.reduce((s, v, i) => s + v * b[i], 0);
const cos = (a: number[], b: number[]) => dot(a, b) / Math.sqrt(dot(a, a) * dot(b, b));
const round = (v: number) => Number(v.toFixed(DECIMALS));

async function main() {
  const values = [...AXES.flatMap(([a, b]) => [a, b]), ...IDEAS.map((i) => i.text)];
  const { embeddings } = await embedMany({ model: MODEL, values });
  const poles = AXES.map((_, i) => ({ a: embeddings[i * 2], b: embeddings[i * 2 + 1] }));
  const ideaEmb = embeddings.slice(AXES.length * 2);

  // raw[axis][idea] = cos(idea, poleB) - cos(idea, poleA); +1 = poleB end
  const raw = poles.map((p) => ideaEmb.map((e) => cos(e, p.b) - cos(e, p.a)));
  const scores = raw.map((col) => {
    const mean = col.reduce((s, v) => s + v, 0) / col.length;
    const sd = Math.sqrt(col.reduce((s, v) => s + (v - mean) ** 2, 0) / col.length) || 1;
    return col.map((v) => Math.max(-1, Math.min(1, (v - mean) / sd)));
  });

  console.log("idea".padEnd(30) + AXES.map(([a, b]) => `${a[0]}<>${b[0]}`.padStart(8)).join(""));
  IDEAS.forEach((idea, j) => {
    console.log(idea.text.padEnd(30) + AXES.map((_, i) => scores[i][j].toFixed(2).padStart(8)).join(""));
  });
  const radSoc = IDEAS.filter((_, j) => scores[0][j] > 0 && scores[1][j] > 0).map((i) => i.text);
  console.log(`\nradical+social quadrant: ${radSoc.length === 0 ? "EMPTY (ok)" : radSoc.join(", ")}`);

  const data = {
    model: MODEL,
    prompt: PROMPT,
    axes: AXES.map(([poleA, poleB], i) => ({
      poleA,
      poleB,
      embeddingA: poles[i].a.map(round),
      embeddingB: poles[i].b.map(round),
    })),
    ideas: IDEAS.map((idea, j) => ({
      text: idea.text,
      speaker: idea.speaker,
      embedding: ideaEmb[j].map(round),
      scores: AXES.map((_, i) => round(scores[i][j])),
    })),
  };
  writeFileSync(resolve(process.cwd(), "src/lib/demo-data.json"), JSON.stringify(data));
  if (radSoc.length > 0) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
