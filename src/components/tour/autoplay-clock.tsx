"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  /** Changes whenever the chapter changes; restarts the clock. */
  chapterKey: number;
  seconds: number;
  isPaused: boolean;
  onDone: () => void;
};

const TICK_MS = 100;

/**
 * Timed advance for autoplay. Uses a JS clock (not a CSS animation) so it still works when
 * prefers-reduced-motion collapses animations, and so Space can pause mid-chapter.
 * Renders the thin progress bar for the current chapter.
 */
export function AutoplayClock({ chapterKey, seconds, isPaused, onDone }: Props) {
  const [elapsed, setElapsed] = useState(0);
  const [prevKey, setPrevKey] = useState(chapterKey);
  const doneRef = useRef(onDone);

  useEffect(() => {
    doneRef.current = onDone;
  }, [onDone]);

  if (prevKey !== chapterKey) {
    setPrevKey(chapterKey);
    setElapsed(0);
  }

  useEffect(() => {
    if (isPaused) return;
    const id = window.setInterval(() => setElapsed((e) => e + TICK_MS), TICK_MS);
    return () => window.clearInterval(id);
  }, [isPaused, chapterKey]);

  const total = seconds * 1000;
  useEffect(() => {
    if (elapsed >= total) doneRef.current();
  }, [elapsed, total]);

  return (
    <div className="h-1 w-full overflow-hidden rounded-full bg-rule" aria-hidden>
      <div
        className="h-full w-full origin-left bg-signal"
        style={{ transform: `scaleX(${Math.min(elapsed / total, 1)})` }}
      />
    </div>
  );
}
