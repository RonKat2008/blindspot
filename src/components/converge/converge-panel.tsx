"use client";

/**
 * Usage (orchestrator mounts this; do not import from the board yet):
 *
 *   <ConvergePanel
 *     state={state}
 *     onToggleShortlist={(ideaId, next) => patchIdea(ideaId, { shortlisted: next })}
 *   />
 *
 * After diverging, the team clicks or drags stickies into a Shortlist lane
 * (five at most). Lens bars show the shape of those choices. Nothing here
 * ranks or scores an idea's quality.
 */

import { useId, useRef, useState } from "react";
import { Reorder, motion, useReducedMotion } from "motion/react";
import type { Axis, Idea, SessionState } from "@/lib/contract";
import { reducedTransition, spring } from "@/lib/motion";

const SHORTLIST_MAX = 5;
const END = 0.3;

const PENCILS = [
  "oklch(55% 0.13 250)",
  "oklch(55% 0.14 330)",
  "oklch(58% 0.12 150)",
  "oklch(58% 0.13 30)",
  "oklch(55% 0.10 280)",
  "oklch(55% 0.08 200)",
];

type ConvergePanelProps = {
  state: SessionState;
  onToggleShortlist: (ideaId: string, next: boolean) => void;
};

function isAssumption(idea: Idea) {
  return idea.kind === "assumption";
}

function endOf(score: number): -1 | 0 | 1 {
  if (score <= -END) return -1;
  if (score >= END) return 1;
  return 0;
}

/** True when every shortlisted idea sits on the same end of this lens. */
export function shortlistOnOneEnd(ideas: Idea[], axisId: string): boolean {
  if (ideas.length === 0) return false;
  const ends = ideas.map((idea) => endOf(idea.axisScores[axisId] ?? 0));
  const first = ends[0];
  return first !== 0 && ends.every((end) => end === first);
}

function pointIn(rect: DOMRect, x: number, y: number) {
  return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
}

export function ConvergePanel({ state, onToggleShortlist }: ConvergePanelProps) {
  const reduce = useReducedMotion() ?? false;
  const transition = reduce ? reducedTransition : spring.gentle;
  const headingId = useId();
  const statusId = useId();
  const laneRef = useRef<HTMLDivElement>(null);
  const pool = state.ideas.filter((idea) => !isAssumption(idea) && !idea.shortlisted);
  const shortlisted = state.ideas.filter((idea) => !isAssumption(idea) && idea.shortlisted);
  const [order, setOrder] = useState<string[]>(() => shortlisted.map((idea) => idea.id));
  const known = shortlisted.map((idea) => idea.id).join("|");
  const [seen, setSeen] = useState(known);
  if (known !== seen) {
    setSeen(known);
    setOrder(shortlisted.map((idea) => idea.id));
  }
  const byId = new Map(shortlisted.map((idea) => [idea.id, idea]));
  const ordered = order.map((id) => byId.get(id)).filter((idea): idea is Idea => Boolean(idea));
  const full = ordered.length >= SHORTLIST_MAX;

  function add(ideaId: string) {
    if (full) return;
    onToggleShortlist(ideaId, true);
  }

  return (
    <section
      aria-labelledby={headingId}
      className="flex w-full min-w-0 flex-col gap-4 p-4 text-[var(--ink,oklch(22%_0.02_60))]"
      style={{ background: "var(--paper, oklch(97.5% 0.012 85))" }}
    >
      <header className="flex flex-col gap-1">
        <h2
          id={headingId}
          className="font-serif text-2xl font-medium"
          style={{ fontFamily: "var(--font-fraunces), Georgia, serif" }}
        >
          Converge
        </h2>
        <p className="max-w-prose text-sm leading-relaxed" style={{ color: "var(--ink-soft, oklch(45% 0.02 60))" }}>
          Pick what you&apos;d actually pursue. Blind Spot will check the shape of your choices, not their merit.
        </p>
      </header>

      <div
        ref={laneRef}
        id="shortlist-lane"
        className="flex min-h-36 flex-col gap-2 rounded-2xl border border-dashed p-3"
        style={{
          borderColor: "var(--rule, oklch(86% 0.02 80))",
          background: "var(--paper-sunk, oklch(94% 0.016 85))",
        }}
      >
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="text-xs font-medium tracking-wide uppercase">Shortlist</h3>
          <p id={statusId} className="text-xs" style={{ color: "var(--ink-faint, oklch(62% 0.015 60))" }}>
            {ordered.length} of {SHORTLIST_MAX}
          </p>
        </div>
        {ordered.length === 0 ? (
          <p className="py-6 text-center text-sm" style={{ color: "var(--ink-soft, oklch(45% 0.02 60))" }}>
            Drag a sticky here, or click one below.
          </p>
        ) : (
          <Reorder.Group
            axis="y"
            values={order}
            onReorder={setOrder}
            className="flex list-none flex-col gap-2 p-0"
            aria-label="Shortlisted ideas"
          >
            {ordered.map((idea) => (
              <Reorder.Item
                key={idea.id}
                value={idea.id}
                dragListener={!reduce}
                className="list-none"
                transition={transition}
              >
                <Sticky
                  idea={idea}
                  shortlisted
                  disabled={false}
                  reduce={reduce}
                  onActivate={() => onToggleShortlist(idea.id, false)}
                />
              </Reorder.Item>
            ))}
          </Reorder.Group>
        )}
      </div>

      <LensReadout axes={state.axes} ideas={ordered} />

      <div className="flex flex-col gap-2">
        <h3 className="text-xs font-medium tracking-wide uppercase">Still on the table</h3>
        {pool.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--ink-soft, oklch(45% 0.02 60))" }}>
            Every idea is on the shortlist.
          </p>
        ) : (
          <ul className="flex list-none flex-col gap-2 p-0">
            {pool.map((idea) => (
              <li key={idea.id}>
                <motion.div
                  drag={reduce || full ? false : true}
                  dragSnapToOrigin
                  dragMomentum={false}
                  whileDrag={reduce ? undefined : { scale: 1.03, zIndex: 2 }}
                  transition={transition}
                  onDragEnd={(_, info) => {
                    const lane = laneRef.current?.getBoundingClientRect();
                    if (!lane || full) return;
                    if (pointIn(lane, info.point.x, info.point.y)) add(idea.id);
                  }}
                >
                  <Sticky
                    idea={idea}
                    shortlisted={false}
                    disabled={full}
                    reduce={reduce}
                    describedBy={statusId}
                    onActivate={() => add(idea.id)}
                  />
                </motion.div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function Sticky({
  idea,
  shortlisted,
  disabled,
  reduce,
  describedBy,
  onActivate,
}: {
  idea: Idea;
  shortlisted: boolean;
  disabled: boolean;
  reduce: boolean;
  describedBy?: string;
  onActivate: () => void;
}) {
  const label = shortlisted
    ? `Remove “${idea.text}” from the shortlist`
    : disabled
      ? `Shortlist is full. “${idea.text}” stays on the table`
      : `Add “${idea.text}” to the shortlist`;

  return (
    <motion.button
      type="button"
      disabled={disabled}
      aria-pressed={shortlisted}
      aria-label={label}
      aria-describedby={describedBy}
      onClick={onActivate}
      whileTap={reduce || disabled ? undefined : { scale: 0.98 }}
      transition={reduce ? reducedTransition : spring.snappy}
      className="w-full cursor-grab rounded-md px-3 py-3 text-left text-sm leading-snug shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
      style={{
        background: idea.color ?? "oklch(92% 0.09 95)",
        color: "oklch(22% 0.02 60)",
        transform: "rotate(-0.4deg)",
      }}
    >
      <span className="line-clamp-4">{idea.text}</span>
      {idea.speaker ? (
        <span className="mt-1 block text-xs" style={{ color: "oklch(40% 0.03 60)" }}>
          {idea.speaker}
        </span>
      ) : null}
    </motion.button>
  );
}

function LensReadout({ axes, ideas }: { axes: Axis[]; ideas: Idea[] }) {
  const sorted = [...axes].sort((a, b) => a.position - b.position);
  return (
    <div className="flex flex-col gap-3" aria-label="Where the shortlist sits on each lens">
      <h3 className="text-xs font-medium tracking-wide uppercase">Shape of the shortlist</h3>
      {ideas.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--ink-soft, oklch(45% 0.02 60))" }}>
          The bars fill in once something is shortlisted.
        </p>
      ) : (
        <ul className="flex list-none flex-col gap-3 p-0">
          {sorted.map((axis) => {
            const piled = shortlistOnOneEnd(ideas, axis.id);
            const color = PENCILS[axis.position % PENCILS.length];
            return (
              <li key={axis.id}>
                <div className="mb-1 flex justify-between gap-2 text-xs">
                  <span>{axis.poleA}</span>
                  <span>{axis.poleB}</span>
                </div>
                <div
                  className="relative h-3 rounded-full"
                  style={{
                    background: piled ? "oklch(94% 0.05 75)" : "var(--paper-raised, oklch(99% 0.006 85))",
                    boxShadow: piled ? `inset 0 0 0 1.5px ${color}` : "inset 0 0 0 1px var(--rule, oklch(86% 0.02 80))",
                  }}
                  role="img"
                  aria-label={
                    piled
                      ? `The whole shortlist sits toward one end of ${axis.poleA} to ${axis.poleB}.`
                      : `Shortlist spread between ${axis.poleA} and ${axis.poleB}.`
                  }
                >
                  {ideas.map((idea) => {
                    const score = Math.min(1, Math.max(-1, idea.axisScores[axis.id] ?? 0));
                    const left = ((score + 1) / 2) * 100;
                    return (
                      <span
                        key={idea.id}
                        className="absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
                        style={{ left: `${left}%`, background: color }}
                      />
                    );
                  })}
                </div>
                {piled ? (
                  <p className="mt-1 text-xs" style={{ color: "var(--signal-ink, oklch(45% 0.13 55))" }}>
                    The whole shortlist sits on one end of this lens.
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
