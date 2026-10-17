"use client";

import { motion, useReducedMotion } from "motion/react";
import { ConvergePanel } from "@/components/converge/converge-panel";
import { WriteAssumptionPrompt } from "@/components/assumption/assumption-card";
import type { SessionState } from "@/lib/contract";
import { reducedTransition, spring } from "@/lib/motion";

/** PATCH /api/ideas/[id] — shortlist or kind changes. Throws on failure. */
export async function patchIdea(id: string, body: { shortlisted?: boolean; kind?: "idea" | "assumption" }): Promise<void> {
  const res = await fetch(`/api/ideas/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
}

export function ConvergeDrawer({
  state,
  onToggleShortlist,
  onClose,
}: {
  state: SessionState;
  onToggleShortlist: (ideaId: string, next: boolean) => void;
  onClose: () => void;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.aside
      aria-label="Converge"
      className="fixed inset-y-0 right-0 z-40 flex w-[min(28rem,100vw)] flex-col overflow-y-auto border-l border-rule bg-paper-raised shadow-[var(--shadow-card)]"
      initial={reduce ? { opacity: 0 } : { x: "100%" }}
      animate={reduce ? { opacity: 1 } : { x: 0 }}
      exit={reduce ? { opacity: 0 } : { x: "100%" }}
      transition={reduce ? reducedTransition : spring.gentle}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
    >
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-rule bg-paper-raised/95 px-5 py-3 backdrop-blur">
        <p className="font-display text-lg">Converge</p>
        <button type="button" onClick={onClose} autoFocus className="rounded-full px-3 py-1 text-sm text-ink-soft hover:bg-paper-sunk hover:text-ink">
          Done
        </button>
      </div>
      <div className="p-5">
        <ConvergePanel state={state} onToggleShortlist={onToggleShortlist} />
      </div>
    </motion.aside>
  );
}

export function AssumptionWriter({ onSubmit, onClose }: { onSubmit: (text: string) => Promise<void>; onClose: () => void }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label="Write the assumption"
      className="fixed inset-0 z-50 grid place-items-center bg-[oklch(22%_0.02_60/0.35)] p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={reduce ? reducedTransition : { duration: 0.2 }}
      onClick={onClose}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
    >
      <div className="w-full max-w-md rounded-3xl border border-rule bg-paper-raised p-5 shadow-[var(--shadow-card)]" onClick={(e) => e.stopPropagation()}>
        <WriteAssumptionPrompt onSubmit={onSubmit} />
        <button type="button" onClick={onClose} className="mt-3 text-sm text-ink-soft underline-offset-4 hover:text-ink hover:underline">
          Not now
        </button>
      </div>
    </motion.div>
  );
}
