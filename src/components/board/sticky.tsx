"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useDragControls, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";
import { reducedTransition, spring } from "@/lib/motion";
import { STICKY_H, STICKY_W } from "./board-utils";

export type StickyTarget = { x: number; y: number; rotate: number; scale: number };

type StickyProps = {
  id: string;
  text: string;
  color: string;
  speaker?: string;
  authorColor?: string;
  target: StickyTarget;
  isPending?: boolean;
  isFresh?: boolean;
  isDimmed?: boolean;
  isHighlighted?: boolean;
  isIsland?: boolean;
  isShortlisted?: boolean;
  /** Rendered instead of the note body (kind "assumption"). */
  assumption?: React.ReactNode;
  canDrag: boolean;
  compact: boolean;
  onDrag: (id: string, dx: number, dy: number) => void;
  onDragEnd: (id: string, dx: number, dy: number) => void;
  onHover: (id: string | null) => void;
  onLinkStart: (id: string, e: React.PointerEvent) => void;
};

export function Sticky({
  id,
  text,
  color,
  speaker,
  authorColor,
  target,
  isPending,
  isFresh,
  isDimmed,
  isHighlighted,
  isIsland,
  isShortlisted,
  assumption,
  canDrag,
  compact,
  onDrag,
  onDragEnd,
  onHover,
  onLinkStart,
}: StickyProps) {
  const reduce = useReducedMotion();
  const dragged = useRef(false);
  const controls = useDragControls();

  return (
    <motion.div
      data-sticky-id={id}
      role="note"
      aria-label={text}
      tabIndex={0}
      className={cn(
        "group absolute top-0 left-0 z-[4] flex hover:z-[15] focus-visible:z-[15] cursor-grab touch-none flex-col rounded-[3px] p-3 text-left text-[0.9rem] leading-snug text-ink select-none active:cursor-grabbing",
        "shadow-[0_1px_0_oklch(30%_0.04_60/0.08),0_10px_22px_-10px_oklch(30%_0.04_60/0.35)]",
        "transition-[box-shadow,opacity,filter] duration-200 hover:shadow-[0_1px_0_oklch(30%_0.04_60/0.08),0_18px_30px_-12px_oklch(30%_0.04_60/0.45)]",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal-ink",
        isIsland && "outline-[1.5px] outline-offset-3 outline-dashed outline-ink-faint/70",
        isHighlighted && "outline-2 outline-offset-3 outline-solid outline-signal",
        isDimmed && "opacity-30",
      )}
      style={{ width: STICKY_W, height: STICKY_H, background: assumption ? "transparent" : color, zIndex: isHighlighted ? 6 : undefined }}
      initial={isFresh && !reduce ? { x: target.x, y: target.y + 24, rotate: target.rotate, scale: 0.6, opacity: 0 } : false}
      animate={{ x: target.x, y: target.y, rotate: target.rotate, scale: target.scale, opacity: isDimmed ? 0.3 : 1 }}
      transition={reduce ? reducedTransition : spring.gentle}
      drag={canDrag}
      dragListener={false}
      dragControls={controls}
      dragMomentum={false}
      onPointerDown={(e) => {
        if (!canDrag || (e.target as HTMLElement).closest("[data-link-handle]")) return;
        controls.start(e);
      }}
      whileDrag={reduce ? undefined : { scale: target.scale * 1.04, rotate: 0, zIndex: 20 }}
      onDragStart={() => {
        dragged.current = true;
      }}
      onDrag={(_, info) => onDrag(id, info.offset.x, info.offset.y)}
      onDragEnd={(_, info) => {
        onDragEnd(id, info.offset.x, info.offset.y);
        window.setTimeout(() => {
          dragged.current = false;
        }, 0);
      }}
      onClick={(e) => e.stopPropagation()}
      onPointerEnter={() => onHover(id)}
      onPointerLeave={() => onHover(null)}
      onFocus={() => onHover(id)}
      onBlur={() => onHover(null)}
    >
      {assumption ? <div className="absolute inset-0 overflow-hidden [&>article]:h-full [&>article]:max-w-none">{assumption}</div> : null}
      {isShortlisted ? (
        <span aria-label="Shortlisted" className="absolute -top-2 -left-2 grid size-5 place-items-center rounded-full bg-accept text-[11px] text-paper-raised shadow-sm">
          ★
        </span>
      ) : null}
      <p className={cn("overflow-hidden break-words", assumption && "sr-only", compact ? "line-clamp-3 text-[1.05rem]" : "line-clamp-4")}>{text}</p>
      <div className="mt-auto flex items-center justify-between pt-1 text-[10px] tracking-wide text-ink-soft uppercase">
        <span className="flex min-w-0 items-center gap-1 overflow-hidden text-ellipsis whitespace-nowrap">
          {authorColor ? <span aria-hidden className="size-1.5 shrink-0 rounded-full" style={{ background: authorColor }} /> : null}
          {speaker ?? ""}
        </span>
        {isPending ? <span className="text-signal-ink normal-case italic">placing…</span> : null}
        {isIsland && !isPending ? (
          <span className="hidden text-ink-soft normal-case italic group-hover:inline" title="Nothing else connects to this yet">
            island
          </span>
        ) : null}
      </div>
      {isPending ? <div aria-hidden className="bs-shimmer pointer-events-none absolute inset-0 rounded-[3px]" /> : null}
      {!isPending && canDrag ? (
        <button
          type="button"
          data-link-handle
          aria-label="Draw a connection from this note"
          title="Drag to another note to connect them"
          className="absolute top-1/2 -right-2.5 grid size-5 -translate-y-1/2 place-items-center rounded-full border border-ink/40 bg-paper-raised opacity-0 shadow-sm transition-opacity group-hover:opacity-100 focus-visible:opacity-100 max-sm:opacity-60"
          onPointerDown={(e) => {
            e.stopPropagation();
            onLinkStart(id, e);
          }}
        >
          <span className="size-1.5 rounded-full bg-ink" />
        </button>
      ) : null}
    </motion.div>
  );
}

type DraftProps = {
  x: number;
  y: number;
  color: string;
  initialText: string;
  onCommit: (text: string) => void;
  onCancel: () => void;
};

export function DraftSticky({ x, y, color, initialText, onCommit, onCancel }: DraftProps) {
  const reduce = useReducedMotion();
  const [text, setText] = useState(initialText);
  const ref = useRef<HTMLTextAreaElement>(null);
  const done = useRef(false);
  const finish = (value: string) => {
    if (done.current) return;
    done.current = true;
    if (value.trim()) onCommit(value.trim());
    else onCancel();
  };

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
  }, []);

  return (
    <motion.div
      className="absolute top-0 left-0 z-30 rounded-[3px] p-3 shadow-[0_18px_30px_-12px_oklch(30%_0.04_60/0.45)] ring-2 ring-ink/80"
      style={{ width: STICKY_W, height: STICKY_H, background: color }}
      initial={reduce ? { x, y, opacity: 0 } : { x, y, scale: 0.7, opacity: 0 }}
      animate={{ x, y, scale: 1, opacity: 1 }}
      transition={reduce ? reducedTransition : spring.snappy}
      onClick={(e) => e.stopPropagation()}
    >
      <textarea
        ref={ref}
        value={text}
        maxLength={280}
        aria-label="New idea"
        placeholder="Type an idea…"
        className="h-[calc(100%-14px)] w-full resize-none bg-transparent text-[0.9rem] leading-snug text-ink outline-none placeholder:text-ink-soft/70"
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            finish(text);
          }
          if (e.key === "Escape") finish("");
        }}
        onBlur={() => finish(text)}
      />
      <p className="text-right text-[10px] text-ink-soft">Enter ↵ to stick · Esc to cancel</p>
    </motion.div>
  );
}
