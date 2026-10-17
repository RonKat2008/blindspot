"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { reducedTransition, spring } from "@/lib/motion";
import type { Chapter } from "./chapters";
import { BoardFrame } from "./board-frame";
import { sceneFor } from "./board-scenes";
import { Illustration } from "./illustration";
import { GuardArt } from "./illustrations-a";

/**
 * The hero of each chapter. Board chapters render the real board (one persistent instance,
 * so notes animate between chapters); the rest show a lightweight illustration.
 */
export function ChapterVisual({ chapter }: { chapter: Chapter }) {
  const reduce = useReducedMotion();
  const scene = sceneFor(chapter.key);
  const transition = reduce ? reducedTransition : spring.gentle;

  if (scene) {
    return (
      <div className="relative min-w-0">
        <BoardFrame scene={scene} label={`The Blind Spot board: ${chapter.title}`} />
        <AnimatePresence>
          {chapter.key === "guard" ? (
            <motion.div
              key="guard-inset"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={transition}
              className="pointer-events-none absolute bottom-3 left-3 w-[min(22rem,62%)] rounded-2xl bg-paper-raised p-1.5 shadow-[var(--shadow-card)]"
            >
              <GuardArt />
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={chapter.key}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={transition}
        className="mx-auto w-full max-w-[680px] min-w-0 drop-shadow-[0_12px_32px_oklch(30%_0.04_60/0.12)]"
      >
        <Illustration name={chapter.key} />
      </motion.div>
    </AnimatePresence>
  );
}
