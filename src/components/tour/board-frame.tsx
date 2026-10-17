"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { Board } from "@/components/board/board";
import type { Scene } from "./board-scenes";

/** Virtual canvas the real board lays out in, then scaled to fit the stage. */
const DESKTOP = { w: 1200, h: 840 } as const;
const MOBILE = { w: 400, h: 680 } as const;
const MOBILE_BELOW = 640;

/** Loops through a scene's frames; reduced motion pins the last (most complete) frame. */
function useSceneFrame(scene: Scene): number {
  const reduce = useReducedMotion();
  const [i, setI] = useState(0);
  const [seen, setSeen] = useState(scene);
  if (seen !== scene) {
    setSeen(scene);
    setI(0);
  }
  useEffect(() => {
    if (reduce || scene.length < 2) return;
    const id = window.setTimeout(() => setI((n) => (n + 1) % scene.length), scene[i]?.ms ?? 3000);
    return () => window.clearTimeout(id);
  }, [reduce, scene, i]);
  return reduce ? scene.length - 1 : Math.min(i, scene.length - 1);
}

/**
 * The real <Board snapshot /> rendered inside a scaled frame. The transform makes the board's
 * fixed overlays (inspector, converge drawer, draft) position against the frame, not the page,
 * and `[&>div]:!h-full` overrides the board's full-viewport height.
 */
export function BoardFrame({ scene, label }: { scene: Scene; label: string }) {
  const outerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const frame = useSceneFrame(scene);

  useEffect(() => {
    const el = outerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const virtual = width > 0 && width < MOBILE_BELOW ? MOBILE : DESKTOP;
  const scale = width > 0 ? width / virtual.w : 0;

  return (
    <div
      ref={outerRef}
      role="img"
      aria-label={label}
      className="relative w-full overflow-hidden rounded-2xl border border-rule bg-paper shadow-[var(--shadow-card)]"
      style={{ height: scale ? virtual.h * scale : undefined, aspectRatio: scale ? undefined : `${DESKTOP.w} / ${DESKTOP.h}` }}
    >
      {scale ? (
        <div
          aria-hidden
          inert
          className="absolute top-0 left-0 origin-top-left [&>div]:!h-full"
          style={{ width: virtual.w, height: virtual.h, transform: `scale(${scale})` }}
        >
          <Board snapshot={scene[frame].snapshot} />
        </div>
      ) : null}
    </div>
  );
}
