"use client";

import { useEffect, useState } from "react";
import { animate, AnimatePresence, motion, useMotionValue, useReducedMotion } from "motion/react";
import { Button } from "@/components/ui/button";
import type { Provocation } from "@/lib/contract";
import { cardSlide, ease, reducedTransition, spring } from "@/lib/motion";
import { store } from "./board-utils";

const PATTERN_NAMES: Record<Provocation["type"], string> = {
  gap: "Empty corner",
  fixation: "Circling one spot",
  duplicate: "Twin ideas",
  abandoned: "A lonely idea",
  unexplored: "Unused lens",
  bridge: "A bridge",
  voice: "One voice",
  shortlist: "A lopsided shortlist",
  assumption: "A shared assumption",
};

export type QuestionNoteData = {
  id: string;
  text: string;
  patternName: string;
  explanation: string;
  refTexts: string[];
  /** Server provocations can be accepted/dismissed; local (human-link) ones are just closed. */
  local: boolean;
};

export function toNote(p: Provocation, textOf: (id: string) => string | undefined): QuestionNoteData {
  return {
    id: p.id,
    text: p.text,
    patternName: PATTERN_NAMES[p.type],
    explanation: p.why.explanation,
    refTexts: p.why.ideaIds.map(textOf).filter((t): t is string => Boolean(t)),
    local: false,
  };
}

export function QuestionNote({
  note,
  whyOpen,
  busy,
  onWhy,
  onAccept,
  onDismiss,
}: {
  note: QuestionNoteData | null;
  whyOpen: boolean;
  busy: boolean;
  onWhy: (open: boolean) => void;
  onAccept: () => void;
  onDismiss: () => void;
}) {
  const reduce = useReducedMotion();
  return (
    <AnimatePresence mode="popLayout">
      {note ? (
        <motion.aside
          key={note.id}
          aria-live="polite"
          aria-label="A question for you"
          variants={reduce ? undefined : cardSlide}
          initial={reduce ? { opacity: 0 } : "hidden"}
          animate={reduce ? { opacity: 1 } : "show"}
          exit={reduce ? { opacity: 0 } : "exit"}
          transition={reduce ? reducedTransition : spring.gentle}
          className="pointer-events-auto relative w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-[20px] bg-[oklch(30%_0.08_255)] p-4 sm:p-5 text-[oklch(96%_0.01_85)] shadow-[0_24px_48px_-20px_oklch(25%_0.08_255/0.7)]"
        >
          <span aria-hidden className="font-display pointer-events-none absolute -top-6 -right-1 text-[8rem] leading-none text-white/10 italic">
            ?
          </span>
          <p className="text-[11px] font-semibold tracking-[0.14em] text-[oklch(85%_0.1_75)] uppercase">A question for you</p>
          <p className="font-display mt-2 text-[1.1rem] leading-snug italic sm:text-[1.5rem]">{note.text}</p>
          <motion.div layout={!reduce} transition={spring.gentle}>
            <button
              type="button"
              aria-expanded={whyOpen}
              className="mt-3 text-sm text-white/70 underline decoration-white/30 underline-offset-4 transition-colors hover:text-white focus-visible:text-white"
              onClick={() => onWhy(!whyOpen)}
            >
              {whyOpen ? "Hide why" : "Why am I seeing this?"}
            </button>
            {whyOpen ? (
              <div className="mt-2 rounded-xl bg-white/10 p-3 text-sm">
                <p className="font-semibold">{note.patternName}</p>
                <p className="mt-1 text-white/80">{note.explanation}</p>
                {note.refTexts.length ? (
                  <ul className="mt-2 space-y-1 text-white/80">
                    {note.refTexts.slice(0, 4).map((t) => (
                      <li key={t} className="truncate">“{t}”</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : null}
          </motion.div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              type="button"
              disabled={busy}
              onClick={onAccept}
              className="h-9 bg-[oklch(85%_0.12_75)] px-4 text-ink hover:bg-[oklch(89%_0.12_75)]"
            >
              I&rsquo;ll explore that
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={busy}
              onClick={onDismiss}
              className="h-9 px-3 text-white/80 hover:bg-white/10 hover:text-white"
            >
              Not now
            </Button>
          </div>
        </motion.aside>
      ) : null}
    </AnimatePresence>
  );
}

export function RangeMeter({ value }: { value: number }) {
  const reduce = useReducedMotion();
  const mv = useMotionValue(value);
  const [shown, setShown] = useState(value);

  useEffect(() => {
    if (reduce) {
      mv.set(value);
      return;
    }
    const controls = animate(mv, value, { duration: 1.2, ease: ease.outExpo, onUpdate: (v) => setShown(Math.round(v)) });
    return () => controls.stop();
  }, [value, reduce, mv]);

  const display = reduce ? value : shown;
  return (
    <div
      tabIndex={0}
      className="group relative flex items-center gap-3 rounded-full border border-rule bg-paper-raised/90 py-1.5 pr-4 pl-3 shadow-sm backdrop-blur"
      aria-label={`Range ${value} out of 100`}
    >
      <span className="font-display tnum w-8 text-right text-2xl leading-none font-semibold">{display}</span>
      <div className="w-16">
        <p className="text-[10px] font-semibold tracking-[0.14em] text-ink-soft uppercase">Range</p>
        <div className="mt-1 h-1 overflow-hidden rounded-full bg-paper-sunk">
          <motion.div
            className="h-full origin-left rounded-full bg-signal"
            initial={false}
            animate={{ scaleX: Math.max(0.02, Math.min(1, value / 100)) }}
            transition={reduce ? reducedTransition : spring.settle}
          />
        </div>
      </div>
      <div
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-0 mb-2 w-64 rounded-xl border border-rule bg-paper-raised p-3 text-xs text-ink-soft opacity-0 shadow-[var(--shadow-card)] transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
      >
        How spread out your ideas are across the lenses. Higher means you&rsquo;re covering more ground — not that the
        ideas are better.
      </div>
    </div>
  );
}

const TOUR_KEY = "bs-board-tour-done";
const TOUR = [
  { title: "Type your question", body: "Start with what you're brainstorming, up top. Press Enter when it reads right." },
  { title: "Click anywhere to add an idea", body: "Each click drops a sticky. Or just start typing. Quantity beats polish." },
  { title: "Flip to Lens view", body: "Press L to see your notes on two lenses. Hatched corners are your blind spots." },
];

export function BoardCoach({ step, onStep }: { step: number; onStep: (next: number) => void }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(() => setOpen(!store.flag(TOUR_KEY)), 600);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        store.setFlag(TOUR_KEY);
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!open || step >= TOUR.length) return null;
  const item = TOUR[step];
  const close = () => {
    store.setFlag(TOUR_KEY);
    setOpen(false);
  };

  return (
    <motion.div
      role="dialog"
      aria-label="Quick tour"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="pointer-events-auto w-[min(20rem,calc(100vw-2rem))] rounded-2xl border border-rule bg-paper-raised p-4 shadow-[var(--shadow-card)]"
    >
      <div className="flex items-center justify-between">
        <div className="flex gap-1" aria-label={`Step ${step + 1} of ${TOUR.length}`}>
          {TOUR.map((t, i) => (
            <span key={t.title} className={`h-1.5 rounded-full transition-all ${i === step ? "w-5 bg-ink" : "w-1.5 bg-rule"}`} />
          ))}
        </div>
        <button type="button" onClick={close} className="text-xs text-ink-soft underline-offset-2 hover:text-ink hover:underline">
          Skip tour
        </button>
      </div>
      <p className="font-display mt-3 text-lg leading-tight">{item.title}</p>
      <p className="mt-1 text-sm text-ink-soft">{item.body}</p>
      <div className="mt-3 flex justify-end">
        <Button
          type="button"
          size="sm"
          onClick={() => {
            if (step >= TOUR.length - 1) close();
            else onStep(step + 1);
          }}
        >
          {step >= TOUR.length - 1 ? "Got it" : "Next"}
        </Button>
      </div>
    </motion.div>
  );
}
