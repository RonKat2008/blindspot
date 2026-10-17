// POST /api/reality  (stretch; see src/lib/contract.ts RealityResponse)
// Body: {ideaTexts: string[], prompt: string}. Evidence only: returns search queries and what the
// web already shows for them. It never returns, rewrites or suggests ideas.
// Response is a superset of the contract's {queries, resultCounts}.
import { z } from "zod";
import { isDemoMode } from "@/lib/demo";
import { GlasserError, googleSearch, hasGlasserKey, type GlasserResult } from "@/lib/glasser";

export const dynamic = "force-dynamic";

export type Crowdedness = "open" | "some" | "crowded";
export type RealityQueryResult = {
  query: string;
  totalResults: number | null;
  top: GlasserResult[];
};
export type RealityApiResponse = {
  queries: string[];
  /** Contract-compatible: totalResults per query, 0 when unknown. */
  resultCounts: number[];
  results: RealityQueryResult[];
  crowdedness: Crowdedness;
  demo?: true;
};

const RealityRequestBody = z.object({
  ideaTexts: z.array(z.string().trim().min(1).max(280)).min(1).max(30),
  prompt: z.string().trim().max(300).default(""),
});

const MAX_QUERIES = 3;
const KEYWORDS_USED = 3;
const MAX_TOPIC_WORDS = 6;
const OPEN_BELOW_TOTAL = 50_000;
const CROWDED_FROM_TOTAL = 5_000_000;
/** With no totals, average number of top-3 results per query that mention the core keywords. */
const CROWDED_FROM_RELEVANT = 2;
const SOME_FROM_RELEVANT = 1;

const STOPWORDS = new Set(
  "a an and are as at be but by for from has have how i if in into is it its more most new of on or our so that the their them then there these they this to up us use using we what when where which who will with you your can make get should might could way ways help helps people app apps idea ideas".split(
    " ",
  ),
);

const tokenize = (s: string): string[] =>
  s.toLowerCase().replace(/[^a-z0-9\s'-]/g, " ").split(/\s+/).filter(Boolean);

const contentWords = (s: string): string[] =>
  tokenize(s).filter((w) => w.length > 2 && !STOPWORDS.has(w));

/** Frequency-ranked content words across ideas (ties keep first-seen order): deterministic. */
export function topKeywords(ideaTexts: string[], prompt: string): string[] {
  const counts = new Map<string, number>();
  for (const w of contentWords(ideaTexts.join(" "))) counts.set(w, (counts.get(w) ?? 0) + 1);
  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([w]) => w);
  if (ranked.length >= 2) return ranked.slice(0, KEYWORDS_USED);
  return [...new Set([...ranked, ...contentWords(prompt)])].slice(0, KEYWORDS_USED);
}

export function topicOf(prompt: string): string {
  return prompt
    .replace(/^\s*how (might|can|could|do|should) (we|i|you)\s+/i, "")
    .replace(/[?.!]+$/, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, MAX_TOPIC_WORDS)
    .join(" ");
}

export function deriveQueries(ideaTexts: string[], prompt: string): string[] {
  const kws = topKeywords(ideaTexts, prompt);
  const core = kws.slice(0, 2).join(" ");
  const topic = topicOf(prompt);
  const candidates = [
    core && `"${core}" startup`,
    core && `${core} app`,
    topic && `${topic} ${kws[0] ?? ""}`.trim(),
    topic,
  ].filter((q): q is string => Boolean(q));
  return [...new Set(candidates)].slice(0, MAX_QUERIES).map((q) => q.slice(0, 200));
}

export function classify(results: RealityQueryResult[], keywords: string[]): Crowdedness {
  const totals = results.map((r) => r.totalResults).filter((n): n is number => n !== null);
  if (totals.length > 0) {
    const biggest = Math.max(...totals);
    if (biggest >= CROWDED_FROM_TOTAL) return "crowded";
    return biggest >= OPEN_BELOW_TOTAL ? "some" : "open";
  }
  // Providers like Serper report no total: count top results that mention the core keywords.
  const core = keywords.slice(0, 2);
  const relevant = results.map(
    (r) =>
      r.top.filter((t) => {
        const hay = `${t.title} ${t.snippet}`.toLowerCase();
        return core.every((k) => hay.includes(k));
      }).length,
  );
  const avg = relevant.length ? relevant.reduce((a, b) => a + b, 0) / relevant.length : 0;
  if (avg >= CROWDED_FROM_RELEVANT) return "crowded";
  return avg >= SOME_FROM_RELEVANT ? "some" : "open";
}

function demoResponse(queries: string[]): RealityApiResponse {
  const canned: RealityQueryResult[] = [
    {
      query: queries[0],
      totalResults: 18_400_000,
      top: [
        { title: "Best onboarding software for new hires (2026)", url: "https://example.com/best-onboarding-software", snippet: "Compare 24 tools that automate checklists, welcome flows and first-week tasks." },
        { title: "Startup raises $12M to rethink employee onboarding", url: "https://example.com/onboarding-startup-raises", snippet: "The company says its app cuts time-to-productivity by 30 percent." },
        { title: "Show HN: an onboarding buddy app", url: "https://example.com/show-hn-onboarding-buddy", snippet: "Pairs every new teammate with a buddy and a guided first week." },
      ],
    },
    {
      query: queries[1] ?? queries[0],
      totalResults: 6_900_000,
      top: [
        { title: "Top 10 onboarding apps compared", url: "https://example.com/top-onboarding-apps", snippet: "Checklists, welcome videos and progress tracking dominate the category." },
        { title: "Why onboarding apps fail after week two", url: "https://example.com/why-onboarding-apps-fail", snippet: "Most tools stop where real team integration begins." },
        { title: "Onboarding app directory", url: "https://example.com/onboarding-directory", snippet: "A directory of 140 products, filterable by company size." },
      ],
    },
  ];
  const results = queries.length >= 2 ? canned : canned.slice(0, 1);
  return {
    queries: results.map((r) => r.query),
    resultCounts: results.map((r) => r.totalResults ?? 0),
    results,
    crowdedness: "crowded",
    demo: true,
  };
}

export async function POST(request: Request): Promise<Response> {
  const parsed = RealityRequestBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Send {ideaTexts: string[], prompt: string}." }, { status: 400 });
  }
  const { ideaTexts, prompt } = parsed.data;
  const queries = deriveQueries(ideaTexts, prompt);
  if (queries.length === 0) {
    return Response.json({ error: "Not enough text to build a search." }, { status: 400 });
  }

  if (isDemoMode() || !hasGlasserKey()) return Response.json(demoResponse(queries));

  try {
    const searches = await Promise.all(queries.map((q) => googleSearch(q)));
    const results: RealityQueryResult[] = queries.map((query, i) => ({
      query,
      totalResults: searches[i].totalResults,
      top: searches[i].topResults,
    }));
    const body: RealityApiResponse = {
      queries,
      resultCounts: results.map((r) => r.totalResults ?? 0),
      results,
      crowdedness: classify(results, topKeywords(ideaTexts, prompt)),
    };
    return Response.json(body);
  } catch (e) {
    console.error("[reality] Glasser failed:", e instanceof Error ? e.message : e);
    const status = e instanceof GlasserError && e.kind === "timeout" ? 504 : 502;
    return Response.json({ error: "Couldn't reach the search service. Try again in a moment." }, { status });
  }
}
