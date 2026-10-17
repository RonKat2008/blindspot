"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion, type TargetAndTransition, type Variants } from "motion/react";
import { reducedTransition, spring } from "@/lib/motion";
import styles from "./landing.module.css";
import art from "./art.module.css";

interface Feature {
  key: string;
  title: string;
  body: string;
  icon: ReactNode;
  wide?: boolean;
}

const REST: TargetAndTransition = { x: 0, y: 0, rotate: 0, scale: 1, opacity: 1 };
const hover = (to: TargetAndTransition): Variants => ({ rest: REST, hover: to });

const FEATURES: Feature[] = [
  {
    key: "async",
    title: "Boards that wait for you",
    body: "Share a link. Teammates add ideas when they can, from anywhere. The map keeps up.",
    wide: true,
    icon: (
      <svg viewBox="0 0 64 64" className={art.icon} aria-hidden="true">
        <rect x="8" y="14" width="34" height="26" rx="3" className={art.iconNote} />
        <motion.rect x="22" y="24" width="34" height="26" rx="3" className={art.iconNoteAlt} variants={hover({ x: 4, y: -4, rotate: 4 })} transition={spring.snappy} />
        <motion.circle cx="52" cy="14" r="5" className={art.iconSignal} variants={hover({ scale: 1.3 })} transition={spring.snappy} style={{ transformBox: "fill-box", transformOrigin: "center" }} />
      </svg>
    ),
  },
  {
    key: "phones",
    title: "Phones in the room",
    body: "Scan the code. Snap a sticky note or type one. It lands on the big screen.",
    icon: (
      <svg viewBox="0 0 64 64" className={art.icon} aria-hidden="true">
        <rect x="18" y="6" width="28" height="52" rx="6" className={art.iconFrame} />
        <motion.rect x="24" y="18" width="16" height="14" rx="2" className={art.iconNote} variants={hover({ y: -12, opacity: 0.4 })} transition={spring.gentle} />
        <circle cx="32" cy="50" r="2" className={art.iconInk} />
      </svg>
    ),
  },
  {
    key: "ambient",
    title: "A room that glows",
    body: "Put the board on a TV. The light shifts as your team covers more ground.",
    icon: (
      <svg viewBox="0 0 64 64" className={art.icon} aria-hidden="true">
        <motion.circle cx="32" cy="30" r="18" className={art.iconGlow} variants={hover({ scale: 1.25 })} transition={spring.settle} style={{ transformBox: "fill-box", transformOrigin: "center" }} />
        <rect x="12" y="18" width="40" height="26" rx="4" className={art.iconFrame} />
        <path d="M26 52h12" className={art.iconStroke} />
      </svg>
    ),
  },
  {
    key: "replay",
    title: "Replay the session",
    body: "Watch how the map grew, idea by idea. See which question opened a new corner.",
    wide: true,
    icon: (
      <svg viewBox="0 0 64 64" className={art.icon} aria-hidden="true">
        <path d="M8 46 H56" className={art.iconStroke} />
        <motion.g variants={hover({ x: 28 })} transition={spring.gentle}>
          <circle cx="14" cy="46" r="5" className={art.iconSignal} />
        </motion.g>
        <circle cx="20" cy="26" r="4" className={art.iconInk} />
        <circle cx="32" cy="20" r="4" className={art.iconInk} />
        <circle cx="46" cy="30" r="4" className={art.iconInk} />
      </svg>
    ),
  },
];

export function Features() {
  const isReduced = useReducedMotion();
  return (
    <ul className={styles.bento}>
      {FEATURES.map((f, i) => (
        <motion.li
          key={f.key}
          className={styles.bentoItem}
          data-wide={f.wide || undefined}
          initial={isReduced ? { opacity: 0 } : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "0px 0px -10% 0px" }}
          transition={isReduced ? reducedTransition : { ...spring.gentle, delay: i * 0.07 }}
          whileHover={isReduced ? undefined : "hover"}
          animate="rest"
        >
          <div className={styles.bentoIcon}>{f.icon}</div>
          <div>
            <h3 className={styles.bentoTitle}>{f.title}</h3>
            <p className={styles.bentoBody}>{f.body}</p>
          </div>
        </motion.li>
      ))}
    </ul>
  );
}
