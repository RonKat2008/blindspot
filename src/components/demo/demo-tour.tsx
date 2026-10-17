"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Button } from "@/components/ui/button";
import { fadeUp, reducedTransition, spring } from "@/lib/motion";
import { FallbackStage } from "./fallback-stage";
import { Spotlight } from "./spotlight";
import { TOUR_STEPS, TOUR_TOTAL_MS, type DemoSnapshot } from "./tour-script";
import { useTour, type TourController } from "./use-tour";

export type DemoTourProps = {
  /** Start hands-free immediately (?autoplay=1). */
  autoplay?: boolean;
  /**
   * Renders the real UI for the current scripted snapshot. It must expose the anchors listed
   * in TourAnchor via `data-tour="<id>"`. Defaults to a stage built from shared components.
   */
  renderStage?: (snapshot: DemoSnapshot) => ReactNode;
};

const TOUR_SECONDS = Math.round(TOUR_TOTAL_MS / 1000);

export function DemoTour({ autoplay = false, renderStage }: DemoTourProps) {
  const tour = useTour(autoplay ? "autoplay" : "idle");
  const stage = renderStage ? renderStage(tour.snapshot) : <FallbackStage snapshot={tour.snapshot} />;
  const isAuto = tour.mode === "autoplay";

  return (
    <div className={isAuto ? "cursor-none" : undefined}>
      <div aria-hidden={tour.mode === "idle" ? true : undefined} inert={tour.mode === "idle" ? true : undefined}>
        {stage}
      </div>
      {tour.mode === "idle" ? (
        <EntryCard onStart={tour.start} />
      ) : tour.isLast ? (
        <Spotlight anchors={[]} large={isAuto}>
          {null}
        </Spotlight>
      ) : (
        <Spotlight anchors={tour.snapshot.focus} large={isAuto}>
          <StepBubble tour={tour} />
        </Spotlight>
      )}
      {tour.mode !== "idle" && tour.isLast ? <WrapUp tour={tour} /> : null}
    </div>
  );
}

function EntryCard({ onStart }: { onStart: (mode: "guide" | "autoplay") => void }) {
  const reduce = useReducedMotion();
  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-[oklch(0.2_0.02_60/0.55)] p-4 sm:place-items-center">
      <motion.section
        aria-labelledby="tour-entry-heading"
        variants={reduce ? undefined : fadeUp}
        initial={reduce ? false : "hidden"}
        animate="show"
        transition={reduce ? reducedTransition : spring.gentle}
        className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-2xl sm:p-8"
      >
        <p className="text-xs tracking-wide text-muted-foreground uppercase">Blind Spot · demo</p>
        <h2 id="tour-entry-heading" className="mt-2 text-3xl leading-tight font-semibold">
          Take the {TOUR_SECONDS > 85 ? 90 : TOUR_SECONDS}-second tour
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          A real brainstorm, scripted so it runs offline. Watch the AI find the gap, and watch a human fill it.
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <Button type="button" className="h-11 flex-1" autoFocus onClick={() => onStart("guide")}>
            Guide me
          </Button>
          <Button type="button" variant="outline" className="h-11 flex-1" onClick={() => onStart("autoplay")}>
            Autoplay (for video)
          </Button>
        </div>
        <p className="mt-4 text-center text-sm">
          <Link href="/" className="text-muted-foreground underline underline-offset-4 hover:text-foreground">
            Try it yourself →
          </Link>
        </p>
      </motion.section>
    </div>
  );
}

function StepBubble({ tour }: { tour: TourController }) {
  const step = TOUR_STEPS[tour.index];
  const isAuto = tour.mode === "autoplay";
  const progress = isAuto ? Math.min(1, tour.elapsed / step.durationMs) : 0;

  return (
    <div>
      <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
        <span className="tabular-nums">
          {tour.index + 1} / {TOUR_STEPS.length}
        </span>
        {isAuto ? <span>{tour.paused ? "Paused · Space to resume" : "Space to pause"}</span> : null}
      </div>
      <p className={`mt-2 leading-snug font-semibold ${isAuto ? "text-2xl sm:text-3xl" : "text-lg sm:text-xl"}`}>{step.caption}</p>
      {step.detail ? (
        <p className={`mt-1.5 text-muted-foreground ${isAuto ? "text-lg sm:text-xl" : "text-sm sm:text-base"}`}>{step.detail}</p>
      ) : null}
      {isAuto ? (
        <div className="mt-4 h-1 overflow-hidden rounded-full bg-muted">
          <div className="h-full origin-left bg-[oklch(0.72_0.17_62)]" style={{ transform: `scaleX(${progress})` }} />
        </div>
      ) : (
        <div className="mt-4 flex items-center gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={tour.skip}>
            Skip
          </Button>
          <span className="ml-auto hidden text-xs text-muted-foreground sm:inline">← → keys</span>
          <Button type="button" variant="outline" size="sm" onClick={tour.back} disabled={tour.index === 0}>
            Back
          </Button>
          <Button type="button" size="sm" autoFocus onClick={tour.next}>
            Next
          </Button>
        </div>
      )}
    </div>
  );
}

function WrapUp({ tour }: { tour: TourController }) {
  const reduce = useReducedMotion();
  const isAuto = tour.mode === "autoplay";
  const ideas = tour.snapshot.state.ideas.length;
  return (
    <div className="fixed inset-0 z-[60] grid place-items-end p-4 sm:place-items-center">
      <motion.section
        data-tour="wrap-up"
        aria-labelledby="tour-wrap-heading"
        variants={reduce ? undefined : fadeUp}
        initial={reduce ? false : "hidden"}
        animate="show"
        transition={reduce ? reducedTransition : spring.gentle}
        className="w-full max-w-xl rounded-3xl border border-border bg-card p-6 shadow-2xl sm:p-8"
      >
        <p className="text-xs tracking-wide text-muted-foreground uppercase">The ledger</p>
        <h2 id="tour-wrap-heading" className={`mt-2 leading-tight font-semibold ${isAuto ? "text-3xl sm:text-5xl" : "text-2xl sm:text-4xl"}`}>
          You wrote {ideas} ideas.
          <br />
          AI wrote <span className="text-[oklch(0.45_0.13_55)]">0 ideas</span> and asked 1 question.
        </h2>
        <dl className="mt-5 grid grid-cols-3 gap-3 text-center">
          {[
            ["Human ideas", String(ideas)],
            ["AI ideas", "0"],
            ["Questions", "1"],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl bg-muted px-2 py-3">
              <dt className="text-xs text-muted-foreground">{label}</dt>
              <dd className="text-2xl font-semibold tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Button className="h-11 flex-1" render={<Link href="/" />} nativeButton={false}>
            Try it with your own problem
          </Button>
          <Button variant="outline" className="h-11 flex-1" render={<Link href="/insights" />} nativeButton={false}>
            See the team view
          </Button>
          <Button variant="ghost" className="h-11" render={<Link href="/pitch" />} nativeButton={false}>
            Pitch
          </Button>
        </div>
        {!isAuto ? (
          <div className="mt-4 flex justify-between text-sm">
            <button type="button" className="text-muted-foreground underline-offset-4 hover:underline" onClick={tour.back}>
              ← Back
            </button>
            <button type="button" className="text-muted-foreground underline-offset-4 hover:underline" onClick={() => tour.start("guide")}>
              Replay tour
            </button>
          </div>
        ) : null}
      </motion.section>
    </div>
  );
}
