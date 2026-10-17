"use client";

import { motion, useReducedMotion } from "motion/react";
import type { Axis, Idea } from "@/lib/contract";
import { dotEnter, reducedTransition, revealRing, spring } from "@/lib/motion";

const PAD = 10;

function toPlot(score: number) {
  const clamped = Math.max(-1, Math.min(1, score));
  return PAD + ((clamped + 1) / 2) * (100 - PAD * 2);
}

type Quad = { key: string; x: number; y: number; sx: -1 | 1; sy: -1 | 1 };

const QUADS: Quad[] = [
  { key: "tl", x: PAD, y: PAD, sx: -1, sy: 1 },
  { key: "tr", x: 50, y: PAD, sx: 1, sy: 1 },
  { key: "bl", x: PAD, y: 50, sx: -1, sy: -1 },
  { key: "br", x: 50, y: 50, sx: 1, sy: -1 },
];

export function quadrantKey(x: number, y: number) {
  if (Math.abs(x) < 0.15 && Math.abs(y) < 0.15) return "center";
  const sx = x >= 0 ? "r" : "l";
  const sy = y >= 0 ? "t" : "b";
  return `${sy}${sx}`;
}

export function ScatterMap({
  ideas,
  xAxis,
  yAxis,
  overview,
  highlightIds,
  revealId,
  freshIds,
}: {
  ideas: Idea[];
  xAxis: Axis;
  yAxis: Axis;
  overview: boolean;
  highlightIds: string[];
  revealId?: string | null;
  freshIds: string[];
}) {
  const reduce = useReducedMotion();

  function coords(idea: Idea) {
    if (overview && idea.pca) return idea.pca;
    return {
      x: idea.axisScores[xAxis.id] ?? 0,
      y: idea.axisScores[yAxis.id] ?? 0,
    };
  }

  const occupied = new Set(ideas.map((idea) => quadrantKey(coords(idea).x, coords(idea).y)));

  const xLeft = overview ? "overview −" : xAxis.poleA;
  const xRight = overview ? "overview +" : xAxis.poleB;
  const yTop = overview ? "spread +" : yAxis.poleB;
  const yBottom = overview ? "spread −" : yAxis.poleA;

  return (
    <div className="relative aspect-square w-full">
      <svg viewBox="0 0 100 100" className="h-full w-full overflow-visible" role="img" aria-label="Idea map">
        <defs>
          <pattern id="empty-hatch" width="3" height="3" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="3" stroke="currentColor" strokeOpacity="0.28" strokeWidth="0.4" />
          </pattern>
        </defs>
        {QUADS.map((quad) => {
          const key = quadrantKey(quad.sx * 0.5, quad.sy * 0.5);
          const empty = !occupied.has(key);
          return (
            <rect
              key={quad.key}
              x={quad.x}
              y={quad.y}
              width={50 - PAD}
              height={50 - PAD}
              rx={1.5}
              fill={empty ? "url(#empty-hatch)" : "color-mix(in oklch, var(--accent) 55%, transparent)"}
            />
          );
        })}
        <line x1="50" y1={PAD} x2="50" y2={100 - PAD} stroke="currentColor" strokeOpacity="0.25" />
        <line x1={PAD} y1="50" x2={100 - PAD} y2="50" stroke="currentColor" strokeOpacity="0.25" />
        {ideas.map((idea) => {
          const { x, y } = coords(idea);
          const px = toPlot(x);
          const py = toPlot(-y);
          const hot = highlightIds.includes(idea.id);
          const fresh = freshIds.includes(idea.id);
          return (
            <g key={idea.id}>
              {revealId === idea.id && !reduce ? (
                <motion.circle
                  cx={px}
                  cy={py}
                  r={3}
                  fill="none"
                  stroke="oklch(0.62 0.16 55)"
                  strokeWidth={0.6}
                  initial={revealRing.initial}
                  animate={revealRing.animate}
                  transition={revealRing.transition}
                />
              ) : null}
              <motion.circle
                r={hot ? 2.4 : 1.8}
                fill={hot ? "oklch(0.55 0.16 45)" : "currentColor"}
                initial={
                  fresh && !reduce
                    ? { ...dotEnter.initial, cx: 50, cy: 98 }
                    : { cx: px, cy: py, scale: 1, opacity: 1 }
                }
                animate={{ ...dotEnter.animate, cx: px, cy: py }}
                transition={reduce ? reducedTransition : spring.flight}
              >
                <title>
                  {idea.text}
                  {` (${xAxis.poleA} ${x.toFixed(2)} → ${xAxis.poleB}, ${yAxis.poleA} ${y.toFixed(2)} → ${yAxis.poleB})`}
                </title>
              </motion.circle>
            </g>
          );
        })}
      </svg>
      <span className="pointer-events-none absolute top-1 left-1/2 max-w-[40%] -translate-x-1/2 truncate text-center text-[11px] text-muted-foreground" title={yTop}>
        {yTop}
      </span>
      <span className="pointer-events-none absolute bottom-1 left-1/2 max-w-[40%] -translate-x-1/2 truncate text-center text-[11px] text-muted-foreground" title={yBottom}>
        {yBottom}
      </span>
      <span className="pointer-events-none absolute top-1/2 left-1 max-w-[28%] -translate-y-1/2 truncate text-[11px] text-muted-foreground" title={xLeft}>
        {xLeft}
      </span>
      <span className="pointer-events-none absolute top-1/2 right-1 max-w-[28%] -translate-y-1/2 truncate text-right text-[11px] text-muted-foreground" title={xRight}>
        {xRight}
      </span>
    </div>
  );
}
