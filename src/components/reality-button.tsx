"use client";

/**
 * RealityButton: "Reality check" for a cluster of ideas. Shows what the web already says about it
 * (via POST /api/reality -> Glasser). Evidence, not ideas.
 *
 * Usage (frontend owner):
 *   import { RealityButton } from "@/components/reality-button";
 *   <RealityButton
 *     ideaTexts={clusterIdeas.map((i) => i.text)}
 *     prompt={state.session.prompt}
 *     className="mt-2"          // optional
 *   />
 * Mount it near a cluster / selected ideas. The popover is absolutely positioned under the button,
 * so give the parent `relative` room or wrap it in a container that does not clip overflow.
 */

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { RealityApiResponse, Crowdedness } from "@/app/api/reality/route";
import { reducedTransition, spring } from "@/lib/motion";

export interface RealityButtonProps {
  /** Texts of the ideas in the cluster being checked (1-30). */
  ideaTexts: string[];
  /** The brainstorm prompt, used to anchor the search queries. */
  prompt: string;
  className?: string;
}

type Phase = { kind: "idle" } | { kind: "loading" } | { kind: "error"; message: string } | { kind: "done"; data: RealityApiResponse };

const CROWD: Record<Crowdedness, { label: string; fill: number; note: string }> = {
  open: { label: "Open field", fill: 0.2, note: "Few direct hits. Little visible competition." },
  some: { label: "Some company", fill: 0.55, note: "People are working nearby. Look at how they differ." },
  crowded: { label: "Crowded", fill: 0.92, note: "Many direct hits. Expect to be compared to them." },
};

function safeHref(url: string): string | undefined {
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:" ? u.href : undefined;
  } catch {
    return undefined;
  }
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

const formatCount = (n: number): string =>
  new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(n);

function Skeleton() {
  return (
    <div aria-hidden className="space-y-3">
      <div className="h-2 w-full animate-pulse rounded-full bg-[var(--rule,#ddd6c8)]" />
      {[0, 1].map((i) => (
        <div key={i} className="space-y-2">
          <div className="h-3 w-2/3 animate-pulse rounded bg-[var(--rule,#ddd6c8)]" />
          <div className="h-3 w-full animate-pulse rounded bg-[var(--paper-sunk,#efe9dc)]" />
          <div className="h-3 w-5/6 animate-pulse rounded bg-[var(--paper-sunk,#efe9dc)]" />
        </div>
      ))}
    </div>
  );
}

function Meter({ level, reduce }: { level: Crowdedness; reduce: boolean }) {
  const { label, fill, note } = CROWD[level];
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="font-[family-name:var(--font-display,serif)] text-lg italic text-[var(--signal-ink,#7a4a10)]">
          {label}
        </span>
        <span className="text-xs uppercase tracking-wide text-[var(--ink-faint,#8a8478)]">Crowdedness</span>
      </div>
      <div
        role="meter"
        aria-label="Crowdedness"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(fill * 100)}
        aria-valuetext={label}
        className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--paper-sunk,#efe9dc)]"
      >
        <motion.div
          className="h-full origin-left rounded-full bg-[var(--signal,#e8a04a)]"
          style={{ width: "100%" }}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: fill }}
          transition={reduce ? reducedTransition : spring.settle}
        />
      </div>
      <p className="mt-2 text-sm text-[var(--ink-soft,#5c564a)]">{note}</p>
    </div>
  );
}

function Results({ data, reduce }: { data: RealityApiResponse; reduce: boolean }) {
  return (
    <div className="space-y-5">
      <Meter level={data.crowdedness} reduce={reduce} />
      <ul className="space-y-4">
        {data.results.map((r) => (
          <li key={r.query}>
            <p className="text-sm font-medium text-[var(--ink,#2a251c)]">
              <span className="font-mono text-[0.8125rem]">{r.query}</span>
              {r.totalResults !== null && (
                <span className="ml-2 text-xs font-normal text-[var(--ink-faint,#8a8478)]">
                  ~{formatCount(r.totalResults)} results
                </span>
              )}
            </p>
            <ol className="mt-1.5 space-y-1.5 border-l border-[var(--rule,#ddd6c8)] pl-3">
              {r.top.length === 0 && (
                <li className="text-sm text-[var(--ink-soft,#5c564a)]">No direct hits.</li>
              )}
              {r.top.map((t) => {
                const href = safeHref(t.url);
                return (
                  <li key={t.url} className="text-sm leading-snug">
                    {href ? (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[var(--ink,#2a251c)] underline decoration-[var(--rule,#ddd6c8)] underline-offset-2 transition-colors hover:decoration-[var(--signal,#e8a04a)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--signal,#e8a04a)]"
                      >
                        {t.title}
                      </a>
                    ) : (
                      <span>{t.title}</span>
                    )}
                    <span className="block text-xs text-[var(--ink-faint,#8a8478)]">{hostOf(t.url)}</span>
                  </li>
                );
              })}
            </ol>
          </li>
        ))}
      </ul>
      <p className="border-t border-[var(--rule,#ddd6c8)] pt-3 font-[family-name:var(--font-display,serif)] text-sm italic text-[var(--signal-ink,#7a4a10)]">
        Evidence, not ideas.
        {data.demo && (
          <span className="ml-2 font-[family-name:var(--font-ui,sans-serif)] text-xs not-italic text-[var(--ink-faint,#8a8478)]">
            (sample data)
          </span>
        )}
      </p>
    </div>
  );
}

export function RealityButton({ ideaTexts, prompt, className }: RealityButtonProps) {
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const reduce = useReducedMotion() ?? false;
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const run = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setPhase({ kind: "loading" });
    try {
      const res = await fetch("/api/reality", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ideaTexts, prompt }),
        signal: controller.signal,
      });
      const body: unknown = await res.json().catch(() => null);
      if (!res.ok || !body || typeof body !== "object" || !("results" in body)) {
        const msg = body && typeof body === "object" && "error" in body ? String((body as { error: unknown }).error) : "";
        throw new Error(msg || "Couldn't run the check.");
      }
      setPhase({ kind: "done", data: body as RealityApiResponse });
    } catch (e) {
      if (controller.signal.aborted) return;
      setPhase({ kind: "error", message: e instanceof Error ? e.message : "Couldn't run the check." });
    }
  }, [ideaTexts, prompt]);

  const toggle = (): void => {
    const next = !open;
    setOpen(next);
    if (next && phase.kind !== "loading" && phase.kind !== "done") void run();
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") setOpen(false);
    };
    const onDown = (e: PointerEvent): void => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [open]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const disabled = ideaTexts.length === 0;

  return (
    <div ref={rootRef} className={`relative inline-block ${className ?? ""}`}>
      <button
        type="button"
        onClick={toggle}
        disabled={disabled}
        aria-expanded={open}
        aria-controls={panelId}
        className="rounded-[var(--radius-sm,6px)] border border-[var(--rule,#ddd6c8)] bg-[var(--paper-raised,#fdfbf6)] px-3 py-1.5 text-sm text-[var(--ink,#2a251c)] transition-[background-color,border-color,transform] hover:border-[var(--signal,#e8a04a)] hover:bg-[var(--signal-wash,#fbeed8)] active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--signal,#e8a04a)] disabled:opacity-50"
      >
        Reality check
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            id={panelId}
            role="dialog"
            aria-label="Reality check"
            aria-busy={phase.kind === "loading"}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.98 }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.12 } }}
            transition={reduce ? reducedTransition : spring.gentle}
            className="absolute left-0 top-full z-30 mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-[var(--radius-lg,20px)] border border-[var(--rule,#ddd6c8)] bg-[var(--paper-raised,#fdfbf6)] p-4 text-left shadow-[var(--shadow-card,0_12px_32px_-12px_rgba(60,40,10,0.25))]"
          >
            {phase.kind === "loading" && <Skeleton />}
            {phase.kind === "error" && (
              <div role="alert" className="space-y-3">
                <p className="text-sm text-[var(--ink,#2a251c)]">{phase.message} Your ideas are safe.</p>
                <button
                  type="button"
                  onClick={() => void run()}
                  className="rounded-[var(--radius-sm,6px)] bg-[var(--ink,#2a251c)] px-3 py-1.5 text-sm text-[var(--paper,#f8f4ea)] transition-transform active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--signal,#e8a04a)]"
                >
                  Try again
                </button>
              </div>
            )}
            {phase.kind === "done" && <Results data={phase.data} reduce={reduce} />}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
