"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Board } from "@/components/board/board";
import { api } from "@/lib/api-client";
import { reducedTransition, spring } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { Director, SkipSignal, StopSignal } from "./director";
import { LIVE_STEPS } from "./script";

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal-ink";

type Ledger = { ideas: number; questions: number; range: number } | null;
type Timing = { id: string; ms: number; skipped: boolean };

declare global {
  interface Window {
    __liveTour?: { done: boolean; timings: Timing[]; totalMs: number };
  }
}

const COACH_KEY = "bs-board-tour-done";

function restoreCoachFlag(prev: string | null | undefined): void {
  try {
    if (prev === null || prev === undefined) window.localStorage.removeItem(COACH_KEY);
    else window.localStorage.setItem(COACH_KEY, prev);
  } catch {
    // storage unavailable; nothing to restore
  }
}

function sessionIdFromUrl(): string | null {
  const m = window.location.pathname.match(/\/s\/([^/?#]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

async function readLedger(): Promise<Ledger> {
  const sid = sessionIdFromUrl();
  if (!sid) return null;
  try {
    const st = await api.getState(sid);
    return {
      ideas: st.ideas.filter((i) => i.kind !== "assumption").length,
      questions: st.provocations.length,
      range: st.diversity,
    };
  } catch {
    return null;
  }
}

/** /tour?live=1 — drives the real board against the real API, on screen, in real time. */
export function LiveTour() {
  const reduce = useReducedMotion();
  const director = useRef<Director | null>(null);
  const originalFlag = useRef<string | null | undefined>(undefined);
  const [caption, setCaption] = useState("Getting a fresh board ready…");
  const [stepIndex, setStepIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [finished, setFinished] = useState(false);
  const [ledger, setLedger] = useState<Ledger>(null);
  const [showEnd, setShowEnd] = useState(false);

  // Keep the board's first-run coachmarks out of the live run (they mount once the prompt is
  // in), then restore the visitor's flag when the run ends or the page goes away.
  useEffect(() => {
    try {
      // A ref survives React's dev double-effect, so we never "restore" our own write.
      if (originalFlag.current === undefined) originalFlag.current = window.localStorage.getItem(COACH_KEY);
      window.localStorage.setItem(COACH_KEY, "true");
    } catch {
      return;
    }
    const restore = () => restoreCoachFlag(originalFlag.current);
    window.addEventListener("pagehide", restore);
    return () => window.removeEventListener("pagehide", restore);
  }, []);

  useEffect(() => {
    const d = new Director();
    director.current = d;
    const timings: Timing[] = [];
    const started = performance.now();
    window.__liveTour = { done: false, timings, totalMs: 0 };

    (async () => {
      for (const [i, step] of LIVE_STEPS.entries()) {
        d.resetSkip();
        setStepIndex(i);
        setCaption(step.caption);
        const t0 = performance.now();
        let skipped = false;
        try {
          await step.run(d, setCaption);
        } catch (err) {
          if (err instanceof StopSignal) return;
          skipped = true;
          if (!(err instanceof SkipSignal)) setCaption("That step hit a snag, so we're moving on.");
        }
        timings.push({ id: step.id, ms: Math.round(performance.now() - t0), skipped });
      }
      setCaption("That's the whole loop, live.");
      setLedger(await readLedger());
      restoreCoachFlag(originalFlag.current);
      setFinished(true);
      setShowEnd(true);
      window.__liveTour = { done: true, timings, totalMs: Math.round(performance.now() - started) };
    })();

    return () => d.stop();
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== " " || !e.isTrusted) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "TEXTAREA" || t.tagName === "INPUT")) return;
      e.preventDefault();
      setIsPaused((p) => {
        director.current?.pause(!p);
        return !p;
      });
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const togglePause = () =>
    setIsPaused((p) => {
      director.current?.pause(!p);
      return !p;
    });

  const transition = reduce ? reducedTransition : spring.gentle;

  return (
    <div className="relative">
      <Board />

      {!finished ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-[4.5rem] z-[45] flex justify-center px-3 sm:bottom-20">
          <div className="pointer-events-auto flex w-[min(40rem,100%)] items-center gap-3 rounded-2xl border border-rule bg-paper-raised/95 py-2 pr-2 pl-4 shadow-[var(--shadow-card)] backdrop-blur">
            <span className="flex shrink-0 items-center gap-1.5 text-[10px] font-semibold tracking-[0.16em] text-signal-ink uppercase">
              <span className={cn("size-2 rounded-full bg-signal", !isPaused && !reduce && "animate-pulse")} aria-hidden />
              Live
            </span>
            <AnimatePresence mode="wait" initial={false}>
              <motion.p
                key={caption}
                aria-live="polite"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={transition}
                className="min-w-0 flex-1 text-sm leading-snug text-ink"
              >
                {caption}
              </motion.p>
            </AnimatePresence>
            <span className="tnum hidden shrink-0 text-xs text-ink-faint sm:inline">
              {stepIndex + 1}/{LIVE_STEPS.length}
            </span>
            <button
              type="button"
              onClick={togglePause}
              className={cn("shrink-0 rounded-full border border-rule px-3 py-1 text-xs hover:border-ink", FOCUS)}
            >
              {isPaused ? "Resume" : "Pause"}
            </button>
            <button
              type="button"
              onClick={() => director.current?.skip()}
              className={cn("shrink-0 rounded-full px-2 py-1 text-xs text-ink-soft hover:text-ink", FOCUS)}
            >
              Skip step
            </button>
          </div>
        </div>
      ) : null}

      <AnimatePresence>
        {showEnd ? (
          <motion.div
            key="end"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={transition}
            className="fixed inset-0 z-[60] grid place-items-end bg-[oklch(22%_0.02_60/0.35)] p-4 sm:place-items-center"
          >
            <section aria-labelledby="live-end" className="w-full max-w-xl rounded-3xl bg-paper-raised p-6 shadow-[var(--shadow-card)] sm:p-8">
              <p className="text-xs tracking-[0.14em] text-signal-ink uppercase">The ledger · this live run</p>
              <h2 id="live-end" className="font-display mt-2 text-[clamp(1.8rem,1.2rem+2vw,2.8rem)] leading-[1.08] tracking-tight">
                You wrote {ledger?.ideas ?? "every"} ideas.
                <br />
                AI wrote <em className="text-signal-ink">0</em>
                {ledger ? ` and asked ${ledger.questions} question${ledger.questions === 1 ? "" : "s"}.` : "."}
              </h2>
              {ledger ? <p className="mt-2 text-sm text-ink-soft">Range finished at {ledger.range}.</p> : null}
              <div className="mt-6 flex flex-wrap gap-2">
                <a
                  href="/new"
                  className={cn("rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-paper-raised hover:-translate-y-px", FOCUS)}
                >
                  Start a whiteboard →
                </a>
                <Link href="/tour" className={cn("rounded-full border border-ink px-5 py-2.5 text-sm hover:bg-ink hover:text-paper-raised", FOCUS)}>
                  Guided feature tour
                </Link>
                <button
                  type="button"
                  onClick={() => setShowEnd(false)}
                  className={cn("rounded-full px-4 py-2.5 text-sm text-ink-soft hover:text-ink", FOCUS)}
                >
                  Explore this board
                </button>
              </div>
            </section>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
