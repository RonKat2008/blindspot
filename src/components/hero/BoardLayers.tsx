"use client";

import { AnimatePresence, motion } from "motion/react";
import { reducedTransition } from "@/lib/motion";
import { NOTES, NOTE_H, NOTE_W, STAGE_H, STAGE_W } from "./board-script";
import styles from "./board.module.css";

const DRAW = { duration: 0.9, ease: [0.16, 1, 0.3, 1] } as const;

function centerOf(i: number) {
  const b = NOTES[i].board;
  return { x: b.x + NOTE_W / 2, y: b.y + NOTE_H / 2 };
}

function threadPath(a: number, b: number): string {
  const p = centerOf(a);
  const q = centerOf(b);
  const mx = (p.x + q.x) / 2;
  const my = (p.y + q.y) / 2;
  const bend = 46;
  return `M${p.x} ${p.y} Q${mx + bend} ${my - bend} ${q.x} ${q.y}`;
}

interface ThreadsProps {
  isOn: boolean;
  count: number;
  threads: readonly [number, number][];
  isReduced: boolean;
}

export function BoardThreads({ isOn, count, threads, isReduced }: ThreadsProps) {
  return (
    <svg className={styles.layer} viewBox={`0 0 ${STAGE_W} ${STAGE_H}`} width={STAGE_W} height={STAGE_H}>
      <AnimatePresence>
        {isOn &&
          threads
            .filter(([a, b]) => a < count && b < count)
            .map(([a, b], k) => (
              <motion.path
                key={`${a}-${b}`}
                d={threadPath(a, b)}
                className={styles.thread}
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.3 } }}
                transition={isReduced ? reducedTransition : { ...DRAW, delay: k * 0.18 }}
              />
            ))}
      </AnimatePresence>
    </svg>
  );
}

interface AxesProps {
  isOn: boolean;
  isHatch: boolean;
  hasNewIdea: boolean;
  isReduced: boolean;
}

const CX = 280;
const CY = 240;
const GAP = { x: 294, y: 58, w: 240, h: 168 };

export function BoardAxes({ isOn, isHatch, hasNewIdea, isReduced }: AxesProps) {
  const t = (delay: number) => (isReduced ? reducedTransition : { ...DRAW, delay });
  return (
    <svg className={styles.layer} viewBox={`0 0 ${STAGE_W} ${STAGE_H}`} width={STAGE_W} height={STAGE_H}>
      <defs>
        <pattern id="hero-hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="8" className={styles.hatchLine} />
        </pattern>
        <radialGradient id="hero-glow" cx="50%" cy="50%" r="65%">
          <stop offset="0%" className={styles.glowIn} />
          <stop offset="100%" className={styles.glowOut} />
        </radialGradient>
      </defs>

      <AnimatePresence>
        {isHatch && (
          <motion.g
            key="gap"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.3 } }}
            transition={t(0)}
          >
            <rect x={GAP.x} y={GAP.y} width={GAP.w} height={GAP.h} rx="14" fill="url(#hero-glow)" />
            <rect x={GAP.x} y={GAP.y} width={GAP.w} height={GAP.h} rx="14" fill="url(#hero-hatch)" className={styles.hatchFill} />
            <rect x={GAP.x} y={GAP.y} width={GAP.w} height={GAP.h} rx="14" className={styles.gapBorder} />
            <motion.text
              x={GAP.x + GAP.w / 2}
              y={GAP.y + GAP.h - 18}
              textAnchor="middle"
              className={styles.gapLabel}
              animate={{ opacity: hasNewIdea ? 0 : 1 }}
              transition={{ duration: 0.4 }}
            >
              nobody&rsquo;s been here yet
            </motion.text>
          </motion.g>
        )}

        {isOn && (
          <motion.g key="axes" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.3 } }}>
            <motion.path d={`M24 ${CY} H536`} className={styles.axisX} initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={t(0.1)} />
            <motion.path d={`M${CX} 424 V56`} className={styles.axisY} initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={t(0.25)} />
            <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={t(0.5)}>
              <text x="26" y={CY + 20} className={styles.poleX}>incremental</text>
              <text x="534" y={CY + 20} textAnchor="end" className={styles.poleX}>radical</text>
              <text x={CX - 10} y="68" textAnchor="end" className={styles.poleY}>social</text>
              <text x={CX - 10} y="420" textAnchor="end" className={styles.poleY}>individual</text>
            </motion.g>
          </motion.g>
        )}
      </AnimatePresence>
    </svg>
  );
}
