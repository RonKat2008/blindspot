"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import { reducedTransition, spring } from "@/lib/motion";
import type { TourAnchor } from "./tour-script";

type Rect = { x: number; y: number; w: number; h: number };

const CUTOUT_PAD = 10;
const GUTTER = 16;
const BUBBLE_GAP = 14;
const MEASURE_MS = 200;

function measure(anchors: TourAnchor[]): Rect | null {
  const rects = anchors
    .flatMap((id) => Array.from(document.querySelectorAll<HTMLElement>(`[data-tour="${id}"]`)))
    .map((el) => el.getBoundingClientRect())
    .filter((r) => r.width > 0 && r.height > 0);
  if (rects.length === 0) return null;
  const left = Math.min(...rects.map((r) => r.left));
  const top = Math.min(...rects.map((r) => r.top));
  const right = Math.max(...rects.map((r) => r.right));
  const bottom = Math.max(...rects.map((r) => r.bottom));
  return { x: left - CUTOUT_PAD, y: top - CUTOUT_PAD, w: right - left + CUTOUT_PAD * 2, h: bottom - top + CUTOUT_PAD * 2 };
}

function sameRect(a: Rect | null, b: Rect | null): boolean {
  if (!a || !b) return a === b;
  return Math.abs(a.x - b.x) < 1 && Math.abs(a.y - b.y) < 1 && Math.abs(a.w - b.w) < 1 && Math.abs(a.h - b.h) < 1;
}

/** Tracks the union rect of the anchors (re-measured on scroll/resize and on a slow poll for layout animations). */
function useAnchorRect(anchors: TourAnchor[]): Rect | null {
  const key = anchors.join(",");
  const [rect, setRect] = useState<Rect | null>(null);

  useEffect(() => {
    const ids = key ? (key.split(",") as TourAnchor[]) : [];
    const update = () => setRect((prev) => {
      const next = ids.length ? measure(ids) : null;
      return sameRect(prev, next) ? prev : next;
    });
    const first = ids.length ? document.querySelector<HTMLElement>(`[data-tour="${ids[0]}"]`) : null;
    if (first) {
      const r = first.getBoundingClientRect();
      if (r.top < 0 || r.bottom > window.innerHeight) first.scrollIntoView({ block: "center", behavior: "smooth" });
    }
    const raf = window.requestAnimationFrame(update);
    const poll = window.setInterval(update, MEASURE_MS);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.cancelAnimationFrame(raf);
      window.clearInterval(poll);
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [key]);

  return rect;
}

/** Bubble goes below the target if it fits, else above, else pinned to the roomier screen edge. */
function placeBubble(rect: Rect | null, bubbleH: number, bubbleW: number): { top: number; left: number } {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const centered = Math.max(GUTTER, (vw - bubbleW) / 2);
  if (!rect) return { top: Math.max(GUTTER, vh - bubbleH - GUTTER * 2), left: centered };
  const left = Math.max(GUTTER, Math.min(vw - bubbleW - GUTTER, rect.x + rect.w / 2 - bubbleW / 2));
  const below = rect.y + rect.h + BUBBLE_GAP;
  if (below + bubbleH <= vh - GUTTER) return { top: below, left };
  const above = rect.y - BUBBLE_GAP - bubbleH;
  if (above >= GUTTER) return { top: above, left };
  const spaceTop = rect.y;
  const spaceBottom = vh - (rect.y + rect.h);
  return {
    top: spaceBottom >= spaceTop ? vh - bubbleH - GUTTER : GUTTER,
    left,
  };
}

export function Spotlight({
  anchors,
  dim = true,
  large = false,
  children,
}: {
  anchors: TourAnchor[];
  /** Draw the dimmed backdrop. */
  dim?: boolean;
  /** Bigger bubble + type for 1080p screen recordings. */
  large?: boolean;
  /** Bubble content; null hides the bubble. */
  children: ReactNode;
}) {
  const reduce = useReducedMotion();
  const rect = useAnchorRect(anchors);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const transition = reduce ? { duration: 0 } : spring.gentle;

  useLayoutEffect(() => {
    const el = bubbleRef.current;
    if (!el) return;
    const next = placeBubble(rect, el.offsetHeight, el.offsetWidth);
    const id = window.requestAnimationFrame(() =>
      setPos((prev) => (prev && Math.abs(prev.top - next.top) < 1 && Math.abs(prev.left - next.left) < 1 ? prev : next)),
    );
    return () => window.cancelAnimationFrame(id);
  });

  return (
    <div className="pointer-events-none fixed inset-0 z-50" aria-live="polite">
      {dim ? (
        <svg className="pointer-events-auto absolute inset-0 h-full w-full" aria-hidden="true">
          <defs>
            <mask id="tour-cutout">
              <rect width="100%" height="100%" fill="white" />
              {rect ? (
                <motion.rect
                  rx={18}
                  fill="black"
                  initial={false}
                  animate={{ x: rect.x, y: rect.y, width: rect.w, height: rect.h }}
                  transition={transition}
                />
              ) : null}
            </mask>
          </defs>
          <rect width="100%" height="100%" fill="oklch(0.2 0.02 60 / 0.55)" mask="url(#tour-cutout)" />
          {rect ? (
            <motion.rect
              rx={18}
              fill="none"
              stroke="oklch(0.72 0.17 62)"
              strokeWidth={2}
              initial={false}
              animate={{ x: rect.x, y: rect.y, width: rect.w, height: rect.h }}
              transition={transition}
            />
          ) : null}
        </svg>
      ) : null}
      {children ? (
        <motion.div
          ref={bubbleRef}
          role="dialog"
          aria-label="Tour step"
          className={`pointer-events-auto absolute rounded-2xl border border-border bg-card p-4 text-card-foreground shadow-2xl sm:p-5 ${
            large ? "w-[min(calc(100vw-2rem),40rem)]" : "w-[min(calc(100vw-2rem),28rem)]"
          }`}
          style={{ top: 0, left: 0 }}
          initial={false}
          animate={{ x: pos?.left ?? GUTTER, y: pos?.top ?? GUTTER, opacity: pos ? 1 : 0 }}
          transition={reduce ? reducedTransition : spring.gentle}
        >
          {children}
        </motion.div>
      ) : null}
    </div>
  );
}
