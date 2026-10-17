// Shared motion presets (motion/react). Import these; do not invent per-component springs.
import type { Transition, Variants } from "motion/react";

export const spring = {
  /** Buttons, chips, small UI feedback. */
  snappy: { type: "spring", stiffness: 520, damping: 34, mass: 0.7 },
  /** Cards, panels, layout changes. */
  gentle: { type: "spring", stiffness: 260, damping: 30, mass: 1 },
  /** Idea dots flying from the input to their position. */
  flight: { type: "spring", stiffness: 140, damping: 18, mass: 0.9 },
  /** Slow settle for the diversity meter needle/bar. */
  settle: { type: "spring", stiffness: 90, damping: 20, mass: 1.2 },
} as const satisfies Record<string, Transition>;

export const duration = { fast: 0.15, normal: 0.3, slow: 0.6, reveal: 1.2 } as const;
export const ease = { outExpo: [0.16, 1, 0.3, 1] } as const;

/** Reduced-motion fallback: swap any spring for this (opacity-only, short). */
export const reducedTransition: Transition = { duration: 0.12, ease: "linear" };

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: spring.gentle },
};

export const staggerChildren: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05, delayChildren: 0.05 } },
};

/** Provocation card enters from the right edge. */
export const cardSlide: Variants = {
  hidden: { opacity: 0, x: 48, scale: 0.98 },
  show: { opacity: 1, x: 0, scale: 1, transition: spring.gentle },
  exit: { opacity: 0, x: 32, transition: { duration: duration.fast } },
};

/** Idea dot: starts small and faded at the input, springs to its plotted position. */
export const dotEnter = {
  initial: { scale: 0.2, opacity: 0 },
  animate: { scale: 1, opacity: 1 },
  transition: spring.flight,
} as const;

/** "Reveal" pulse ring when an idea lands in a previously empty region. */
export const revealRing = {
  initial: { scale: 0.6, opacity: 0.9 },
  animate: { scale: 3.2, opacity: 0 },
  transition: { duration: duration.reveal, ease: ease.outExpo },
} as const;
