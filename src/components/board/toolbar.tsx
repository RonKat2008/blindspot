"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import type { SessionState } from "@/lib/contract";
import { spring } from "@/lib/motion";

type ToolbarProps = {
  lens: boolean;
  showConn: boolean;
  recording: boolean;
  canConverge: boolean;
  replayOn: boolean;
  scripted: boolean;
  onText: () => void;
  onImage: () => void;
  onRecordStart: () => void;
  onRecordStop: () => void;
  onLens: (next: boolean) => void;
  onConn: () => void;
  onConverge: () => void;
  onReplay: () => void;
};

/** One floating toolbar, bottom centre: make things on the left, look at them on the right. */
export function Toolbar(p: ToolbarProps) {
  return (
    <div
      role="toolbar"
      aria-label="Board tools"
      className="flex max-w-[calc(100vw-1.5rem)] items-center gap-0.5 overflow-x-auto rounded-2xl border border-rule bg-paper-raised/95 p-1 shadow-[0_14px_34px_-16px_oklch(30%_0.04_60/0.45)] backdrop-blur [scrollbar-width:none]"
    >
      <Tool label="Text" kbd="T" primary onClick={p.onText} tour="add-sticky" icon={<span className="text-base leading-none">+</span>} />
      {!p.scripted ? (
        <>
          <Tool label="Image" kbd="I" onClick={p.onImage} icon={<ImageIcon />} />
          <Tool
            label={p.recording ? "Release to stop" : "Hold to record"}
            short="Voice"
            kbd="R"
            active={p.recording}
            onPointerDown={p.onRecordStart}
            onPointerUp={p.onRecordStop}
            icon={<span className={`block size-2.5 rounded-full ${p.recording ? "animate-pulse bg-[oklch(60%_0.2_25)]" : "bg-[oklch(55%_0.16_25)]"}`} />}
          />
        </>
      ) : null}
      <span aria-hidden className="mx-1 h-6 w-px shrink-0 bg-rule" />
      <div data-tour="lens-toggle" className="flex shrink-0 rounded-xl bg-paper-sunk/70 p-0.5">
        <Seg active={!p.lens} onClick={() => p.onLens(false)}>
          Board
        </Seg>
        <Seg active={p.lens} onClick={() => p.onLens(true)}>
          Lens<span className="max-sm:hidden">&nbsp;view</span>
        </Seg>
      </div>
      <Tool label="Threads" kbd="C" active={p.showConn} onClick={p.onConn} icon={<ThreadIcon dashed={!p.showConn} />} />
      {!p.scripted && p.canConverge ? (
        <>
          <Tool label="Converge" onClick={p.onConverge} icon={<span className="text-sm leading-none">★</span>} />
          <Tool label="Replay" active={p.replayOn} onClick={p.onReplay} icon={<span className="text-xs leading-none">▶</span>} />
        </>
      ) : null}
    </div>
  );
}

function Tool({
  label,
  short,
  kbd,
  icon,
  active,
  primary,
  tour,
  onClick,
  onPointerDown,
  onPointerUp,
}: {
  label: string;
  short?: string;
  kbd?: string;
  icon: ReactNode;
  active?: boolean;
  primary?: boolean;
  tour?: string;
  onClick?: () => void;
  onPointerDown?: () => void;
  onPointerUp?: () => void;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.button
      type="button"
      data-tour={tour}
      aria-pressed={active}
      title={kbd ? `${label} (${kbd})` : label}
      whileTap={reduce ? undefined : { scale: 0.94 }}
      transition={spring.snappy}
      onClick={onClick}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerLeave={active && onPointerUp ? onPointerUp : undefined}
      className={[
        "flex h-10 shrink-0 items-center gap-1.5 rounded-xl px-3 text-sm font-medium whitespace-nowrap transition-colors select-none",
        primary ? "bg-ink text-paper-raised hover:bg-ink/90" : active ? "bg-paper-sunk text-ink" : "text-ink-soft hover:bg-paper-sunk hover:text-ink",
      ].join(" ")}
    >
      {icon}
      <span className="max-sm:sr-only">{short && !active ? short : label}</span>
    </motion.button>
  );
}

function Seg({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`flex h-9 items-center rounded-[10px] px-3 text-xs font-medium whitespace-nowrap transition-colors ${active ? "bg-ink text-paper-raised" : "text-ink-soft hover:text-ink"}`}
    >
      {children}
    </button>
  );
}

function ImageIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.4">
      <rect x="2" y="3" width="12" height="10" rx="1.5" />
      <circle cx="6" cy="6.5" r="1.2" />
      <path d="M2.5 12l3.5-3.5 2.5 2.5 2-2 3 3" />
    </svg>
  );
}

function ThreadIcon({ dashed }: { dashed: boolean }) {
  return (
    <svg width="18" height="12" aria-hidden>
      <path d="M2 10 Q9 0 16 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray={dashed ? "2 2" : undefined} />
    </svg>
  );
}

export function AxisPick({
  label,
  value,
  axes,
  onChange,
}: {
  label: string;
  value: string;
  axes: SessionState["axes"];
  onChange: (id: string) => void;
}) {
  return (
    <label className="flex items-center gap-1 text-ink-soft">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="max-w-[9.5rem] overflow-hidden rounded-md bg-transparent py-0.5 text-xs font-medium text-ellipsis text-ink outline-none focus-visible:ring-2 focus-visible:ring-signal-ink max-sm:max-w-[7.5rem]"
      >
        {axes.map((a) => (
          <option key={a.id} value={a.id}>
            {a.poleA} ↔ {a.poleB}
          </option>
        ))}
      </select>
    </label>
  );
}
