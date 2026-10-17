"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ease, reducedTransition, spring } from "@/lib/motion";

export const AUTO_ACCEPT_MS = 5000;

export interface PendingNote {
  id: string;
  text: string;
  /** Epoch ms when it auto-lands; null while being edited. */
  deadline: number | null;
  landing: boolean;
}

interface PendingTrayProps {
  notes: PendingNote[];
  onEditStart: (id: string) => void;
  onEditSave: (id: string, text: string) => void;
  onReject: (id: string) => void;
}

const RING_R = 9;
const RING_C = 2 * Math.PI * RING_R;

/** Mounted (keyed by deadline) when a countdown starts, so it always runs the full 5s. */
function CountdownRing() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden className="-rotate-90 shrink-0">
      <circle cx="12" cy="12" r={RING_R} fill="none" stroke="oklch(28% 0.07 255 / 0.15)" strokeWidth="2.5" />
      <motion.circle
        cx="12"
        cy="12"
        r={RING_R}
        fill="none"
        stroke="oklch(45% 0.12 190)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray={RING_C}
        initial={{ strokeDashoffset: 0 }}
        animate={{ strokeDashoffset: RING_C }}
        transition={{ duration: AUTO_ACCEPT_MS / 1000, ease: "linear" }}
      />
    </svg>
  );
}

function Chip({ note, onEditStart, onEditSave, onReject }: { note: PendingNote } & Omit<PendingTrayProps, "notes">) {
  const [draft, setDraft] = useState(note.text);
  const editing = note.deadline === null && !note.landing;

  if (editing) {
    return (
      <form
        className="flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          onEditSave(note.id, draft);
        }}
      >
        <input
          autoFocus
          value={draft}
          maxLength={280}
          onChange={(e) => setDraft(e.target.value)}
          aria-label="Edit note text"
          className="min-w-[14ch] bg-transparent text-base outline-none"
        />
        <button type="submit" className="rounded-full bg-[oklch(28%_0.07_255)] px-3 py-1 text-xs text-[oklch(97%_0.01_85)]">
          Keep
        </button>
      </form>
    );
  }

  return (
    <div className="flex items-center gap-2.5">
      {note.deadline !== null && !note.landing && <CountdownRing key={note.deadline} />}
      <button
        type="button"
        onClick={() => {
          setDraft(note.text);
          onEditStart(note.id);
        }}
        className="max-w-[28ch] truncate text-left text-base focus-visible:underline focus-visible:outline-none"
        title="Tap to edit before it lands"
      >
        {note.landing ? <span className="mr-1.5 opacity-60">→ on the map</span> : null}
        {note.text}
      </button>
      {!note.landing && (
        <button
          type="button"
          aria-label={`Reject “${note.text}”`}
          onClick={() => onReject(note.id)}
          className="grid size-7 place-items-center rounded-full text-sm opacity-60 transition-opacity hover:bg-[oklch(28%_0.07_255/0.08)] hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-2"
        >
          ✕
        </button>
      )}
    </div>
  );
}

export function PendingTray(props: PendingTrayProps) {
  const reduced = useReducedMotion();
  return (
    <ul aria-live="polite" aria-label="New notes from the wall" className="flex flex-wrap items-end gap-3">
      <AnimatePresence>
        {props.notes.map((note) => (
          <motion.li
            key={note.id}
            layout={!reduced}
            initial={{ opacity: 0, y: reduced ? 0 : 20, rotate: reduced ? 0 : -1.5 }}
            animate={
              note.landing
                ? { opacity: 0, y: reduced ? 0 : -160, scale: reduced ? 1 : 0.85, rotate: 0 }
                : { opacity: 1, y: 0, rotate: reduced ? 0 : -0.5 }
            }
            exit={{ opacity: 0, scale: reduced ? 1 : 0.92 }}
            transition={reduced ? reducedTransition : note.landing ? { duration: 0.9, ease: ease.outExpo } : spring.gentle}
            className="rounded-sm px-3.5 py-2.5 shadow-[4px_6px_0_oklch(12%_0.04_255/0.25)]"
            style={{ background: "oklch(93% 0.07 95)", color: "oklch(28% 0.07 255)" }}
          >
            <Chip note={note} onEditStart={props.onEditStart} onEditSave={props.onEditSave} onReject={props.onReject} />
          </motion.li>
        ))}
      </AnimatePresence>
    </ul>
  );
}
