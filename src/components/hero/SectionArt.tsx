"use client";

import { useEffect, useRef } from "react";
import { animate, motion, useInView, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import { ease, reducedTransition, spring } from "@/lib/motion";
import styles from "./art.module.css";

const VIEW = { once: true, margin: "0px 0px -15% 0px" } as const;

function useT() {
  const isReduced = useReducedMotion();
  return (t: object) => (isReduced ? reducedTransition : t);
}

/** Step 1: three stickies pop onto the board. */
export function ArtWrite() {
  const t = useT();
  const notes = [
    { x: 18, y: 24, r: -4, c: "var(--note-butter)" },
    { x: 84, y: 16, r: 3, c: "var(--note-blush)" },
    { x: 150, y: 30, r: -2, c: "var(--note-mint)" },
  ];
  return (
    <motion.svg viewBox="0 0 220 120" className={styles.art} initial="off" whileInView="on" viewport={VIEW} aria-hidden="true">
      {notes.map((n, i) => (
        <motion.g
          key={i}
          variants={{ off: { opacity: 0, y: -10, scale: 0.8 }, on: { opacity: 1, y: 0, scale: 1 } }}
          transition={t({ ...spring.snappy, delay: 0.15 + i * 0.22 })}
          style={{ transformBox: "fill-box", transformOrigin: "center" }}
        >
          <rect x={n.x} y={n.y} width="54" height="44" rx="3" fill={n.c} transform={`rotate(${n.r} ${n.x + 27} ${n.y + 22})`} className={styles.noteShadow} />
          <rect x={n.x + 8} y={n.y + 12} width="34" height="3" rx="1.5" className={styles.scribble} transform={`rotate(${n.r} ${n.x + 27} ${n.y + 22})`} />
          <rect x={n.x + 8} y={n.y + 20} width="24" height="3" rx="1.5" className={styles.scribble} transform={`rotate(${n.r} ${n.x + 27} ${n.y + 22})`} />
        </motion.g>
      ))}
      <motion.path
        d="M46 92 Q 110 112 176 90"
        className={styles.thread}
        variants={{ off: { pathLength: 0 }, on: { pathLength: 1 } }}
        transition={t({ duration: 0.8, delay: 0.9, ease: ease.outExpo })}
      />
    </motion.svg>
  );
}

/** Step 2: dots slide into one corner of the lens map. */
export function ArtLens() {
  const t = useT();
  const dots = [
    [40, 30, 52, 86],
    [110, 22, 66, 92],
    [170, 40, 44, 98],
    [70, 64, 74, 80],
    [150, 80, 58, 76],
  ];
  return (
    <motion.svg viewBox="0 0 220 120" className={styles.art} initial="off" whileInView="on" viewport={VIEW} aria-hidden="true">
      <motion.rect
        x="116" y="10" width="94" height="46" rx="8"
        className={styles.gap}
        variants={{ off: { opacity: 0 }, on: { opacity: 1 } }}
        transition={t({ duration: 0.6, delay: 1.1 })}
      />
      <path d="M12 60 H208" className={styles.axisX} />
      <path d="M110 112 V8" className={styles.axisY} />
      {dots.map(([x0, y0, x1, y1], i) => (
        <motion.circle
          key={i}
          r="5"
          className={styles.dot}
          variants={{ off: { cx: x0, cy: y0 }, on: { cx: x1, cy: y1 } }}
          transition={t({ ...spring.gentle, delay: 0.25 + i * 0.07 })}
        />
      ))}
    </motion.svg>
  );
}

/** Step 3: a question card, then a human idea lands in the empty corner. */
export function ArtAnswer() {
  const t = useT();
  return (
    <motion.svg viewBox="0 0 220 120" className={styles.art} initial="off" whileInView="on" viewport={VIEW} aria-hidden="true">
      <path d="M12 60 H208" className={styles.axisX} />
      <path d="M110 112 V8" className={styles.axisY} />
      <rect x="116" y="10" width="94" height="46" rx="8" className={styles.gap} />
      <motion.g variants={{ off: { opacity: 0, x: 24 }, on: { opacity: 1, x: 0 } }} transition={t({ ...spring.flight, delay: 0.2 })}>
        <rect x="14" y="72" width="86" height="38" rx="5" className={styles.question} />
        <text x="22" y="95" className={styles.questionMark}>?</text>
        <rect x="38" y="84" width="52" height="3" rx="1.5" className={styles.questionLine} />
        <rect x="38" y="92" width="36" height="3" rx="1.5" className={styles.questionLine} />
      </motion.g>
      <motion.circle
        cx="164" cy="32" r="6"
        className={styles.dotNew}
        variants={{ off: { scale: 0, opacity: 0 }, on: { scale: 1, opacity: 1 } }}
        transition={t({ ...spring.flight, delay: 1.0 })}
        style={{ transformBox: "fill-box", transformOrigin: "center" }}
      />
      <motion.circle
        cx="164" cy="32" r="6"
        className={styles.ring}
        variants={{ off: { scale: 0.6, opacity: 0 }, on: { scale: 3.2, opacity: [0, 0.9, 0] } }}
        transition={t({ duration: 1.2, delay: 1.15, ease: ease.outExpo })}
        style={{ transformBox: "fill-box", transformOrigin: "center" }}
      />
    </motion.svg>
  );
}

/** Problem section: a spread of dots that collapses toward one spot. */
export function ArtNarrowing() {
  const t = useT();
  const dots = Array.from({ length: 14 }, (_, i) => {
    const a = (i / 14) * Math.PI * 2;
    const r = 34 + (i % 3) * 14;
    return { x: 120 + Math.cos(a) * r * 1.6, y: 60 + Math.sin(a) * r * 0.9, i };
  });
  return (
    <motion.svg viewBox="0 0 240 120" className={styles.artWide} initial="off" whileInView="on" viewport={VIEW} aria-hidden="true">
      {dots.map((d) => (
        <motion.circle
          key={d.i}
          r="4.5"
          className={styles.dotSoft}
          variants={{
            off: { cx: d.x, cy: d.y },
            on: { cx: 120 + (d.x - 120) * 0.32, cy: 60 + (d.y - 60) * 0.34 },
          }}
          transition={t({ ...spring.settle, delay: 0.4 + d.i * 0.03 })}
        />
      ))}
    </motion.svg>
  );
}

/** Counts from 0 to `to` the first time it scrolls into view. */
export function CountUp({ to }: { to: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, VIEW);
  const isReduced = useReducedMotion();
  const value = useMotionValue(0);
  const rounded = useTransform(value, (v) => Math.round(v));

  useEffect(() => {
    if (!isInView) return;
    if (isReduced) {
      value.set(to);
      return;
    }
    const controls = animate(value, to, { duration: 1.2, ease: ease.outExpo, delay: 0.2 });
    return () => controls.stop();
  }, [isInView, isReduced, to, value]);

  return <motion.span ref={ref}>{rounded}</motion.span>;
}
