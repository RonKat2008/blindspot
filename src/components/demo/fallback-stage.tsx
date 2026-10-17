"use client";

// Minimal stage built only from existing shared components, so /demo works before the
// whiteboard board lands. It exposes every TourAnchor via data-tour. Replace it by passing
// `renderStage` to <DemoTour /> once the real board accepts a DemoSnapshot.

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { DiversityMeter, ProvocationCard } from "@/components/provocation-card";
import { ScatterMap } from "@/components/scatter-map";
import { fadeUp, reducedTransition, spring } from "@/lib/motion";
import type { DemoSnapshot } from "./tour-script";

const noop = () => undefined;

export function FallbackStage({ snapshot }: { snapshot: DemoSnapshot }) {
  const reduce = useReducedMotion();
  const { state, view, draft, whyOpen, freshIds, revealId } = snapshot;
  const [xAxis, yAxis] = state.axes;
  const current = [...state.provocations].reverse().find((p) => p.status === "shown");

  return (
    <div className="mx-auto flex min-h-svh w-full max-w-5xl flex-col px-4 pb-28 sm:px-5">
      <header className="flex flex-wrap items-end justify-between gap-3 py-4">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">Blind Spot · demo</p>
          <h1 data-tour="question-heading" className="text-xl font-semibold sm:text-2xl">
            {state.session.prompt}
          </h1>
        </div>
        <div data-tour="range-meter">
          <DiversityMeter value={state.diversity} />
        </div>
      </header>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div data-tour="lens-bar" className="flex flex-wrap gap-1.5">
          {state.axes.map((axis, i) => (
            <span
              key={axis.id}
              className={`rounded-full border px-3 py-1 text-xs ${i < 2 ? "border-foreground/40 bg-card font-medium" : "border-border text-muted-foreground"}`}
            >
              {axis.poleA} ↔ {axis.poleB}
            </span>
          ))}
        </div>
        <div data-tour="lens-toggle" className="ml-auto flex rounded-full border border-border bg-card p-0.5 text-xs">
          {(["board", "lens"] as const).map((v) => (
            <span key={v} className={`rounded-full px-3 py-1 capitalize ${view === v ? "bg-foreground text-background" : "text-muted-foreground"}`}>
              {v}
            </span>
          ))}
        </div>
      </div>

      <div className="grid flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div data-tour="board" className="rounded-3xl border border-border bg-card p-3 sm:p-5">
          {view === "lens" && xAxis && yAxis ? (
            <ScatterMap
              ideas={state.ideas}
              xAxis={xAxis}
              yAxis={yAxis}
              overview={false}
              highlightIds={whyOpen && current ? current.why.ideaIds : []}
              revealId={revealId}
              freshIds={freshIds}
            />
          ) : (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <AnimatePresence initial={false}>
                {state.ideas.map((idea, i) => (
                  <motion.li
                    key={idea.id}
                    variants={reduce ? undefined : fadeUp}
                    initial={reduce ? false : "hidden"}
                    animate="show"
                    transition={reduce ? reducedTransition : spring.gentle}
                    className="min-h-20 rounded-md bg-[oklch(0.95_0.07_95)] p-3 text-sm text-[oklch(0.25_0.02_60)] shadow-sm"
                    style={{ rotate: `${((i * 7) % 5) - 2}deg` }}
                  >
                    {idea.text}
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          )}
        </div>
        <div data-tour="question-note" className="flex flex-col gap-3 self-start">
          {current ? (
            <ProvocationCard provocation={current} whyOpen={whyOpen} onWhy={noop} busy onAccept={noop} onDismiss={noop} />
          ) : (
            <p className="rounded-2xl border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
              A question shows up when the map notices a pattern. Never a suggestion.
            </p>
          )}
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t border-border bg-background/95 px-4 py-3 backdrop-blur sm:px-5">
        <div data-tour="add-sticky" className="mx-auto flex h-12 w-full max-w-5xl items-center rounded-lg border border-border bg-card px-3 text-base">
          {draft ? (
            <span>
              {draft}
              <span className="ml-0.5 inline-block h-5 w-px animate-pulse bg-foreground align-middle" />
            </span>
          ) : (
            <span className="text-muted-foreground">Add a sticky and press Enter</span>
          )}
        </div>
      </div>
    </div>
  );
}
