"use client";

import { useCallback, useEffect, useState } from "react";
import { snapshotAt, stepScriptEnd, TOUR_STEPS, type DemoSnapshot } from "./tour-script";

export type TourMode = "idle" | "guide" | "autoplay";

const TICK_MS = 50;

export type TourController = {
  mode: TourMode;
  index: number;
  elapsed: number;
  paused: boolean;
  snapshot: DemoSnapshot;
  isLast: boolean;
  start: (mode: Exclude<TourMode, "idle">) => void;
  stop: () => void;
  next: () => void;
  back: () => void;
  skip: () => void;
  togglePause: () => void;
};

/**
 * Step machine. One clock (`elapsed`) drives both the scripted keyframes and autoplay
 * advancement, so pausing freezes the animation and the timer together.
 */
export function useTour(initialMode: TourMode = "idle"): TourController {
  const [mode, setMode] = useState<TourMode>(initialMode);
  const [index, setIndex] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [paused, setPaused] = useState(false);
  const last = TOUR_STEPS.length - 1;

  const goTo = useCallback(
    (i: number) => {
      setIndex(Math.max(0, Math.min(last, i)));
      setElapsed(0);
    },
    [last],
  );

  const start = useCallback(
    (m: Exclude<TourMode, "idle">) => {
      setMode(m);
      setPaused(false);
      goTo(0);
    },
    [goTo],
  );
  const stop = useCallback(() => {
    setMode("idle");
    goTo(0);
  }, [goTo]);
  const next = useCallback(() => goTo(index + 1), [goTo, index]);
  const back = useCallback(() => goTo(index - 1), [goTo, index]);
  const skip = useCallback(() => goTo(last), [goTo, last]);
  const togglePause = useCallback(() => setPaused((p) => !p), []);

  // Clock.
  useEffect(() => {
    if (mode === "idle" || paused) return;
    const step = TOUR_STEPS[index];
    const limit = mode === "autoplay" ? step.durationMs : stepScriptEnd(index) + TICK_MS;
    const id = window.setInterval(() => {
      setElapsed((e) => Math.min(limit, e + TICK_MS));
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [mode, paused, index]);

  // Autoplay advancement (deferred so state is not set synchronously inside the effect body).
  useEffect(() => {
    if (mode !== "autoplay" || paused || index >= last) return;
    if (elapsed < TOUR_STEPS[index].durationMs) return;
    const id = window.setTimeout(() => goTo(index + 1), 0);
    return () => window.clearTimeout(id);
  }, [mode, paused, index, elapsed, last, goTo]);

  // Keyboard: ←/→ step, Space pause (autoplay), Esc skip to the end.
  useEffect(() => {
    if (mode === "idle") return;
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
      if (event.key === "ArrowRight") {
        event.preventDefault();
        goTo(index + 1);
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        goTo(index - 1);
      } else if (event.key === " " || event.code === "Space") {
        event.preventDefault();
        if (mode === "autoplay") setPaused((p) => !p);
        else goTo(index + 1);
      } else if (event.key === "Escape") {
        goTo(last);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mode, index, last, goTo]);

  return {
    mode,
    index,
    elapsed,
    paused,
    snapshot: snapshotAt(index, mode === "idle" ? 0 : elapsed),
    isLast: index >= last,
    start,
    stop,
    next,
    back,
    skip,
    togglePause,
  };
}
