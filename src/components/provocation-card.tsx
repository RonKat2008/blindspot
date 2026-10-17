"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Button } from "@/components/ui/button";
import type { Provocation } from "@/lib/contract";
import { cardSlide, reducedTransition, spring } from "@/lib/motion";

const LABELS: Record<Provocation["type"], string> = {
  gap: "A gap",
  fixation: "A fixation",
  duplicate: "Near-duplicates",
  abandoned: "An abandoned outlier",
  unexplored: "An unexplored lens",
  bridge: "A bridge",
  voice: "One voice",
  shortlist: "A lopsided shortlist",
  assumption: "A shared assumption",
};

export function ProvocationCard({
  provocation,
  onWhy,
  whyOpen,
  onAccept,
  onDismiss,
  busy,
}: {
  provocation: Provocation;
  onWhy: (open: boolean) => void;
  whyOpen: boolean;
  onAccept: () => void;
  onDismiss: () => void;
  busy: boolean;
}) {
  const reduce = useReducedMotion();

  return (
    <AnimatePresence>
      <motion.aside
        key={provocation.id}
        variants={reduce ? undefined : cardSlide}
        initial={reduce ? { opacity: 0 } : "hidden"}
        animate={reduce ? { opacity: 1 } : "show"}
        exit={reduce ? { opacity: 0 } : "exit"}
        transition={reduce ? reducedTransition : spring.gentle}
        className="rounded-2xl border border-border bg-card p-4 shadow-sm"
      >
        <p className="text-xs tracking-wide text-muted-foreground uppercase">{LABELS[provocation.type]}</p>
        <p className="mt-2 text-lg leading-snug font-medium">{provocation.text}</p>
        <button
          type="button"
          className="mt-3 text-sm text-muted-foreground underline-offset-2 hover:underline"
          aria-expanded={whyOpen}
          onClick={() => onWhy(!whyOpen)}
        >
          Why am I seeing this?
        </button>
        {whyOpen ? (
          <p className="mt-2 rounded-lg bg-muted px-3 py-2 text-sm">{provocation.why.explanation}</p>
        ) : null}
        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="button" disabled={busy} onClick={onAccept}>
            I’ll answer this
          </Button>
          <Button type="button" variant="ghost" disabled={busy} onClick={onDismiss}>
            Dismiss
          </Button>
        </div>
      </motion.aside>
    </AnimatePresence>
  );
}

export function DiversityMeter({ value }: { value: number }) {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(value);
  const shownRef = useRef(value);

  const display = reduce ? value : shown;

  useEffect(() => {
    if (reduce) {
      shownRef.current = value;
      return;
    }
    const startValue = shownRef.current;
    const delta = value - startValue;
    if (delta === 0) return;
    const steps = 18;
    let i = 0;
    const timer = window.setInterval(() => {
      i += 1;
      const next = Math.round(startValue + (delta * i) / steps);
      shownRef.current = next;
      setShown(next);
      if (i >= steps) window.clearInterval(timer);
    }, 40);
    return () => window.clearInterval(timer);
  }, [value, reduce]);

  return (
    <div className="min-w-28" title="How spread out your ideas are, from 0 (all in one corner) to 100 (many sides of every lens).">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs text-muted-foreground">Diversity</span>
        <span className="text-2xl font-semibold tabular-nums">{display}</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
        <motion.div
          className="h-full bg-primary"
          initial={false}
          animate={{ width: `${Math.max(0, Math.min(100, value))}%` }}
          transition={reduce ? reducedTransition : spring.settle}
        />
      </div>
    </div>
  );
}
