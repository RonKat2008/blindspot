"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { reducedTransition, spring } from "@/lib/motion";
import styles from "./landing.module.css";

const UNDERLINE = "M4 12 C 60 4, 120 16, 180 8 S 270 6, 296 10";

export function HeroIntro() {
  const isReduced = useReducedMotion();
  const item = (i: number) => ({
    initial: isReduced ? { opacity: 0 } : { opacity: 0, y: 18 },
    animate: { opacity: 1, y: 0 },
    transition: isReduced ? reducedTransition : { ...spring.gentle, delay: 0.08 + i * 0.08 },
  });

  return (
    <div className={styles.intro}>
      <motion.p className={styles.eyebrow} {...item(0)}>
        <span className={styles.eyebrowDot} aria-hidden="true" />
        A whiteboard that asks, never tells
      </motion.p>

      <motion.h1 id="hero-heading" className={styles.headline} {...item(1)}>
        See what your brainstorm is{" "}
        <span className={styles.underlined}>
          missing.
          <svg className={styles.underline} viewBox="0 0 300 20" preserveAspectRatio="none" aria-hidden="true">
            <motion.path
              d={UNDERLINE}
              initial={{ pathLength: isReduced ? 1 : 0 }}
              animate={{ pathLength: 1 }}
              transition={isReduced ? reducedTransition : { duration: 0.9, delay: 0.7, ease: [0.16, 1, 0.3, 1] }}
            />
          </svg>
        </span>
      </motion.h1>

      <motion.p className={styles.lede} {...item(2)}>
        Blind Spot maps your team&rsquo;s ideas and asks the questions you didn&rsquo;t think to ask.
        It never writes an idea for you.
      </motion.p>

      <motion.div className={styles.ctas} {...item(3)}>
        <Link href="/new" className={styles.btnPrimary}>
          Start a whiteboard
          <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" className={styles.arrow}>
            <path d="M3 8h9M8.5 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
        <Link href="/demo" className={styles.btnGhost}>
          <span className={styles.playDot} aria-hidden="true">
            <svg viewBox="0 0 12 12" width="10" height="10"><path d="M3.5 2v8l6-4z" fill="currentColor" /></svg>
          </span>
          Take the 90-second tour
        </Link>
      </motion.div>

      <motion.p className={styles.fineprint} {...item(4)}>
        Works with phones in the room. No setup for your team.
      </motion.p>
    </div>
  );
}
