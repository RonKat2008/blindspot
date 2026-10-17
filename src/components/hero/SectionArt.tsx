"use client";

import { useEffect, useRef } from "react";
import { animate, motion, useInView, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import { ease, reducedTransition, spring } from "@/lib/motion";
import styles from "./art.module.css";

const VIEW = { once: true, margin: "0px 0px -15% 0px" } as const;
const CENTER = { transformBox: "fill-box", transformOrigin: "center" } as const;

function useT() {
  const isReduced = useReducedMotion();
  return (t: object) => (isReduced ? reducedTransition : t);
}

function Svg({ children }: { children: React.ReactNode }) {
  return (
    <motion.svg viewBox="0 0 240 140" className={styles.art} initial="off" whileInView="on" viewport={VIEW} aria-hidden="true">
      {children}
    </motion.svg>
  );
}

const SCATTER = [
  [36, 34, 44], [118, 26, 36], [196, 46, 40], [62, 92, 34], [150, 104, 46], [210, 112, 30],
] as const;

/** Step 1: ideas drop onto the board one at a time. */
export function ArtWrite() {
  const t = useT();
  return (
    <Svg>
      {SCATTER.map(([x, y, w], i) => (
        <motion.g
          key={i}
          variants={{ off: { opacity: 0, y: -8 }, on: { opacity: 1, y: 0 } }}
          transition={t({ ...spring.snappy, delay: 0.15 + i * 0.16 })}
        >
          <circle cx={x} cy={y} r="4.5" className={styles.dot} />
          <rect x={x + 8} y={y - 2} width={w} height="4" rx="2" className={styles.labelBar} />
        </motion.g>
      ))}
    </Svg>
  );
}

const CLUSTER_MOVES = [
  [36, 34, 52, 50], [118, 26, 74, 40], [196, 46, 66, 70],
  [62, 92, 150, 96], [150, 104, 176, 110], [210, 112, 164, 84],
] as const;

/** Step 2: ideas pull into clusters and threads draw between them. */
export function ArtCluster() {
  const t = useT();
  return (
    <Svg>
      <motion.circle cx="64" cy="54" r="40" className={styles.halo} variants={{ off: { opacity: 0 }, on: { opacity: 1 } }} transition={t({ duration: 1, delay: 1 })} />
      <motion.circle cx="164" cy="96" r="40" className={styles.halo} variants={{ off: { opacity: 0 }, on: { opacity: 1 } }} transition={t({ duration: 1, delay: 1 })} />
      {[["M52 50 Q 62 38 74 40", 0], ["M74 40 Q 76 58 66 70", 0.1], ["M150 96 Q 160 82 164 84", 0.2], ["M164 84 Q 182 94 176 110", 0.3]].map(([d, delay]) => (
        <motion.path
          key={d as string}
          d={d as string}
          className={styles.thread}
          variants={{ off: { pathLength: 0 }, on: { pathLength: 1 } }}
          transition={t({ duration: 0.8, delay: 0.9 + (delay as number), ease: ease.outExpo })}
        />
      ))}
      {CLUSTER_MOVES.map(([x0, y0, x1, y1], i) => (
        <motion.circle
          key={i}
          r="4.5"
          className={styles.dot}
          variants={{ off: { cx: x0, cy: y0 }, on: { cx: x1, cy: y1 } }}
          transition={t({ ...spring.gentle, delay: 0.2 + i * 0.06 })}
        />
      ))}
    </Svg>
  );
}

/** Step 3: the empty region glows, a question appears, a person fills the gap. */
export function ArtAsk() {
  const t = useT();
  return (
    <Svg>
      <circle cx="64" cy="54" r="40" className={styles.halo} />
      {[[52, 50], [74, 40], [66, 70], [150, 96], [176, 110], [164, 84]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="4.5" className={styles.dot} />
      ))}
      <motion.circle
        cx="186" cy="38" r="44"
        className={styles.glow}
        style={CENTER}
        variants={{ off: { opacity: 0, scale: 0.7 }, on: { opacity: 1, scale: 1 } }}
        transition={t({ duration: 1.2, delay: 0.2, ease: ease.outExpo })}
      />
      <circle cx="186" cy="38" r="18" className={styles.hatch} />
      <motion.g variants={{ off: { opacity: 0, y: 10 }, on: { opacity: 1, y: 0 } }} transition={t({ ...spring.gentle, delay: 0.7 })}>
        <rect x="96" y="6" width="62" height="24" rx="4" className={styles.note} />
        <text x="104" y="23" className={styles.noteMark}>?</text>
        <rect x="116" y="15" width="34" height="3" rx="1.5" className={styles.noteLine} />
      </motion.g>
      <motion.circle
        r="5.5"
        className={styles.dotNew}
        variants={{ off: { cx: 120, cy: 120, opacity: 0 }, on: { cx: 186, cy: 40, opacity: 1 } }}
        transition={t({ ...spring.flight, delay: 1.3 })}
      />
    </Svg>
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
