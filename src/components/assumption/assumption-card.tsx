"use client";

/**
 * Usage (orchestrator mounts these beside an assumption provocation):
 *
 *   <AssumptionCard idea={assumption} />
 *   <WriteAssumptionPrompt
 *     onSubmit={async (text) => {
 *       await addIdea(sessionId, text, { kind: "assumption" });
 *     }}
 *   />
 *
 * AssumptionCard is for Idea.kind === "assumption". WriteAssumptionPrompt only
 * calls onSubmit; it does not post to the API itself.
 */

import { useId, useState, type FormEvent } from "react";
import { motion, useReducedMotion } from "motion/react";
import type { Idea } from "@/lib/contract";
import { reducedTransition, spring } from "@/lib/motion";

export function AssumptionCard({ idea }: { idea: Idea }) {
  return (
    <article
      aria-label="Assumption we share"
      className="relative max-w-sm px-4 py-5 text-sm leading-snug"
      style={{
        color: "oklch(22% 0.02 60)",
        backgroundColor: "oklch(96% 0.01 250)",
        backgroundImage:
          "linear-gradient(oklch(78% 0.03 250 / 0.55) 1px, transparent 1px), linear-gradient(90deg, oklch(78% 0.03 250 / 0.55) 1px, transparent 1px)",
        backgroundSize: "14px 14px",
        clipPath:
          "polygon(0 6px, 8px 0, 18px 5px, 32px 0, 48px 4px, 70px 0, 100% 3px, 100% calc(100% - 4px), calc(100% - 10px) 100%, 60% calc(100% - 2px), 20px 100%, 0 calc(100% - 6px))",
        boxShadow: "0 10px 24px -16px oklch(30% 0.04 60 / 0.45)",
      }}
    >
      <p className="mb-2 text-[0.68rem] font-medium tracking-[0.14em] uppercase" style={{ color: "oklch(40% 0.04 250)" }}>
        Assumption we share
      </p>
      <p className="font-medium">{idea.text}</p>
      {idea.speaker ? (
        <p className="mt-2 text-xs" style={{ color: "oklch(42% 0.03 250)" }}>
          {idea.speaker}
        </p>
      ) : null}
    </article>
  );
}

export function WriteAssumptionPrompt({ onSubmit }: { onSubmit: (text: string) => void | Promise<void> }) {
  const reduce = useReducedMotion() ?? false;
  const fieldId = useId();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const trimmed = text.trim();

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!trimmed || busy) return;
    setBusy(true);
    try {
      await onSubmit(trimmed);
      setText("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <motion.form
      onSubmit={submit}
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reduce ? reducedTransition : spring.gentle}
      className="flex w-full min-w-0 flex-col gap-2"
      aria-label="Write the assumption you share"
    >
      <label htmlFor={fieldId} className="text-sm" style={{ color: "oklch(45% 0.02 60)" }}>
        Write the assumption you share
      </label>
      <textarea
        id={fieldId}
        value={text}
        rows={3}
        required
        placeholder="We're assuming that…"
        onChange={(event) => setText(event.target.value)}
        className="w-full resize-y rounded-xl border px-3 py-2 text-base leading-snug outline-none focus-visible:ring-2"
        style={{
          borderColor: "var(--rule, oklch(86% 0.02 80))",
          background: "var(--paper-raised, oklch(99% 0.006 85))",
          color: "oklch(22% 0.02 60)",
        }}
      />
      <button
        type="submit"
        disabled={!trimmed || busy}
        className="self-start rounded-full px-4 py-2 text-sm font-medium disabled:opacity-50"
        style={{ background: "oklch(22% 0.02 60)", color: "oklch(98% 0.01 85)" }}
      >
        {busy ? "Saving…" : "Add assumption"}
      </button>
    </motion.form>
  );
}
