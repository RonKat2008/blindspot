"use client";

// Lightweight SVG replicas of the board's visual language (sticky notes, question notes,
// lens grid) for the tour illustrations. Colours come from the board's own palette.
import { useEffect, useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import { reducedTransition, spring } from "@/lib/motion";

export const STICKY = {
  butter: "oklch(93% 0.09 95)",
  blush: "oklch(91% 0.06 20)",
  mint: "oklch(92% 0.06 150)",
  sky: "oklch(91% 0.05 240)",
} as const;

/** Illustration canvas size (SVG viewBox units). */
export const VB = { w: 480, h: 340 } as const;

/**
 * Cycles 0..steps-1 every `ms` while the chapter is on stage. With reduced motion it
 * pins to the final step so the illustration shows its finished state, statically.
 */
export function useLoopStep(steps: number, ms: number): number {
  const reduce = useReducedMotion();
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (reduce) return;
    const id = window.setInterval(() => setStep((s) => (s + 1) % steps), ms);
    return () => window.clearInterval(id);
  }, [reduce, steps, ms]);
  return reduce ? steps - 1 : step;
}

export function useTourMotion() {
  const reduce = useReducedMotion();
  return {
    reduce: Boolean(reduce),
    gentle: reduce ? reducedTransition : spring.gentle,
    snappy: reduce ? reducedTransition : spring.snappy,
    flight: reduce ? reducedTransition : spring.flight,
    settle: reduce ? reducedTransition : spring.settle,
  };
}

type FrameProps = { label: string; children: ReactNode };

/** Paper-sunk stage that scales its SVG to any width (no horizontal overflow at 375px). */
export function Frame({ label, children }: FrameProps) {
  return (
    <svg
      viewBox={`0 0 ${VB.w} ${VB.h}`}
      role="img"
      aria-label={label}
      className="block h-auto w-full overflow-visible"
    >
      <rect x={0.5} y={0.5} width={VB.w - 1} height={VB.h - 1} rx={18} fill="var(--paper-sunk)" stroke="var(--rule)" />
      <g opacity={0.5}>
        {Array.from({ length: 11 }, (_, i) => (
          <line key={`v${i}`} x1={40 * (i + 1)} x2={40 * (i + 1)} y1={12} y2={VB.h - 12} stroke="var(--rule)" strokeWidth={0.6} />
        ))}
        {Array.from({ length: 7 }, (_, i) => (
          <line key={`h${i}`} y1={40 * (i + 1)} y2={40 * (i + 1)} x1={12} x2={VB.w - 12} stroke="var(--rule)" strokeWidth={0.6} />
        ))}
      </g>
      {children}
    </svg>
  );
}

type NoteProps = {
  x: number;
  y: number;
  lines: readonly string[];
  color?: string;
  rotate?: number;
  w?: number;
  h?: number;
  opacity?: number;
  scale?: number;
  dashed?: boolean;
  highlight?: boolean;
  delay?: number;
};

/** A sticky note: upright grotesk in ink (the human's voice). */
export function Note({
  x,
  y,
  lines,
  color = STICKY.butter,
  rotate = 0,
  w = 96,
  h = 72,
  opacity = 1,
  scale = 1,
  dashed,
  highlight,
  delay = 0,
}: NoteProps) {
  const t = useTourMotion();
  return (
    <motion.g
      initial={false}
      animate={{ x, y, rotate, opacity, scale }}
      transition={{ ...t.gentle, delay: t.reduce ? 0 : delay }}
      style={{ transformBox: "fill-box", transformOrigin: "center" }}
    >
      <rect x={2} y={4} width={w} height={h} rx={3} fill="oklch(30% 0.04 60 / 0.12)" />
      <rect
        width={w}
        height={h}
        rx={3}
        fill={color}
        stroke={highlight ? "var(--signal)" : dashed ? "var(--ink-faint)" : "none"}
        strokeWidth={highlight ? 2.5 : 1.2}
        strokeDasharray={dashed ? "4 3" : undefined}
      />
      {lines.map((line, i) => (
        <text key={i} x={9} y={20 + i * 15} fontSize={11.5} fill="var(--ink)" fontFamily="var(--font-ui)">
          {line}
        </text>
      ))}
    </motion.g>
  );
}

type QuestionNoteProps = { x: number; y: number; lines: readonly string[]; w?: number; opacity?: number };

/** The AI's question note: italic serif in signal-ink on an amber wash. */
export function QuestionNote({ x, y, lines, w = 170, opacity = 1 }: QuestionNoteProps) {
  const t = useTourMotion();
  const h = 34 + lines.length * 17;
  return (
    <motion.g initial={false} animate={{ x, y, opacity }} transition={t.gentle}>
      <rect x={2} y={5} width={w} height={h} rx={10} fill="oklch(30% 0.04 60 / 0.12)" />
      <rect width={w} height={h} rx={10} fill="var(--signal-wash)" stroke="var(--signal)" strokeWidth={1.2} />
      <text x={12} y={18} fontSize={8.5} letterSpacing={1.2} fill="var(--signal-ink)" fontFamily="var(--font-ui)" fontWeight={600}>
        A QUESTION FOR YOU
      </text>
      {lines.map((line, i) => (
        <text
          key={i}
          x={12}
          y={38 + i * 17}
          fontSize={13.5}
          fontStyle="italic"
          fill="var(--signal-ink)"
          fontFamily="var(--font-display)"
        >
          {line}
        </text>
      ))}
    </motion.g>
  );
}

type CaptionProps = { x: number; y: number; children: ReactNode; anchor?: "start" | "middle" | "end"; tone?: "ink" | "soft" | "signal" };

export function Caption({ x, y, children, anchor = "start", tone = "soft" }: CaptionProps) {
  const fill = tone === "ink" ? "var(--ink)" : tone === "signal" ? "var(--signal-ink)" : "var(--ink-soft)";
  return (
    <text x={x} y={y} textAnchor={anchor} fontSize={12} fill={fill} fontFamily="var(--font-ui)">
      {children}
    </text>
  );
}
