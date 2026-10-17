import "server-only";
import { z } from "zod";
import type { ContextResult } from "./contract";

export class ExaError extends Error {
  constructor(readonly code: "timeout" | "upstream" | "invalid_response", message: string, readonly status?: number) {
    super(message);
    this.name = "ExaError";
  }
}

const Result = z.object({
  title: z.string().nullish(), url: z.url(), text: z.string().nullish(),
  highlights: z.array(z.string()).nullish(), publishedDate: z.string().nullish(),
});
const SearchResponse = z.object({ results: z.array(Result) });
const favicon = (url: string) => `https://www.google.com/s2/favicons?domain=${encodeURIComponent(new URL(url).hostname)}&sz=64`;

/** Human-written evidence fixtures, used only in demo mode or when Exa is unconfigured. */
export function demoContextResults(): ContextResult[] {
  return [
    { title: "Every New Employee Needs an Onboarding Buddy", url: "https://hbr.org/2019/06/every-new-employee-needs-an-onboarding-buddy", snippet: "Microsoft studied onboarding buddies and the relationship between regular buddy meetings and new hires' experience." },
    { title: "Onboarding New Employees: Maximizing Success", url: "https://www.shrm.org/content/dam/en/shrm/topics-tools/news/talent-acquisition/Onboarding-New-Employees.pdf", snippet: "A research-based overview of onboarding, role clarity, social integration, and organizational culture." },
    { title: "GitLab Handbook: Onboarding", url: "https://handbook.gitlab.com/handbook/people-group/general-onboarding/", snippet: "A public handbook describing onboarding tasks, buddies, and support for joining a distributed team." },
  ].map(result => ({ ...result, favicon: favicon(result.url) }));
}

export async function searchContext(query: string, { numResults = 5 }: { numResults?: number } = {}): Promise<ContextResult[]> {
  const count = Math.min(10, Math.max(1, Math.floor(numResults)));
  const key = process.env.EXA_API_KEY;
  if (process.env.DEMO_MODE === "true" || !key) return demoContextResults().slice(0, count);
  let response: Response;
  try {
    response = await fetch("https://api.exa.ai/search", {
      method: "POST", headers: { "Content-Type": "application/json", "x-api-key": key },
      // Current Exa search docs use a boolean for highlights: https://exa.ai/docs/reference/search
      body: JSON.stringify({ query, numResults: count, type: "auto", contents: { text: { maxCharacters: 400 }, highlights: true } }),
      signal: AbortSignal.timeout(8000), cache: "no-store",
    });
  } catch (error) {
    const timeout = error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
    throw new ExaError(timeout ? "timeout" : "upstream", timeout ? "Context search timed out. Please try again." : "Context search is unavailable.");
  }
  if (!response.ok) throw new ExaError("upstream", "Context search is unavailable. Please try again.", response.status);
  const parsed = SearchResponse.safeParse(await response.json().catch(() => null));
  if (!parsed.success) throw new ExaError("invalid_response", "Context search returned an invalid response.");
  return parsed.data.results.filter(result => new URL(result.url).protocol === "https:").slice(0, count).map(result => ({
    title: result.title?.trim() || new URL(result.url).hostname, url: result.url,
    snippet: (result.highlights?.filter(Boolean).slice(0, 2).join(" ") || result.text || "").replace(/\s+/g, " ").trim().slice(0, 400),
    ...(result.publishedDate ? { publishedDate: result.publishedDate } : {}), favicon: favicon(result.url),
  }));
}

// Per-instance, bounded cache; never retains the API key or generated content.
const cache = new Map<string, { until: number; results: ContextResult[] }>();
export async function cachedContext(query: string): Promise<ContextResult[]> {
  const key = query.trim().replace(/\s+/g, " ").toLowerCase();
  const hit = cache.get(key);
  if (hit && hit.until > Date.now()) return hit.results;
  const results = await searchContext(query);
  for (const [id, value] of cache) if (value.until <= Date.now()) cache.delete(id);
  if (cache.size >= 200) cache.delete(cache.keys().next().value!);
  cache.set(key, { until: Date.now() + 600_000, results });
  return results;
}
