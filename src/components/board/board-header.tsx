"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import type { Axis } from "@/lib/contract";
import { AXIS_COUNT_MAX } from "@/lib/contract";
import { reducedTransition, spring } from "@/lib/motion";

export const EXAMPLES = [
  "How might we improve onboarding for new users?",
  "How might we make our campus greener?",
  "How might we get more people to vote?",
];

export function PromptEntry({ onSubmit }: { onSubmit: (prompt: string) => void }) {
  const [value, setValue] = useState("");
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reduce ? reducedTransition : spring.gentle}
      className="w-full"
    >
      <p className="text-[11px] font-semibold tracking-[0.18em] text-ink-soft uppercase">Blind Spot · a whiteboard that only asks</p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (value.trim().length >= 3) onSubmit(value.trim());
        }}
      >
        <label htmlFor="bs-prompt" className="sr-only">
          What are we brainstorming?
        </label>
        <textarea
          id="bs-prompt"
          autoFocus
          rows={1}
          value={value}
          maxLength={300}
          placeholder="What are we brainstorming?"
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (value.trim().length >= 3) onSubmit(value.trim());
            }
          }}
          className="font-display mt-2 field-sizing-content w-full resize-none bg-transparent text-[clamp(2rem,1.2rem+3.2vw,3.75rem)] leading-[1.05] tracking-tight text-ink outline-none placeholder:text-ink-faint/80 placeholder:italic"
        />
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button type="submit" disabled={value.trim().length < 3} className="h-9 px-4">
            Start the board ↵
          </Button>
          <span className="text-xs text-ink-soft">or try one:</span>
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => onSubmit(ex)}
              className="rounded-full border border-rule bg-paper-raised px-3 py-1.5 text-left text-xs text-ink-soft transition hover:-translate-y-px hover:border-ink/40 hover:text-ink focus-visible:border-ink"
            >
              {ex}
            </button>
          ))}
        </div>
      </form>
    </motion.div>
  );
}

export function LensChips({
  axes,
  finding,
  saving,
  lens,
  xId,
  yId,
  onSave,
}: {
  axes: Axis[];
  finding: boolean;
  saving: boolean;
  lens: boolean;
  xId: string | null;
  yId: string | null;
  onSave: (axes: { id?: string; poleA: string; poleB: string }[]) => void;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState({ poleA: "", poleB: "" });

  if (finding) {
    return (
      <div role="status" className="flex w-fit items-center gap-2 rounded-full border border-dashed border-signal/70 bg-signal-wash px-3 py-1 text-xs text-signal-ink">
        <span className="bs-dots" aria-hidden>
          <span />
          <span />
          <span />
        </span>
        Finding the lenses for your question…
      </div>
    );
  }
  if (!axes.length) return null;

  const commit = (id: string) => {
    const next = axes.map((a) => (a.id === id ? { id: a.id, poleA: draft.poleA.trim() || a.poleA, poleB: draft.poleB.trim() || a.poleB } : { id: a.id, poleA: a.poleA, poleB: a.poleB }));
    setEditing(null);
    onSave(next);
  };

  return (
    <div className="flex min-w-0 items-center gap-1.5 overflow-x-auto pb-1 [mask-image:linear-gradient(to_right,black_92%,transparent)] [scrollbar-width:none]">
      <span className="shrink-0 text-[10px] font-semibold tracking-[0.14em] text-ink-soft uppercase">Lenses</span>
      {axes.map((axis) => {
        const color = `var(--axis-${axis.position % 6})`;
        const role = lens ? (axis.id === xId ? "across" : axis.id === yId ? "up" : null) : null;
        if (editing === axis.id) {
          return (
            <form
              key={axis.id}
              className="flex shrink-0 items-center gap-1 rounded-full border bg-paper-raised px-2 py-0.5"
              style={{ borderColor: color }}
              onSubmit={(e) => {
                e.preventDefault();
                commit(axis.id);
              }}
              onKeyDown={(e) => e.key === "Escape" && setEditing(null)}
            >
              <input aria-label="Left end" autoFocus value={draft.poleA} maxLength={40} onChange={(e) => setDraft((d) => ({ ...d, poleA: e.target.value }))} className="w-24 bg-transparent text-xs outline-none" />
              <span className="text-xs text-ink-faint">↔</span>
              <input aria-label="Right end" value={draft.poleB} maxLength={40} onChange={(e) => setDraft((d) => ({ ...d, poleB: e.target.value }))} className="w-24 bg-transparent text-xs outline-none" />
              <button type="submit" className="rounded-full bg-ink px-2 py-0.5 text-[11px] text-paper-raised">Save</button>
              {axes.length > 2 ? (
                <button
                  type="button"
                  className="px-1 text-[11px] text-ink-soft hover:text-ink"
                  onClick={() => {
                    setEditing(null);
                    onSave(axes.filter((a) => a.id !== axis.id).map(({ id, poleA, poleB }) => ({ id, poleA, poleB })));
                  }}
                >
                  Remove
                </button>
              ) : null}
            </form>
          );
        }
        return (
          <button
            key={axis.id}
            type="button"
            disabled={saving}
            title="We place each idea somewhere between these two ends. Click to edit."
            onClick={() => {
              setDraft({ poleA: axis.poleA, poleB: axis.poleB });
              setEditing(axis.id);
            }}
            className="group flex shrink-0 items-center gap-1.5 rounded-full border border-rule bg-paper-raised px-2.5 py-1 text-xs text-ink transition hover:-translate-y-px hover:border-ink/40 disabled:opacity-60"
            style={role ? { borderColor: color, boxShadow: `inset 0 0 0 1px ${color}` } : undefined}
          >
            <span className="size-2 rounded-full" style={{ background: color }} />
            {axis.poleA} <span className="text-ink-faint">↔</span> {axis.poleB}
            {role ? <span className="text-[10px] text-ink-soft">· {role}</span> : null}
            <span aria-hidden className="text-ink-faint opacity-0 transition-opacity group-hover:opacity-100">✎</span>
          </button>
        );
      })}
      {axes.length < AXIS_COUNT_MAX ? (
        <button
          type="button"
          disabled={saving}
          onClick={() => onSave([...axes.map(({ id, poleA, poleB }) => ({ id, poleA, poleB })), { poleA: "one end", poleB: "other end" }])}
          className="shrink-0 rounded-full px-2 py-1 text-xs text-ink-soft hover:text-ink"
        >
          + lens
        </button>
      ) : null}
      {saving ? <span className="shrink-0 text-xs text-ink-soft italic">re-placing your notes…</span> : null}
    </div>
  );
}

export function PhoneQrButton({ sessionId }: { sessionId: string | null }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"join" | "ar">("join");
  if (!sessionId) return null;
  const path = `/${mode}/${sessionId}`;
  const url = typeof window === "undefined" ? path : `${window.location.origin}${path}`;
  return (
    <div className="relative">
      <Button type="button" variant="ghost" className="h-8 px-2.5" aria-expanded={open} title="Add ideas from a phone" onClick={() => setOpen((v) => !v)}>
        <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden fill="currentColor">
          <rect x="1" y="1" width="5" height="5" rx="1" />
          <rect x="8" y="1" width="5" height="5" rx="1" />
          <rect x="1" y="8" width="5" height="5" rx="1" />
          <rect x="9" y="9" width="3" height="3" />
        </svg>
        <span className="max-sm:sr-only">Phone</span>
      </Button>
      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="absolute top-full right-0 z-50 mt-2 w-56 rounded-2xl border border-rule bg-paper-raised p-4 shadow-[var(--shadow-card)]"
          >
            <div role="group" aria-label="Phone mode" className="mb-3 flex rounded-xl border border-rule p-0.5 text-xs">
              {(["join", "ar"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  aria-pressed={mode === m}
                  onClick={() => setMode(m)}
                  className={`flex-1 rounded-lg px-2 py-1 transition-colors ${mode === m ? "bg-ink text-paper" : "text-ink-soft hover:text-ink"}`}
                >
                  {m === "join" ? "Add ideas" : "AR view"}
                </button>
              ))}
            </div>
            <QRCodeSVG value={url} size={120} bgColor="transparent" className="mx-auto" />
            <p className="mt-2 text-center text-sm">{mode === "join" ? "Add ideas from your phone" : "See the map around you"}</p>
            <p className="mt-1 truncate text-center text-[11px] text-ink-soft">{url}</p>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
