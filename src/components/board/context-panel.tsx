"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export type ContextResult = { title: string; url: string; snippet: string; publishedDate?: string; favicon?: string };

export function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

/** Only http(s) links leave the app. */
export function safeUrl(url: string): string | undefined {
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : undefined;
  } catch {
    return undefined;
  }
}

export function faviconFor(url: string, given?: string): string | undefined {
  if (given && safeUrl(given)) return given;
  const host = domainOf(url);
  return host ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=32` : undefined;
}

type Phase = { kind: "loading" } | { kind: "error"; message: string } | { kind: "done"; query: string; results: ContextResult[] };

/**
 * "Evidence, not ideas": real sources from the web about a point or a question.
 * The person decides what, if anything, to pin to the board.
 */
export function ContextPanel({
  sessionId,
  ideaId,
  query,
  onPin,
}: {
  sessionId: string;
  ideaId?: string;
  query?: string;
  onPin: (r: ContextResult) => void;
}) {
  const [phase, setPhase] = useState<Phase>({ kind: "loading" });
  const [pinned, setPinned] = useState<string[]>([]);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/context", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, ideaId, query }),
      signal: controller.signal,
    })
      .then(async (res) => {
        const data = (await res.json().catch(() => null)) as { query?: string; results?: ContextResult[]; error?: string } | null;
        if (!res.ok || !data) throw new Error(data?.error ?? "Couldn't reach the web just now.");
        setPhase({ kind: "done", query: data.query ?? query ?? "", results: (data.results ?? []).slice(0, 5) });
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setPhase({ kind: "error", message: err instanceof Error ? err.message : "Couldn't reach the web just now." });
      });
    return () => controller.abort();
  }, [sessionId, ideaId, query, attempt]);

  return (
    <div className="space-y-2" aria-live="polite">
      <p className="text-[11px] font-semibold tracking-[0.12em] text-ink-soft uppercase">Real sources from the web — evidence, not ideas.</p>
      {phase.kind === "loading" ? (
        <ul className="space-y-2" aria-label="Loading sources">
          {[0, 1, 2].map((i) => (
            <li key={i} className="h-[72px] animate-pulse rounded-xl bg-paper-sunk" />
          ))}
        </ul>
      ) : null}
      {phase.kind === "error" ? (
        <div className="rounded-xl bg-paper-sunk p-3 text-sm text-ink-soft">
          {phase.message}{" "}
          <button
            type="button"
            className="text-ink underline underline-offset-2"
            onClick={() => {
              setPhase({ kind: "loading" });
              setAttempt((n) => n + 1);
            }}
          >
            Try again
          </button>
        </div>
      ) : null}
      {phase.kind === "done" && !phase.results.length ? <p className="text-sm text-ink-soft">Nothing solid turned up for this one.</p> : null}
      {phase.kind === "done" ? (
        <ul className="space-y-2">
          {phase.results.map((r) => {
            const href = safeUrl(r.url);
            const icon = faviconFor(r.url, r.favicon);
            const isPinned = pinned.includes(r.url);
            return (
              <li key={r.url} className="rounded-xl border border-rule bg-paper p-3">
                <div className="flex items-start gap-2">
                  {icon ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={icon} alt="" width={16} height={16} className="mt-0.5 size-4 shrink-0 rounded-sm" />
                  ) : null}
                  <div className="min-w-0 flex-1">
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="line-clamp-2 text-sm font-medium text-ink underline-offset-2 hover:underline"
                    >
                      {r.title}
                    </a>
                    <p className="text-[11px] text-ink-faint">
                      {domainOf(r.url)}
                      {r.publishedDate ? ` · ${r.publishedDate.slice(0, 10)}` : ""}
                    </p>
                    <p className="mt-1 line-clamp-2 text-xs text-ink-soft">{r.snippet}</p>
                  </div>
                </div>
                <div className="mt-2 flex justify-end">
                  <Button
                    type="button"
                    size="sm"
                    variant={isPinned ? "ghost" : "outline"}
                    disabled={isPinned}
                    onClick={() => {
                      setPinned((p) => [...p, r.url]);
                      onPin(r);
                    }}
                  >
                    {isPinned ? "Pinned" : "Pin to board"}
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
