"use client";

import { motion, useReducedMotion } from "motion/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { SessionState } from "@/lib/contract";
import { ScatterMap } from "@/components/scatter-map";
import { reducedTransition, spring } from "@/lib/motion";

export function WrapUp({ state, onClose }: { state: SessionState; onClose: () => void }) {
  const reduce = useReducedMotion();
  const asked = state.provocations.length;
  const taken = state.provocations.filter((p) => p.status === "accepted").length;
  const xAxis = state.axes[0];
  const yAxis = state.axes[1] ?? state.axes[0];

  async function copy() {
    const md = [`# ${state.session.prompt}`, "", ...state.ideas.map((i) => `- ${i.text}`)].join("\n");
    try {
      await navigator.clipboard.writeText(md);
      toast("Copied your ideas as a list.");
    } catch {
      toast("Couldn't copy. Select the list and copy it by hand.");
    }
  }

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label="Wrap up"
      className="fixed inset-0 z-50 overflow-y-auto bg-paper/95 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={reduce ? reducedTransition : { duration: 0.25 }}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
    >
      <motion.div
        className="mx-auto grid w-full max-w-5xl gap-8 px-5 py-10 sm:px-8 lg:grid-cols-[1.1fr_1fr] lg:py-16"
        initial={reduce ? false : { y: 16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={reduce ? reducedTransition : spring.gentle}
      >
        <div>
          <p className="text-[11px] font-semibold tracking-[0.18em] text-ink-soft uppercase">The ledger</p>
          <h2 className="font-display mt-3 text-[clamp(2.25rem,1.4rem+3.5vw,4rem)] leading-[1.02] tracking-tight">
            You wrote {state.ideas.length} idea{state.ideas.length === 1 ? "" : "s"}.{" "}
            <span className="text-signal-ink italic">AI wrote 0.</span>
          </h2>
          <p className="mt-4 text-lg text-ink-soft">
            It asked {asked} question{asked === 1 ? "" : "s"}; you took {taken}. Range ended at{" "}
            <span className="font-display tnum text-ink">{state.diversity}</span>.
          </p>
          <ul className="mt-6 max-h-64 space-y-1.5 overflow-y-auto border-l-2 border-rule pl-4 text-sm">
            {state.ideas.map((i) => (
              <li key={i.id}>{i.text}</li>
            ))}
          </ul>
          <div className="mt-6 flex flex-wrap gap-2">
            <Button type="button" className="h-10 px-4" onClick={() => void copy()}>
              Copy ideas
            </Button>
            <Button type="button" variant="ghost" className="h-10 px-4" onClick={onClose} autoFocus>
              Back to the board
            </Button>
          </div>
        </div>
        {xAxis && yAxis ? (
          <div className="rounded-3xl border border-rule bg-paper-raised p-4 shadow-[var(--shadow-card)] sm:p-6">
            <ScatterMap ideas={state.ideas} xAxis={xAxis} yAxis={yAxis} overview={false} highlightIds={[]} freshIds={[]} />
          </div>
        ) : null}
      </motion.div>
    </motion.div>
  );
}
