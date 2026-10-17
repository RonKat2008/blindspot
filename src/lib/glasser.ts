// Glasser (glasser.ai) client: pay-per-call data API, one key, prepaid balance.
// Verified against docs (https://glasser.ai/docs/llms.txt, openapi.json):
//   POST https://api.glasser.ai/v1/solutions/gtm/web_research
//   Authorization: Bearer <GLASSER_API_KEY>, Idempotency-Key: <uuid> (required)
//   body {action:"search", query, limit, provider:"auto"}  -> Run {status, provider_response, output, charge_usd}
// `output` is provider-native (Serper: organic[], SerpAPI: organic_results[], Exa: results[]),
// so parsing below is defensive. Server-only: never import this from a client component
// (type imports are fine).

const GLASSER_BASE_URL = "https://api.glasser.ai";
const WEB_RESEARCH_PATH = "/v1/solutions/gtm/web_research";
const TIMEOUT_MS = 8000;
const TOP_RESULT_COUNT = 3;
const FETCH_LIMIT = 10;

export type GlasserResult = { title: string; url: string; snippet: string };
export type GlasserSearch = { totalResults: number | null; topResults: GlasserResult[] };

export class GlasserError extends Error {
  constructor(
    message: string,
    readonly kind: "config" | "timeout" | "http" | "provider" | "parse",
    readonly status?: number,
  ) {
    super(message);
    this.name = "GlasserError";
  }
}

export function hasGlasserKey(): boolean {
  return Boolean(process.env.GLASSER_API_KEY?.trim());
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown): string => (typeof v === "string" ? v : "");

function toCount(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v) && v >= 0) return Math.round(v);
  if (typeof v === "string") {
    const n = Number(v.replace(/[,\s]/g, ""));
    if (Number.isFinite(n) && n >= 0) return Math.round(n);
  }
  return null;
}

function firstArray(o: Record<string, unknown>, keys: string[]): unknown[] {
  for (const k of keys) {
    const v = o[k];
    if (Array.isArray(v)) return v;
  }
  return [];
}

/** Normalize provider-native output (Serper / SerpAPI / Exa shapes) into our shape. */
export function parseSearchOutput(output: unknown): GlasserSearch {
  if (!isRecord(output)) throw new GlasserError("Glasser returned no search output", "parse");
  const rows = firstArray(output, ["organic", "organic_results", "results"]);
  const topResults = rows
    .filter(isRecord)
    .map((r) => ({
      title: str(r.title).trim(),
      url: str(r.link) || str(r.url),
      snippet: (str(r.snippet) || str(r.text) || str(r.description)).trim().slice(0, 240),
    }))
    .filter((r) => r.url.startsWith("http") && r.title)
    .slice(0, TOP_RESULT_COUNT);
  const info = output.searchInformation ?? output.search_information;
  const totalResults = isRecord(info) ? toCount(info.totalResults ?? info.total_results) : null;
  return { totalResults, topResults };
}

export async function googleSearch(query: string): Promise<GlasserSearch> {
  const key = process.env.GLASSER_API_KEY?.trim();
  if (!key) throw new GlasserError("GLASSER_API_KEY is not set", "config");

  let res: Response;
  try {
    res = await fetch(`${GLASSER_BASE_URL}${WEB_RESEARCH_PATH}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        "Idempotency-Key": crypto.randomUUID(),
      },
      body: JSON.stringify({ action: "search", provider: "auto", query, limit: FETCH_LIMIT }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
  } catch (e) {
    if (e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError")) {
      throw new GlasserError(`Glasser search timed out after ${TIMEOUT_MS}ms`, "timeout");
    }
    throw new GlasserError(`Glasser request failed: ${e instanceof Error ? e.message : "unknown"}`, "http");
  }

  const body: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = isRecord(body) && isRecord(body.error) ? str(body.error.message) : "";
    throw new GlasserError(msg || `Glasser HTTP ${res.status}`, "http", res.status);
  }
  if (!isRecord(body)) throw new GlasserError("Glasser returned a non-JSON body", "parse");
  if (body.status !== "COMPLETED") {
    throw new GlasserError(`Glasser run ${str(body.status) || "unfinished"}`, "provider");
  }
  const pr = body.provider_response;
  if (isRecord(pr) && typeof pr.http_status === "number" && pr.http_status >= 400) {
    throw new GlasserError(`Search provider error (HTTP ${pr.http_status})`, "provider", pr.http_status);
  }
  return parseSearchOutput(body.output);
}
