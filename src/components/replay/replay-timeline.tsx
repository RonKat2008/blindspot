"use client";

/**
 * Usage (mount on the board; do not import this file from the board yet):
 *
 *   <ReplayTimeline
 *     state={state}
 *     onFrame={(visibleIdeaIds, visibleProvocationIds) => {
 *       setVisible({ ideas: visibleIdeaIds, questions: visibleProvocationIds });
 *     }}
 *   />
 *
 * Sits as a slim bar. Space plays or pauses while the bar is focused.
 * Arrow keys step one event. The parent hides ideas and questions not in the frame.
 */

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import type { SessionState } from "@/lib/contract";
import { buildFrames, ideaColor, type ReplayFrame } from "./frames";

const STEP_MS = 700;

type ReplayTimelineProps = {
  state: SessionState;
  onFrame: (visibleIdeaIds: string[], visibleProvocationIds: string[]) => void;
};

function formatClock(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export function ReplayTimeline({ state, onFrame }: ReplayTimelineProps) {
  const frames = useMemo(() => buildFrames(state), [state]);
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(frames.length - 1);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<1 | 4>(1);
  const [seenFrames, setSeenFrames] = useState(frames);
  const barRef = useRef<HTMLDivElement>(null);
  const labelId = useId();
  const dragging = useRef(false);

  if (seenFrames !== frames) {
    setSeenFrames(frames);
    setIndex(frames.length - 1);
    setPlaying(false);
  }

  const safeIndex = Math.min(Math.max(index, 0), frames.length - 1);
  const frame: ReplayFrame = frames[safeIndex];

  useEffect(() => {
    onFrame(frame.ideaIds, frame.provocationIds);
  }, [frame, onFrame]);

  useEffect(() => {
    if (!playing || reduced) return;
    const timer = window.setTimeout(() => {
      if (safeIndex >= frames.length - 1) setPlaying(false);
      else setIndex(safeIndex + 1);
    }, STEP_MS / speed);
    return () => window.clearTimeout(timer);
  }, [playing, speed, frames.length, reduced, safeIndex]);

  const seekFromClientX = useCallback(
    (clientX: number) => {
      const bar = barRef.current;
      if (!bar || frames.length <= 1) {
        setIndex(0);
        return;
      }
      const rect = bar.getBoundingClientRect();
      const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
      setIndex(Math.round(ratio * (frames.length - 1)));
    },
    [frames.length],
  );

  const spark = frames
    .map((item, i) => {
      const x = frames.length === 1 ? 50 : (i / (frames.length - 1)) * 100;
      const y = 18 - item.range * 16;
      return `${x},${y}`;
    })
    .join(" ");

  const ideaTotal = state.ideas.length;
  const ideaCount = frame.ideaIds.length;

  return (
    <section
      className="w-full min-w-0 border-t px-3 py-2 text-[12px]"
      style={{
        background: "var(--paper, oklch(97.5% 0.012 85))",
        borderColor: "var(--rule, oklch(86% 0.02 80))",
        color: "var(--ink, oklch(22% 0.02 60))",
        fontFamily: "var(--font-ui, var(--font-geist-sans), sans-serif)",
      }}
      aria-labelledby={labelId}
    >
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <p id={labelId} className="m-0" style={{ color: "var(--ink-soft, oklch(45% 0.02 60))" }}>
          Replay
        </p>
        <p className="m-0 tabular-nums" aria-live="polite">
          <time dateTime={frame.at}>{formatClock(frame.at)}</time>
          <span style={{ color: "var(--ink-soft, oklch(45% 0.02 60))" }}>
            {" "}
            · idea {ideaCount} of {ideaTotal}
          </span>
        </p>
      </div>

      <svg
        viewBox="0 0 100 20"
        className="mb-1 h-5 w-full"
        role="img"
        aria-label={`Range across the replay, now ${Math.round(frame.range * 100)}`}
        preserveAspectRatio="none"
      >
        <polyline
          fill="none"
          stroke="oklch(55% 0.13 250)"
          strokeWidth="1.25"
          vectorEffect="non-scaling-stroke"
          points={spark}
        />
      </svg>

      <div
        ref={barRef}
        role="slider"
        tabIndex={0}
        aria-label="Session replay"
        aria-valuemin={0}
        aria-valuemax={Math.max(frames.length - 1, 0)}
        aria-valuenow={safeIndex}
        aria-valuetext={`idea ${ideaCount} of ${ideaTotal}, ${formatClock(frame.at)}`}
        className="relative h-8 cursor-pointer rounded-md outline-none focus-visible:ring-2"
        style={{ background: "var(--paper-sunk, oklch(94% 0.016 85))" }}
        onPointerDown={(event) => {
          dragging.current = true;
          setPlaying(false);
          event.currentTarget.setPointerCapture(event.pointerId);
          seekFromClientX(event.clientX);
        }}
        onPointerMove={(event) => {
          if (!dragging.current) return;
          seekFromClientX(event.clientX);
        }}
        onPointerUp={() => {
          dragging.current = false;
        }}
        onKeyDown={(event) => {
          if (event.key === " " || event.key === "Spacebar") {
            event.preventDefault();
            if (reduced) return;
            setPlaying((value) => !value);
          } else if (event.key === "ArrowRight") {
            event.preventDefault();
            setPlaying(false);
            setIndex((value) => Math.min(frames.length - 1, value + 1));
          } else if (event.key === "ArrowLeft") {
            event.preventDefault();
            setPlaying(false);
            setIndex((value) => Math.max(0, value - 1));
          } else if (event.key === "Home") {
            event.preventDefault();
            setPlaying(false);
            setIndex(0);
          } else if (event.key === "End") {
            event.preventDefault();
            setPlaying(false);
            setIndex(frames.length - 1);
          }
        }}
      >
        {frames.map((item, i) => {
          const left = frames.length === 1 ? "50%" : `${(i / (frames.length - 1)) * 100}%`;
          const isNewIdea = i === 0 || item.ideaIds.length > frames[i - 1].ideaIds.length;
          if (isNewIdea) {
            const id = item.ideaIds[item.ideaIds.length - 1];
            const idea = state.ideas.find((entry) => entry.id === id);
            return (
              <span
                key={`tick-${i}`}
                className="absolute top-1 h-6 w-[3px] -translate-x-1/2 rounded-full"
                style={{ left, background: ideaColor(idea) }}
                aria-hidden
              />
            );
          }
          const id = item.provocationIds[item.provocationIds.length - 1];
          const question = state.provocations.find((entry) => entry.id === id);
          const accepted = question?.status === "accepted";
          return (
            <span
              key={`q-${i}`}
              className="absolute top-0.5 flex h-5 w-5 -translate-x-1/2 items-center justify-center rounded-full text-[11px] font-semibold"
              style={{
                left,
                background: accepted ? "oklch(55% 0.12 160)" : "oklch(55% 0.13 250)",
                color: "oklch(99% 0.006 85)",
                fontFamily: "var(--font-fraunces), serif",
              }}
              aria-hidden
            >
              {accepted ? "✓" : "?"}
            </span>
          );
        })}
        <span
          className="pointer-events-none absolute top-0 h-full w-0.5 -translate-x-1/2"
          style={{
            left: frames.length === 1 ? "50%" : `${(safeIndex / (frames.length - 1)) * 100}%`,
            background: "var(--ink, oklch(22% 0.02 60))",
          }}
          aria-hidden
        />
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="rounded-md px-3 py-1.5 text-[13px]"
          style={{ background: "var(--ink, oklch(22% 0.02 60))", color: "var(--paper, white)" }}
          onClick={() => {
            if (reduced) return;
            setPlaying((value) => {
              if (!value && safeIndex >= frames.length - 1) setIndex(0);
              return !value;
            });
          }}
          aria-pressed={playing}
          disabled={Boolean(reduced) || frames.length < 2}
        >
          {playing ? "Pause" : "Play"}
        </button>
        <button
          type="button"
          className="rounded-md border px-3 py-1.5 text-[13px]"
          style={{ borderColor: "var(--rule, oklch(86% 0.02 80))" }}
          aria-pressed={speed === 4}
          onClick={() => setSpeed((value) => (value === 1 ? 4 : 1))}
        >
          {speed === 1 ? "1×" : "4×"}
        </button>
        {reduced ? (
          <span style={{ color: "var(--ink-soft, oklch(45% 0.02 60))" }}>
            Playback is off while motion is reduced. Drag or use the arrow keys.
          </span>
        ) : null}
      </div>
    </section>
  );
}
