"use client";

import { useEffect } from "react";
import {
  AnimatePresence,
  animate,
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "motion/react";
import { ease } from "@/lib/motion";
import { SERIF } from "../join/theme";
import { useSessionState } from "../join/useSessionState";

interface AmbientRoomProps {
  sessionId: string;
}

const POLL_MS = 1000;
const CALM_DIVERSITY = 60; // at or above: calm teal
const WARM_DIVERSITY = 35; // at or below: amber
const COLOR_EASE_S = 2.4;
const BREATH_S = 9;

// OKLCH endpoints: calm teal -> signal amber (docs/DESIGN.md).
const CALM = { hue: 190, chroma: 0.09 };
const WARM = { hue: 62, chroma: 0.17 };

/** 0 = calm teal, 1 = amber. */
function warmth(diversity: number): number {
  const t = (CALM_DIVERSITY - diversity) / (CALM_DIVERSITY - WARM_DIVERSITY);
  return Math.min(1, Math.max(0, t));
}

export function AmbientRoom({ sessionId }: AmbientRoomProps) {
  const { state } = useSessionState(sessionId, POLL_MS);
  const reduced = useReducedMotion();

  const diversity = state?.diversity ?? 50;
  const t = useMotionValue(warmth(diversity));
  const hue = useTransform(t, [0, 1], [CALM.hue, WARM.hue]);
  const chroma = useTransform(t, [0, 1], [CALM.chroma, WARM.chroma]);

  useEffect(() => {
    const controls = animate(t, warmth(diversity), {
      duration: reduced ? 0.01 : COLOR_EASE_S,
      ease: ease.outExpo,
    });
    return () => controls.stop();
  }, [diversity, reduced, t]);

  const glow = useMotionTemplate`oklch(66% ${chroma} ${hue})`;
  const mid = useMotionTemplate`oklch(40% ${chroma} ${hue})`;
  const deep = useMotionTemplate`oklch(18% ${chroma} ${hue})`;
  const background = useMotionTemplate`radial-gradient(ellipse 85% 75% at 50% 46%, ${glow} 0%, ${mid} 48%, ${deep} 100%)`;

  const current = state?.provocations.filter((p) => p.status === "shown").at(-1);

  return (
    <main
      className="relative isolate h-dvh w-screen overflow-hidden"
      style={{ background: "oklch(18% 0.04 190)", color: "oklch(97.5% 0.012 85)" }}
    >
      {/* Breathing light: scale/opacity only, so it stays on the compositor. */}
      <motion.div
        aria-hidden
        className="absolute -inset-[10%] -z-10"
        style={{ background }}
        animate={reduced ? undefined : { scale: [1, 1.12, 1], opacity: [0.88, 1, 0.88] }}
        transition={{ duration: BREATH_S, ease: "easeInOut", repeat: Infinity }}
      />

      <div className="flex h-full flex-col items-center justify-center px-[7vw] text-center">
        <AnimatePresence mode="wait">
          {current ? (
            <motion.p
              key={current.id}
              initial={{ opacity: 0, y: reduced ? 0 : 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: reduced ? 0 : -16 }}
              transition={{ duration: reduced ? 0.12 : 1.1, ease: ease.outExpo }}
              className="max-w-[18ch] text-balance italic leading-[1.08] [text-shadow:0_2px_40px_oklch(10%_0.03_60/0.35)] md:max-w-[22ch]"
              style={{ fontFamily: SERIF, fontSize: "clamp(2.5rem, 1rem + 6.4vw, 7.5rem)" }}
            >
              {current.text}
            </motion.p>
          ) : (
            <motion.p
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.75 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduced ? 0.12 : 1.4 }}
              className="italic"
              style={{ fontFamily: SERIF, fontSize: "clamp(1.5rem, 1rem + 2vw, 3rem)" }}
            >
              {state ? "Listening to the room…" : "Finding the room…"}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      <footer className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-6 px-[4vw] pb-[3vh] text-[0.8rem] opacity-70">
        <span className="max-w-[60%] truncate">{state?.session.prompt ?? ""}</span>
        <span className="tabular-nums tracking-[0.16em] uppercase">
          Range {state ? state.diversity : "--"}
        </span>
      </footer>
    </main>
  );
}
