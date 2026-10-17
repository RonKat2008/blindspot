"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { motion, useMotionValue, useReducedMotion, useSpring } from "motion/react";
import { reducedTransition } from "@/lib/motion";
import {
  CUE,
  NEW_POINT_LABEL,
  POINTS,
  QUESTION,
  STATIC_FRAME,
  TALL,
  THREADS,
  WIDE,
  fieldFrameAt,
  fieldFrameKey,
  type FieldFrame,
  type Layout,
  type Vec,
} from "./field-script";
import styles from "./field.module.css";

const TICK_MS = 50;
const PARALLAX_PX = 10;
const CALM = { type: "spring", stiffness: 38, damping: 16, mass: 1.4 } as const;
const DRAW = { duration: 1.6, ease: [0.16, 1, 0.3, 1] } as const;

interface Size {
  w: number;
  h: number;
}

function useSize(ref: React.RefObject<HTMLDivElement | null>): Size {
  const [size, setSize] = useState<Size>({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return size;
}

/** Drives the loop; pauses while offscreen or the tab is hidden. */
function useFieldLoop(isStatic: boolean, ref: React.RefObject<HTMLDivElement | null>): FieldFrame {
  const [frame, setFrame] = useState<FieldFrame>(() => fieldFrameAt(0));
  const isVisible = useRef(true);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => {
      isVisible.current = entry.isIntersecting;
    });
    io.observe(el);
    return () => io.disconnect();
  }, [ref]);

  useEffect(() => {
    if (isStatic) return;
    let t = 0;
    let lastKey = "";
    const id = window.setInterval(() => {
      if (!isVisible.current || document.hidden) return;
      t = (t + TICK_MS) % CUE.end;
      const next = fieldFrameAt(t);
      const key = fieldFrameKey(next);
      if (key !== lastKey) {
        lastKey = key;
        setFrame(next);
      }
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [isStatic]);

  return isStatic ? STATIC_FRAME : frame;
}

function useParallax(isOff: boolean) {
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const x = useSpring(rawX, { stiffness: 40, damping: 18 });
  const y = useSpring(rawY, { stiffness: 40, damping: 18 });

  useEffect(() => {
    if (isOff) return;
    const onMove = (e: PointerEvent) => {
      rawX.set(((e.clientX / window.innerWidth) - 0.5) * -2 * PARALLAX_PX);
      rawY.set(((e.clientY / window.innerHeight) - 0.5) * -2 * PARALLAX_PX);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [isOff, rawX, rawY]);

  return { x, y };
}

function curve(a: Vec, b: Vec): string {
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const bend = Math.hypot(b.x - a.x, b.y - a.y) * 0.18;
  return `M${a.x} ${a.y} Q${mx + bend} ${my - bend} ${b.x} ${b.y}`;
}

function positions(size: Size, layout: Layout, scale: number, isClustered: boolean): Vec[] {
  return POINTS.map((p) => {
    if (!isClustered) return { x: p.start.x * size.w, y: p.start.y * size.h };
    const c = layout.clusters[p.cluster];
    return { x: c.x * size.w + p.offset.x * scale, y: c.y * size.h + p.offset.y * scale };
  });
}

export function ThoughtField() {
  const isReduced = useReducedMotion() ?? false;
  const ref = useRef<HTMLDivElement>(null);
  const size = useSize(ref);
  const frame = useFieldLoop(isReduced, ref);
  const parallax = useParallax(isReduced);

  const isTall = size.w > 0 && size.w / Math.max(size.h, 1) < 0.9;
  const layout = isTall ? TALL : WIDE;
  const scale = Math.min(1.1, Math.max(0.6, size.w / 1300));
  const settled = positions(size, layout, scale, true);
  const current = positions(size, layout, scale, frame.clustered);
  const empty = { x: layout.empty.x * size.w, y: layout.empty.y * size.h };
  const move = isReduced ? reducedTransition : CALM;
  const fade = (on: boolean, d = 1.2) => ({ opacity: on ? 1 : 0, transition: isReduced ? reducedTransition : { duration: d } });

  return (
    <div ref={ref} className={styles.field} aria-hidden="true">
      {size.w > 0 && (
        <motion.div className={styles.parallax} style={parallax}>
          <motion.svg
            className={styles.svg}
            width={size.w}
            height={size.h}
            viewBox={`0 0 ${size.w} ${size.h}`}
            animate={fade(!frame.faded, 1.4)}
          >
            <defs>
              <radialGradient id="bs-field-halo">
                <stop offset="0%" stopColor="var(--ink)" stopOpacity="0.07" />
                <stop offset="100%" stopColor="var(--ink)" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="bs-field-glow">
                <stop offset="0%" stopColor="var(--signal)" stopOpacity="0.42" />
                <stop offset="55%" stopColor="var(--signal)" stopOpacity="0.14" />
                <stop offset="100%" stopColor="var(--signal)" stopOpacity="0" />
              </radialGradient>
              <pattern id="bs-field-hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <line x1="0" y1="0" x2="0" y2="7" stroke="var(--signal)" strokeOpacity="0.4" strokeWidth="1.2" />
              </pattern>
            </defs>

            {layout.clusters.map((c, i) => (
              <motion.circle
                key={`halo-${i}`}
                cx={c.x * size.w}
                cy={c.y * size.h}
                r={150 * scale}
                fill="url(#bs-field-halo)"
                initial={{ opacity: 0 }}
                animate={fade(frame.halos, 1.8)}
              />
            ))}

            <motion.g initial={{ opacity: 0 }} animate={fade(frame.glow, 1.6)}>
              <motion.circle
                cx={empty.x}
                cy={empty.y}
                r={190 * scale}
                fill="url(#bs-field-glow)"
                style={{ transformBox: "fill-box", transformOrigin: "center" }}
                animate={{ scale: frame.bloom ? 1.35 : 1 }}
                transition={isReduced ? reducedTransition : { duration: 2.2, ease: [0.16, 1, 0.3, 1] }}
              />
              <circle cx={empty.x} cy={empty.y} r={66 * scale} fill="url(#bs-field-hatch)" />
              <circle cx={empty.x} cy={empty.y} r={66 * scale} className={styles.hatchRing} />
            </motion.g>

            {THREADS.map(([a, b]) => (
              <motion.path
                key={`t-${a}-${b}`}
                d={curve(settled[a], settled[b])}
                className={styles.thread}
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: frame.threads ? 1 : 0, opacity: frame.threads ? 1 : 0 }}
                transition={isReduced ? reducedTransition : DRAW}
              />
            ))}

            {POINTS.map((p, i) => (
              <motion.g
                key={p.id}
                initial={{ x: current[i].x, y: current[i].y + 24, opacity: 0 }}
                animate={{ x: current[i].x, y: current[i].y, opacity: i < frame.count ? 1 : 0 }}
                transition={move}
              >
                <g className={styles.bob} style={{ animationDelay: `${-i * 0.7}s` }}>
                  <circle r={5.5} className={styles.dot} />
                  <text x={10} y={4} className={styles.label}>{p.label}</text>
                </g>
              </motion.g>
            ))}

            <motion.g
              initial={{ x: empty.x - 260 * scale, y: empty.y + 120 * scale, opacity: 0 }}
              animate={
                frame.arrived
                  ? { x: empty.x, y: empty.y + 6, opacity: 1 }
                  : { x: empty.x - 260 * scale, y: empty.y + 120 * scale, opacity: 0 }
              }
              transition={isReduced ? reducedTransition : { ...CALM, stiffness: 30 }}
            >
              <motion.circle
                r={8}
                className={styles.ring}
                animate={frame.bloom && !isReduced ? { scale: [1, 4], opacity: [0.8, 0] } : { scale: 1, opacity: 0 }}
                transition={{ duration: 1.6, ease: [0.16, 1, 0.3, 1] }}
              />
              <circle r={7} className={styles.dotNew} />
              <text x={13} y={4} className={styles.labelNew}>{NEW_POINT_LABEL}</text>
            </motion.g>
          </motion.svg>

          <motion.div
            className={styles.note}
            style={{ left: empty.x - 70 * scale, top: empty.y + 100 * scale }}
            initial={{ opacity: 0, y: 12, rotate: -1 }}
            animate={{ opacity: frame.question && !frame.faded ? 1 : 0, y: frame.question ? 0 : 12, rotate: -1.5 }}
            transition={isReduced ? reducedTransition : { ...CALM, stiffness: 60 }}
          >
            <span className={styles.noteLabel}>A question</span>
            {QUESTION}
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
