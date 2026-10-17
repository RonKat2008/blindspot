"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { Axis } from "@/lib/contract";
import { duration, ease, reducedTransition } from "@/lib/motion";
import type { Cluster, Edge, HumanLink, PlotBox, QuadKey } from "./board-utils";
import { threadPath } from "./board-utils";

type Centers = Record<string, { x: number; y: number }>;

const HALO_COLORS = ["var(--axis-0)", "var(--axis-1)", "var(--axis-2)", "var(--axis-3)", "var(--axis-4)"];

export function ConnectionsLayer({
  width,
  height,
  centers,
  edges,
  clusters,
  links,
  hoverId,
  show,
  pendingLink,
  onRemoveLink,
}: {
  width: number;
  height: number;
  centers: Centers;
  edges: Edge[];
  clusters: Cluster[];
  links: HumanLink[];
  hoverId: string | null;
  show: boolean;
  pendingLink: { from: string; x: number; y: number } | null;
  onRemoveLink: (link: HumanLink) => void;
}) {
  const reduce = useReducedMotion();
  const draw = reduce ? reducedTransition : { duration: 0.9, ease: ease.outExpo };
  const from = pendingLink ? centers[pendingLink.from] : null;

  return (
    <svg
      aria-hidden={!links.length}
      className="pointer-events-none absolute top-0 left-0 z-[3] overflow-visible"
      width={width}
      height={height}
    >
      <defs>
        <filter id="bs-halo" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="28" />
        </filter>
      </defs>
      {show
        ? clusters.map((cluster, i) => (
            <g key={cluster.id} filter="url(#bs-halo)" opacity={0.22}>
              {cluster.ideaIds.map((id) =>
                centers[id] ? (
                  <circle key={id} cx={centers[id].x} cy={centers[id].y} r={96} fill={HALO_COLORS[i % HALO_COLORS.length]} />
                ) : null,
              )}
            </g>
          ))
        : null}
      <AnimatePresence>
        {show
          ? edges.map((edge) => {
              const a = centers[edge.a];
              const b = centers[edge.b];
              if (!a || !b) return null;
              const touched = hoverId !== null && (edge.a === hoverId || edge.b === hoverId);
              const base = 0.18 + Math.max(0, Math.min(1, edge.similarity)) * 0.4;
              const opacity = hoverId === null ? base : touched ? 0.9 : 0.06;
              return (
                <motion.path
                  key={`${edge.a}-${edge.b}`}
                  d={threadPath(a.x, a.y, b.x, b.y)}
                  fill="none"
                  stroke="var(--ink-soft)"
                  strokeLinecap="round"
                  strokeDasharray="1 0"
                  strokeWidth={0.8 + edge.similarity * 2.2}
                  initial={reduce ? { opacity: 0 } : { pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity }}
                  exit={{ opacity: 0, transition: { duration: duration.fast } }}
                  transition={draw}
                />
              );
            })
          : null}
      </AnimatePresence>
      {links.map((link) => {
        const a = centers[link.a];
        const b = centers[link.b];
        if (!a || !b) return null;
        return (
          <g key={`h-${link.a}-${link.b}`} className="pointer-events-auto cursor-pointer" onClick={() => onRemoveLink(link)}>
            <title>Your connection. Click to remove it.</title>
            <path d={threadPath(a.x, a.y, b.x, b.y)} fill="none" stroke="transparent" strokeWidth={14} />
            <motion.path
              d={threadPath(a.x, a.y, b.x, b.y)}
              fill="none"
              stroke="var(--ink)"
              strokeWidth={2.2}
              strokeLinecap="round"
              initial={reduce ? false : { pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={draw}
            />
            <circle cx={a.x} cy={a.y} r={3.5} fill="var(--ink)" />
            <circle cx={b.x} cy={b.y} r={3.5} fill="var(--ink)" />
          </g>
        );
      })}
      {from && pendingLink ? (
        <path
          d={threadPath(from.x, from.y, pendingLink.x, pendingLink.y)}
          fill="none"
          stroke="var(--ink)"
          strokeWidth={2}
          strokeDasharray="5 5"
          strokeLinecap="round"
        />
      ) : null}
    </svg>
  );
}

const QUADS: { key: QuadKey; col: 0 | 1; row: 0 | 1 }[] = [
  { key: "tl", col: 0, row: 0 },
  { key: "tr", col: 1, row: 0 },
  { key: "bl", col: 0, row: 1 },
  { key: "br", col: 1, row: 1 },
];

export function LensGrid({
  box,
  xAxis,
  yAxis,
  occupied,
  selected,
  onSelect,
}: {
  box: PlotBox;
  xAxis: Axis;
  yAxis: Axis;
  occupied: Set<QuadKey>;
  selected: QuadKey | null;
  onSelect: (q: QuadKey | null) => void;
}) {
  const reduce = useReducedMotion();
  const fade = reduce ? reducedTransition : { duration: duration.slow, ease: ease.outExpo };
  const halfW = box.width / 2;
  // wide screens: x poles sit outside the frame at either end of the axis
  const outside = box.left >= 100;
  const halfH = box.height / 2;
  const xColor = `var(--axis-${xAxis.position % 6})`;
  const yColor = `var(--axis-${yAxis.position % 6})`;

  return (
    <motion.div
      className="pointer-events-none absolute inset-0 z-[1]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={fade}
    >
      {QUADS.map((q) => {
        const empty = !occupied.has(q.key);
        const isSel = selected === q.key;
        return (
          <button
            key={q.key}
            type="button"
            aria-label={empty ? "Empty corner — nobody's been here yet" : "Select this corner"}
            className={[
              "pointer-events-auto absolute rounded-md transition-colors",
              empty
                ? "hatch border border-dashed border-signal/60"
                : "bg-paper-sunk/60 hover:bg-paper-sunk",
              isSel ? "ring-2 ring-ink/70" : "",
            ].join(" ")}
            style={{
              left: box.left + q.col * halfW + 3,
              top: box.top + q.row * halfH + 3,
              width: halfW - 6,
              height: halfH - 6,
            }}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(isSel ? null : q.key);
            }}
          >
            {empty ? (
              <span className="font-display absolute inset-x-0 top-1/2 -translate-y-1/2 px-2 text-center text-sm text-signal-ink italic">
                nobody&rsquo;s been here yet
              </span>
            ) : null}
          </button>
        );
      })}
      {/* axes */}
      <div className="absolute h-px" style={{ left: box.left, top: box.top + halfH, width: box.width, background: xColor, opacity: 0.6 }} />
      <div className="absolute w-px" style={{ left: box.left + halfW, top: box.top, height: box.height, background: yColor, opacity: 0.6 }} />
      {/* pole labels */}
      <PoleLabel text={xAxis.poleA} color={xColor} style={outside ? { left: box.left - 10, top: box.top + halfH, transform: "translate(-100%, -50%)", maxWidth: box.left - 18 } : { left: box.left, top: box.top + box.height + 8, maxWidth: halfW - 70 }} align={outside ? "right" : "left"} arrow="←" />
      <PoleLabel text={xAxis.poleB} color={xColor} style={outside ? { left: box.left + box.width + 10, top: box.top + halfH, transform: "translateY(-50%)", maxWidth: 130 } : { left: box.left + box.width, top: box.top + box.height + 8, transform: "translateX(-100%)", maxWidth: halfW - 70 }} align="left" arrow="→" />
      <PoleLabel text={yAxis.poleB} color={yColor} style={{ left: box.left + halfW, top: box.top - 36, transform: "translateX(-50%)" }} align="center" arrow="↑" />
      <PoleLabel text={yAxis.poleA} color={yColor} style={{ left: box.left + halfW, top: box.top + box.height + 8, transform: "translateX(-50%)" }} align="center" arrow="↓" />
    </motion.div>
  );
}

function PoleLabel({
  text,
  color,
  style,
  align,
  arrow,
}: {
  text: string;
  color: string;
  style: React.CSSProperties;
  align: "left" | "right" | "center";
  arrow: string;
}) {
  return (
    <span
      className="absolute rounded-full border bg-paper-raised/95 px-2.5 py-1 text-xs leading-tight font-semibold shadow-sm max-sm:max-w-[42vw] max-sm:text-[11px]"
      style={{ ...style, color, borderColor: color, textAlign: align }}
    >
      {arrow === "→" ? `${text} ${arrow}` : `${arrow} ${text}`}
    </span>
  );
}
