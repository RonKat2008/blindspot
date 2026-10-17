"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";
import { reducedTransition, spring } from "@/lib/motion";
import { AUTOPLAY_SECONDS, CHAPTERS } from "./chapters";
import { AutoplayClock } from "./autoplay-clock";
import { ChapterVisual } from "./chapter-visual";
import { ChapterCaption, EndCard } from "./stage";

/** 16 chapters + the end card. */
const LAST = CHAPTERS.length;
const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal-ink";

type Props = { initialIndex: number; initialAutoplay: boolean };

function syncUrl(index: number, isVideo: boolean): void {
  try {
    const params = new URLSearchParams(window.location.search);
    params.set("chapter", String(index + 1));
    if (isVideo) {
      params.set("autoplay", "1");
      params.set("mode", "guided");
    } else {
      params.delete("autoplay");
      params.delete("mode");
    }
    window.history.replaceState(window.history.state, "", `${window.location.pathname}?${params.toString()}`);
  } catch {
    // URL sync is a convenience; never block the tour on it.
  }
}

export function Tour({ initialIndex, initialAutoplay }: Props) {
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(initialIndex);
  const [direction, setDirection] = useState(1);
  const [isVideo, setIsVideo] = useState(initialAutoplay);
  const [isPaused, setIsPaused] = useState(false);

  const go = useCallback((next: number) => {
    const clamped = Math.max(0, Math.min(LAST, next));
    setIndex((cur) => {
      setDirection(clamped >= cur ? 1 : -1);
      return clamped;
    });
  }, []);

  const next = useCallback(() => setIndex((cur) => {
    setDirection(1);
    return Math.min(LAST, cur + 1);
  }), []);
  const back = useCallback(() => setIndex((cur) => {
    setDirection(-1);
    return Math.max(0, cur - 1);
  }), []);

  const startVideo = useCallback(() => {
    setDirection(1);
    setIndex((cur) => (cur === LAST ? 0 : cur));
    setIsPaused(false);
    setIsVideo(true);
  }, []);

  useEffect(() => syncUrl(index, isVideo), [index, isVideo]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "ArrowRight") {
        e.preventDefault();
        next();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        back();
      } else if (e.key === " " && isVideo) {
        e.preventDefault();
        setIsPaused((p) => !p);
      } else if (e.key === "Escape" && isVideo) {
        setIsVideo(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, back, isVideo]);

  const onClockDone = useCallback(() => {
    if (index >= LAST) {
      setIsVideo(false);
      return;
    }
    next();
  }, [index, next]);

  const transition = reduce ? reducedTransition : spring.gentle;
  const progress = (index + 1) / (LAST + 1);

  return (
    <div className={cn("relative z-[1] flex min-h-dvh flex-col bg-paper text-ink")}>
      <header className="flex items-center justify-between gap-3 border-b border-rule px-4 py-3 sm:px-8">
        <Link href="/" className={cn("rounded-sm font-display text-lg", FOCUS)}>
          Blind Spot <span className="text-ink-faint">· tour</span>
        </Link>
        {isVideo ? (
          <p className="text-xs text-ink-faint" aria-live="polite">
            {isPaused ? "Paused · Space to resume" : "Space to pause · Esc to exit"}
          </p>
        ) : (
          <div className="flex items-center gap-2">
          <a
            href="/tour?live=1"
            className={cn(
              "rounded-full bg-ink px-4 py-1.5 text-sm text-paper-raised transition-transform hover:-translate-y-px active:scale-[0.97]",
              FOCUS,
            )}
          >
            ● Watch it live
          </a>
          <button
            type="button"
            onClick={startVideo}
            className={cn(
              "rounded-full border border-ink px-4 py-1.5 text-sm transition-[background-color,color,transform] hover:bg-ink hover:text-paper-raised active:scale-[0.97]",
              FOCUS,
            )}
          >
            ▶ Autoplay<span className="max-sm:hidden"> for video</span>
          </button>
          </div>
        )}
      </header>

      <div className="grid min-w-0 flex-1 lg:grid-cols-[15rem_minmax(0,1fr)]">
        <ChapterRail index={index} onSelect={go} progress={progress} isVideo={isVideo} />

        <main className="flex min-w-0 flex-col px-4 pt-4 pb-4 sm:px-6 lg:px-8 lg:pt-6">
          {isVideo && (
            <AutoplayClock chapterKey={index} seconds={AUTOPLAY_SECONDS} isPaused={isPaused} onDone={onClockDone} />
          )}
          <div className="relative min-w-0 flex-1 pt-4">
            {index < LAST ? (
              <div className="grid min-w-0 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_21rem]">
                <ChapterVisual chapter={CHAPTERS[index]} />
                <AnimatePresence mode="wait" custom={direction} initial={false}>
                  <motion.div
                    key={index}
                    initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16 * direction }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduce ? { opacity: 0 } : { opacity: 0, y: -12 * direction }}
                    transition={transition}
                    className="min-w-0"
                  >
                    <ChapterCaption chapter={CHAPTERS[index]} number={index + 1} total={LAST} isVideo={isVideo} />
                  </motion.div>
                </AnimatePresence>
              </div>
            ) : (
              <motion.div initial={reduce ? { opacity: 0 } : { opacity: 0, x: 32 }} animate={{ opacity: 1, x: 0 }} transition={transition}>
                <EndCard isVideo={isVideo} onRestart={() => go(0)} />
              </motion.div>
            )}
          </div>

          <nav
            aria-label="Tour controls"
            className={cn(
              "mt-6 flex items-center justify-between gap-3 border-t border-rule pt-4 transition-opacity",
              isVideo && "pointer-events-none opacity-0",
            )}
          >
            <button
              type="button"
              onClick={back}
              disabled={index === 0}
              className={cn("rounded-full px-4 py-2 text-sm text-ink-soft hover:text-ink disabled:opacity-30", FOCUS)}
            >
              ← Back
            </button>
            <p className="hidden text-xs text-ink-faint sm:block">Use ← → keys</p>
            <button
              type="button"
              onClick={next}
              disabled={index === LAST}
              className={cn(
                "rounded-full bg-ink px-5 py-2 text-sm text-paper-raised transition-transform hover:-translate-y-px active:scale-[0.97] disabled:opacity-30",
                FOCUS,
              )}
            >
              Next →
            </button>
          </nav>
        </main>
      </div>
    </div>
  );
}

type RailProps = { index: number; onSelect: (i: number) => void; progress: number; isVideo: boolean };

function ChapterRail({ index, onSelect, progress, isVideo }: RailProps) {
  const reduce = useReducedMotion();
  const listRef = useRef<HTMLOListElement>(null);
  const items = [...CHAPTERS.map((c) => c.label), "Start yours"];

  // On narrow screens the rail is a horizontal strip: keep the active chapter in view.
  useEffect(() => {
    const list = listRef.current;
    if (!list || list.scrollWidth <= list.clientWidth) return;
    const active = list.querySelector<HTMLElement>("[aria-current='step']");
    if (!active) return;
    const left = active.offsetLeft - list.clientWidth / 2 + active.offsetWidth / 2;
    list.scrollTo({ left, behavior: reduce ? "auto" : "smooth" });
  }, [index, reduce]);
  return (
    <aside aria-label="Chapters" className="min-w-0 border-b border-rule bg-paper-sunk/60 lg:border-r lg:border-b-0">
      <div className="px-4 pt-4 sm:px-8 lg:px-6">
        <div className="flex items-baseline justify-between text-xs text-ink-soft">
          <span className="tracking-[0.12em] uppercase">Chapters</span>
          <span className="tnum">
            {Math.min(index + 1, CHAPTERS.length)} / {CHAPTERS.length}
          </span>
        </div>
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-rule">
          <motion.div
            className="h-full origin-left bg-ink"
            initial={false}
            animate={{ scaleX: progress }}
            transition={reduce ? reducedTransition : spring.settle}
          />
        </div>
      </div>
      <ol ref={listRef} className="flex gap-1 overflow-x-auto px-4 py-3 sm:px-8 lg:flex-col lg:overflow-visible lg:px-3 lg:py-4">
        {items.map((label, i) => {
          const isActive = i === index;
          return (
            <li key={label} className="shrink-0">
              <button
                type="button"
                onClick={() => onSelect(i)}
                aria-current={isActive ? "step" : undefined}
                tabIndex={isVideo ? -1 : 0}
                className={cn(
                  "relative flex w-full items-center gap-2.5 rounded-lg px-3 py-1.5 text-left text-sm transition-colors",
                  isActive ? "text-ink" : i < index ? "text-ink-soft" : "text-ink-faint hover:text-ink",
                  FOCUS,
                )}
              >
                {isActive && (
                  <motion.span
                    layoutId="tour-rail-active"
                    className="absolute inset-0 rounded-lg bg-paper-raised shadow-[var(--shadow-card)]"
                    transition={reduce ? reducedTransition : spring.gentle}
                  />
                )}
                <span className={cn("relative tnum text-xs", isActive ? "text-signal-ink" : "")}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className={cn("relative whitespace-nowrap", isActive ? "font-medium" : "max-lg:hidden")}>{label}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </aside>
  );
}
