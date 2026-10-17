"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { reducedTransition, spring } from "@/lib/motion";
import styles from "./landing.module.css";

const UNDERLINE = "M4 12 C 60 4, 120 16, 180 8 S 270 6, 296 10";

export function HeroIntro() {
  const isReduced = useReducedMotion();
  const item = (i: number) => ({
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: isReduced ? reducedTransition : { ...spring.gentle, delay: 0.1 + i * 0.1 },
  });

  return (
    <div className={styles.intro}>
      <motion.h1 id="hero-heading" className={styles.headline} {...item(0)}>
        See what your brainstorm is{" "}
        <span className={styles.underlined}>
          missing.
          <svg className={styles.underline} viewBox="0 0 300 20" preserveAspectRatio="none" aria-hidden="true">
            <motion.path
              d={UNDERLINE}
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={isReduced ? reducedTransition : { duration: 1, delay: 0.75, ease: [0.16, 1, 0.3, 1] }}
            />
          </svg>
        </span>
      </motion.h1>

      <motion.p className={styles.lede} {...item(1)}>
        A whiteboard that maps your team&rsquo;s ideas and asks the questions you didn&rsquo;t think
        to ask. It never writes one for you.
      </motion.p>

      <motion.div className={styles.ctas} {...item(2)}>
        <Link href="/new" className={styles.btnPrimary}>
          Start a whiteboard
          <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" className={styles.arrow}>
            <path d="M3 8h9M8.5 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
        <Link href="/tour?live=1" className={styles.btnGhost}>
          Watch it live
        </Link>
      </motion.div>
    </div>
  );
}
