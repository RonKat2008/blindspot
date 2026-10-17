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
import type { SessionState } from "@/lib/contract";
import { SERIF } from "../join/theme";

// Same light language as /ambient: calm teal when the map is diverse, amber when it narrows.
const CALM_DIVERSITY = 60;
const WARM_DIVERSITY = 35;
const COLOR_EASE_S = 2.4;
const BREATH_S = 9;
const CALM = { hue: 190, chroma: 0.09 };
const WARM = { hue: 62, chroma: 0.17 };

function warmth(diversity: number): number {
  const t = (CALM_DIVERSITY - diversity) / (CALM_DIVERSITY - WARM_DIVERSITY);
  return Math.min(1, Math.max(0, t));
}

interface RoomResponseProps {
  state: SessionState | null;
  fromRoom: number;
}

export function RoomResponse({ state, fromRoom }: RoomResponseProps) {
  const reduced = useReducedMotion();
  const diversity = state?.diversity ?? 50;
  const t = useMotionValue(warmth(diversity));
  const hue = useTransform(t, [0, 1], [CALM.hue, WARM.hue]);
  const chroma = useTransform(t, [0, 1], [CALM.chroma, WARM.chroma]);

  useEffect(() => {
    const controls = animate(t, warmth(diversity), { duration: reduced ? 0.01 : COLOR_EASE_S, ease: ease.outExpo });
    return () => controls.stop();
  }, [diversity, reduced, t]);

  const glow = useMotionTemplate`oklch(66% ${chroma} ${hue})`;
  const mid = useMotionTemplate`oklch(40% ${chroma} ${hue})`;
  const deep = useMotionTemplate`oklch(18% ${chroma} ${hue})`;
  const background = useMotionTemplate`radial-gradient(ellipse 85% 75% at 50% 46%, ${glow} 0%, ${mid} 48%, ${deep} 100%)`;

  const current = state?.provocations.filter((p) => p.status === "shown").at(-1);
  const ideaCount = state?.ideas.length ?? 0;

  return (
    <section
      aria-label="What the room is missing"
      className="relative isolate flex h-full flex-col overflow-hidden"
      style={{ background: "oklch(18% 0.04 190)", color: "oklch(97.5% 0.012 85)" }}
    >
      <motion.div
        aria-hidden
        className="absolute -inset-[10%] -z-10"
        style={{ background }}
        animate={reduced ? undefined : { scale: [1, 1.12, 1], opacity: [0.88, 1, 0.88] }}
        transition={{ duration: BREATH_S, ease: "easeInOut", repeat: Infinity }}
      />

      <div className="flex flex-1 items-center justify-center px-[5%] py-8 text-center">
        <AnimatePresence mode="wait">
          {current ? (
            <motion.article
              key={current.id}
              initial={{ opacity: 0, y: reduced ? 0 : 24, rotate: reduced ? 0 : -2 }}
              animate={{ opacity: 1, y: 0, rotate: reduced ? 0 : -0.6 }}
              exit={{ opacity: 0, y: reduced ? 0 : -16 }}
              transition={{ duration: reduced ? 0.12 : 1.1, ease: ease.outExpo }}
              className="max-w-[22ch] rounded-sm px-[7%] py-6 shadow-[8px_12px_0_oklch(12%_0.04_255/0.22)]"
              style={{ background: "oklch(91% 0.04 250)", color: "oklch(28% 0.07 255)" }}
            >
              <p className="text-[0.7rem] uppercase tracking-[0.22em] opacity-70">A question for the room</p>
              <p
                className="mt-3 text-balance italic leading-[1.08]"
                style={{ fontFamily: SERIF, fontSize: "clamp(1.9rem, 0.6rem + 3.2vw, 4.5rem)" }}
              >
                {current.text}
              </p>
            </motion.article>
          ) : (
            <motion.p
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.8 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduced ? 0.12 : 1.4 }}
              className="italic"
              style={{ fontFamily: SERIF, fontSize: "clamp(1.4rem, 1rem + 1.6vw, 2.6rem)" }}
            >
              {state ? "Reading the room…" : "Finding the room…"}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      <p className="px-[5%] pb-4 text-[0.78rem] tracking-wide tabular-nums opacity-75">
        {ideaCount} {ideaCount === 1 ? "idea" : "ideas"} on the map · from the room: {fromRoom}
      </p>
    </section>
  );
}
