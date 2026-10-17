"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import { reducedTransition, spring } from "@/lib/motion";
import { SLIDES } from "./slides";

const LAST = SLIDES.length - 1;

export function Deck() {
  const reduce = useReducedMotion();
  const [[index, dir], setPage] = useState<[number, number]>([0, 1]);

  const go = useCallback((delta: number) => {
    setPage(([i]) => {
      const next = Math.min(LAST, Math.max(0, i + delta));
      return next === i ? [i, delta] : [next, delta];
    });
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "ArrowRight" || e.key === "PageDown" || e.key === " ") {
        e.preventDefault();
        go(1);
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        go(-1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  const slide = SLIDES[index];
  const variants = {
    enter: (d: number) => (reduce ? { opacity: 0 } : { opacity: 0, x: 80 * d }),
    center: { opacity: 1, x: 0 },
    exit: (d: number) => (reduce ? { opacity: 0 } : { opacity: 0, x: -80 * d }),
  };

  return (
    <div className="bs-scope relative flex min-h-dvh flex-col overflow-hidden" onClick={() => go(1)}>
      <header className="flex items-baseline justify-between px-4 pt-5 sm:px-10">
        <span className="display text-lg font-semibold tracking-tight">Blind Spot</span>
        <span className="tnum text-sm text-[var(--ink-soft)]" aria-live="polite">
          {index + 1} / {SLIDES.length}
        </span>
      </header>

      <main className="relative flex flex-1 items-center px-4 py-8 sm:px-10 lg:px-20" aria-label={`Slide ${index + 1}: ${slide.title}`}>
        <AnimatePresence mode="wait" custom={dir} initial={false}>
          <motion.section
            key={slide.id}
            custom={dir}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={reduce ? reducedTransition : spring.gentle}
            className="flex w-full justify-start"
          >
            {slide.render()}
          </motion.section>
        </AnimatePresence>
      </main>

      <nav className="flex items-center justify-between px-4 pb-5 sm:px-10" aria-label="Slide navigation" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={() => go(-1)}
          disabled={index === 0}
          className="rounded-[6px] px-3 py-2 text-sm text-[var(--ink-soft)] transition-colors hover:text-[var(--ink)] disabled:opacity-30"
        >
          ← Back
        </button>
        <div className="flex items-center gap-2">
          {SLIDES.map((s, i) => (
            <button
              key={s.id}
              type="button"
              aria-label={`Go to slide ${i + 1}: ${s.title}`}
              aria-current={i === index}
              onClick={() => setPage([i, i > index ? 1 : -1])}
              className="flex size-6 items-center justify-center"
            >
              <span className={`block h-2 rounded-full transition-all ${i === index ? "w-6 bg-[var(--ink)]" : "w-2 bg-[var(--rule)]"}`} />
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => go(1)}
          disabled={index === LAST}
          className="rounded-[6px] px-3 py-2 text-sm text-[var(--ink-soft)] transition-colors hover:text-[var(--ink)] disabled:opacity-30"
        >
          Next →
        </button>
      </nav>
    </div>
  );
}
