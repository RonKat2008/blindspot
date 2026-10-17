import { after } from "next/server";
import { z } from "zod";
import type { RelatedResponse } from "@/lib/contract";
import { check, db, failure, HttpError, loadSession, validId, type StoredIdea } from "@/lib/db";
import { isDemoMode } from "@/lib/demo";
import { cosine } from "@/lib/engine/score";
import { passesRegex, wordCount } from "@/lib/prompts/guard";
import { generateObject, JUDGE_MODEL } from "@/lib/prompts/llm";
export const dynamic = "force-dynamic";

const NEAREST_COUNT = 5;
const FARTHEST_COUNT = 2;
const RESPONSE_BUDGET_MS = 3500;
const WHY_LLM_TIMEOUT_MS = 8000;
const WHY_MAX_WORDS = 10;
const CACHE_TTL_MS = 60_000;

type Whys = Record<string, string>;
// In-memory per instance: (ideaId, idea count) -> pending/finished whys. Slow calls keep filling it.
const whyCache = new Map<string, { expires: number; whys: Promise<Whys> }>();

const WhySchema = z.object({ items: z.array(z.object({ n: z.number().int(), why: z.string() })) });
const WHY_SYSTEM = `You explain relationships between ideas that HUMANS wrote in a brainstorm.
For each numbered pair, describe the shared theme of the two ideas in <= 10 words, as a short noun phrase or clause.
Only describe what the two written ideas already have in common. Never propose new ideas, features, solutions or examples. Never give advice.
If a pair shares no clear theme, return an empty string for it.`;

function round(value: number) { return Math.round(value * 1000) / 1000; }
function label(idea: StoredIdea) { return [idea.text, idea.mediaCaption].filter(Boolean).join(" — ").slice(0, 400); }

async function writeWhys(target: StoredIdea, nearest: StoredIdea[]): Promise<Whys> {
  if (!nearest.length) return {};
  if (isDemoMode()) return Object.fromEntries(nearest.map(n => [n.id, "Both focus on the same everyday problem"]));
  const prompt = `Idea A: ${label(target)}\n\n${nearest.map((n, i) => `Pair ${i + 1}: Idea A and Idea B${i + 1}: ${label(n)}`).join("\n")}`;
  const result = await generateObject({ model: JUDGE_MODEL, schema: WhySchema, system: WHY_SYSTEM, prompt, timeoutMs: WHY_LLM_TIMEOUT_MS });
  const whys: Whys = {};
  for (const { n, why } of result.items) {
    const idea = nearest[n - 1];
    const text = why.trim().replace(/\.$/, "");
    if (idea && text && wordCount(text) <= WHY_MAX_WORDS + 2 && passesRegex(text)) whys[idea.id] = text;
  }
  return whys;
}

function cachedWhys(target: StoredIdea, nearest: StoredIdea[], ideaCount: number): Promise<Whys> {
  const key = `${target.id}:${ideaCount}`, now = Date.now();
  for (const [k, v] of whyCache) if (v.expires <= now) whyCache.delete(k);
  const hit = whyCache.get(key);
  if (hit) return hit.whys;
  const whys = writeWhys(target, nearest).catch(error => {
    console.error("Related why failed:", error instanceof Error ? error.message : "Unknown error");
    whyCache.delete(key);
    return {} as Whys;
  });
  whyCache.set(key, { expires: now + CACHE_TTL_MS, whys });
  return whys;
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  const startedAt = Date.now();
  try {
    const id = validId((await params).id), client = db();
    const row = await client.from("ideas").select("session_id").eq("id", id).maybeSingle();
    check(row.error);
    if (!row.data) throw new HttpError(404, "Idea not found");
    const data = await loadSession(client, String(row.data.session_id));
    const target = data.ideas.find(i => i.id === id);
    if (!target) throw new HttpError(404, "Idea not found");
    const ranked = data.ideas.filter(i => i.id !== id).map(idea => ({ idea, similarity: cosine(target.embedding, idea.embedding) }))
      .sort((a, b) => b.similarity - a.similarity);
    const nearest = ranked.slice(0, NEAREST_COUNT);
    const farthest = ranked.slice(NEAREST_COUNT).slice(-FARTHEST_COUNT).reverse();

    const pending = cachedWhys(target, nearest.map(n => n.idea), data.ideas.length);
    after(async () => { await pending; });
    let timer: ReturnType<typeof setTimeout> | undefined;
    const whys = await Promise.race([
      pending,
      new Promise<Whys>(resolve => { timer = setTimeout(() => resolve({}), Math.max(0, RESPONSE_BUDGET_MS - (Date.now() - startedAt))); }),
    ]).finally(() => clearTimeout(timer));

    const body: RelatedResponse = {
      ideaId: id,
      nearest: nearest.map(({ idea, similarity }) => ({ id: idea.id, text: idea.text, similarity: round(similarity), ...(whys[idea.id] ? { why: whys[idea.id] } : {}) })),
      farthest: farthest.map(({ idea, similarity }) => ({ id: idea.id, text: idea.text, similarity: round(similarity) })),
      lensLeanings: data.axes.map(a => ({ axisId: a.id, poleA: a.poleA, poleB: a.poleB, score: round(target.axisScores[a.id] ?? 0) }))
        .sort((a, b) => Math.abs(b.score) - Math.abs(a.score)),
      questions: data.provocations.filter(p => p.why.ideaIds.includes(id)).map(p => ({ id: p.id, text: p.text, type: p.type, status: p.status })),
    };
    return Response.json(body, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return failure(error); }
}
