"use client";

import { useRef } from "react";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";
import { reducedTransition, spring } from "@/lib/motion";

export type PointMedia = { type: "image" | "audio"; url?: string };

type PointProps = {
  id: string;
  text: string;
  color: string;
  /** Centre of the dot, in map pixels. */
  x: number;
  y: number;
  /** Where a brand-new point starts (the input bar), so it glides into place. */
  from?: { x: number; y: number };
  media?: PointMedia;
  compact?: boolean;
  /** Put the label on the left of the dot (near the right edge). */
  flip?: boolean;
  isPending?: boolean;
  isSelected?: boolean;
  isLit?: boolean;
  isDimmed?: boolean;
  isIsland?: boolean;
  isShortlisted?: boolean;
  isAssumption?: boolean;
  canDrag: boolean;
  onSelect?: (id: string, additive: boolean) => void;
  onHover: (id: string | null) => void;
  onDragEnd: (id: string, x: number, y: number) => void;
};

const DOT = 11;

/** One idea on the thought map: a dot (or thumbnail) with a short label beside it. */
export function Point(p: PointProps) {
  const reduce = useReducedMotion();
  const moved = useRef(false);
  const start = p.from && !reduce ? { x: p.from.x, y: p.from.y, opacity: 0, scale: 0.4 } : false;

  return (
    <motion.div
      data-point-id={p.id}
      data-sticky-id={p.id}
      role="button"
      tabIndex={0}
      aria-label={p.text}
      aria-pressed={p.isSelected}
      className={cn(
        "group absolute top-0 left-0 z-[4] flex items-start gap-2 outline-none select-none",
        p.flip && "flex-row-reverse",
        p.canDrag ? "cursor-grab active:cursor-grabbing" : "cursor-pointer",
        "hover:z-[12] focus-visible:z-[12]",
        p.isSelected && "z-[14]",
      )}
      style={{ touchAction: "none" }}
      initial={start}
      animate={{ x: p.x, y: p.y, opacity: p.isDimmed ? 0.22 : 1, scale: 1 }}
      transition={reduce ? reducedTransition : spring.gentle}
      drag={p.canDrag}
      dragMomentum={false}
      dragElastic={0}
      onDragStart={() => {
        moved.current = true;
      }}
      onDragEnd={(_, info) => {
        p.onDragEnd(p.id, p.x + info.offset.x, p.y + info.offset.y);
        window.setTimeout(() => {
          moved.current = false;
        }, 0);
      }}
      onClick={(e) => {
        e.stopPropagation();
        if (!moved.current && !p.isPending) p.onSelect?.(p.id, e.shiftKey || e.metaKey);
      }}
      onKeyDown={(e) => {
        if ((e.key === "Enter" || e.key === " ") && !p.isPending) {
          e.preventDefault();
          p.onSelect?.(p.id, e.shiftKey);
        }
      }}
      onPointerEnter={() => p.onHover(p.id)}
      onPointerLeave={() => p.onHover(null)}
      onFocus={() => p.onHover(p.id)}
      onBlur={() => p.onHover(null)}
    >
      <Marker {...p} />
      <span
        className={cn(
          "mt-[-3px] max-w-[11.5rem] rounded px-1 text-[13px] leading-snug text-ink transition-colors max-sm:max-w-[9.5rem] max-sm:text-[12.5px]",
          p.flip && "absolute top-0 right-[14px] w-max text-right",
          p.compact ? "line-clamp-2 max-w-[8.5rem] text-[11.5px] max-sm:line-clamp-1 max-sm:max-w-[6.5rem] max-sm:text-[11px]" : "line-clamp-3",
          "group-hover:bg-paper/90 group-focus-visible:bg-paper/90",
          p.isSelected && "bg-paper/95 font-medium",
          p.isAssumption && "italic text-ink-soft",
          p.isPending && "bs-shimmer text-ink-soft",
        )}
        title={p.text}
      >
        {p.isShortlisted ? <span className="mr-1 text-accept">★</span> : null}
        {p.text}
      </span>
    </motion.div>
  );
}

function Marker({ color, media, isSelected, isLit, isIsland, isPending, isAssumption }: PointProps) {
  const ring = isSelected
    ? "ring-2 ring-ink ring-offset-2 ring-offset-paper"
    : isLit
      ? "ring-2 ring-signal ring-offset-2 ring-offset-paper"
      : "group-hover:ring-2 group-hover:ring-ink/30 group-hover:ring-offset-2 group-hover:ring-offset-paper";

  // Centre the marker on (x, y): the parent is positioned by the marker's centre.
  if (media?.type === "image") {
    return (
      <span className={cn("-mt-[14px] -ml-[14px] block size-7 shrink-0 overflow-hidden rounded-full border-2 border-paper-raised bg-paper-sunk shadow-sm transition-shadow", ring)}>
        {media.url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={media.url} alt="" draggable={false} className="h-full w-full object-cover" />
        ) : null}
      </span>
    );
  }
  return (
    <span className="-mt-[5.5px] -ml-[5.5px] flex shrink-0 items-center gap-1">
      <span
        className={cn(
          "block shrink-0 rounded-full transition-shadow",
          ring,
          isIsland && !isSelected && "outline-1 outline-offset-2 outline-dashed outline-ink-faint",
          isPending && "animate-pulse",
          isAssumption && "rounded-[2px] rotate-45",
        )}
        style={{ width: DOT, height: DOT, background: color }}
      />
      {media?.type === "audio" ? (
        <svg width="16" height="10" viewBox="0 0 16 10" aria-hidden className="text-ink-soft">
          {[3, 7, 4, 9, 5, 8, 3].map((h, i) => (
            <rect key={i} x={i * 2.3} y={(10 - h) / 2} width="1.3" height={h} rx="0.6" fill="currentColor" />
          ))}
        </svg>
      ) : null}
    </span>
  );
}
