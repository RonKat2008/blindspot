"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { reducedTransition, spring } from "@/lib/motion";
import { SLIDES } from "./slides";

const LAST = SLIDES.length - 1;

export function Deck() {
  const reduce = useReducedMotion();
  const params = useSearchParams();
  const [[index, dir], setPage] = useState<[number, number]>([0, 1]);
  const [notesOn, setNotesOn] = useState(() => params.get("notes") === "1");

  const go = useCallback((delta: number) => {
    setPage(([i]) => {
      const next = Math.min(LAST, Math.max(0, i + delta));
      return next === i ? [i, delta] : [next, delta];
    });
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      if (e.key === "n" || e.key === "N") {
        e.preventDefault();
        setNotesOn((on) => !on);
        return;
      }
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
    <div
      className="bs-scope relative flex min-h-dvh flex-col overflow-hidden bg-[var(--paper)] text-[var(--ink)]"
      style={{
        backgroundImage:
          "radial-gradient(circle, color-mix(in oklch, var(--ink) 14%, transparent) 1px, transparent 1.4px)",
        backgroundSize: "22px 22px",
      }}
      onClick={() => go(1)}
    >
      <header className="flex items-baseline justify-between px-4 pt-4 sm:px-10 sm:pt-5">
        <span className="font-display text-lg font-semibold tracking-tight">Blind Spot</span>
        <span className="tnum text-sm text-[var(--ink-soft)]" aria-live="polite">
          {index + 1} / {SLIDES.length}
        </span>
      </header>

      <main
        className="relative flex flex-1 items-center overflow-y-auto px-4 py-6 sm:px-10 lg:px-16"
        aria-label={`Slide ${index + 1}: ${slide.title}`}
      >
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

      {notesOn && (
        <aside
          className="mx-4 mb-2 max-h-36 overflow-y-auto rounded-sm border border-[#1d4e89] bg-[#e7f0fb] px-4 py-3 text-sm leading-snug text-[#163a66] shadow-sm sm:mx-10"
          aria-label="Presenter notes"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-[#1d4e89]">Notes · N to hide</p>
          <p className="mt-1 font-display text-base">{slide.notes}</p>
        </aside>
      )}

      <nav
        className="flex items-center justify-between gap-2 px-3 pb-4 sm:px-10 sm:pb-5"
        aria-label="Slide navigation"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => go(-1)}
          disabled={index === 0}
          className="rounded-[6px] px-2 py-2 text-sm text-[var(--ink-soft)] hover:text-[var(--ink)] disabled:opacity-30"
        >
          ← Back
        </button>
        <div className="flex items-center gap-1 sm:gap-2">
          {SLIDES.map((s, i) => (
            <button
              key={s.id}
              type="button"
              aria-label={`Go to slide ${i + 1}: ${s.title}`}
              aria-current={i === index ? "true" : undefined}
              onClick={() => setPage([i, i > index ? 1 : -1])}
              className="flex size-5 items-center justify-center sm:size-6"
            >
              <span className={`block h-2 rounded-full ${i === index ? "w-5 bg-[var(--ink)] sm:w-6" : "w-2 bg-[var(--rule)]"}`} />
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => go(1)}
          disabled={index === LAST}
          className="rounded-[6px] px-2 py-2 text-sm text-[var(--ink-soft)] hover:text-[var(--ink)] disabled:opacity-30"
        >
          Next →
        </button>
      </nav>
    </div>
  );
}
