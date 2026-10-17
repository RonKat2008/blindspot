"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Axis } from "@/lib/contract";
import { AXIS_COUNT_MAX } from "@/lib/contract";
import { fadeUp, reducedTransition, spring, staggerChildren } from "@/lib/motion";

type Draft = { key: string; id?: string; poleA: string; poleB: string };

export function AxisReview({
  prompt,
  axes,
  busy,
  onStart,
}: {
  prompt: string;
  axes: Axis[];
  busy: boolean;
  onStart: (axes: { id?: string; poleA: string; poleB: string }[]) => void;
}) {
  const reduce = useReducedMotion();
  const [drafts, setDrafts] = useState<Draft[]>(() =>
    axes.map((axis) => ({ key: axis.id, id: axis.id, poleA: axis.poleA, poleB: axis.poleB })),
  );

  function update(key: string, field: "poleA" | "poleB", value: string) {
    setDrafts((rows) => rows.map((row) => (row.key === key ? { ...row, [field]: value } : row)));
  }

  const valid = drafts.length >= 2 && drafts.every((row) => row.poleA.trim() && row.poleB.trim());
  const transition = reduce ? reducedTransition : spring.gentle;

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-xl flex-col px-5 py-10">
      <motion.div initial="hidden" animate="show" variants={staggerChildren}>
        <motion.p variants={fadeUp} className="text-sm text-muted-foreground">
          Step 2 of 2
        </motion.p>
        <motion.h1 variants={fadeUp} className="mt-2 text-3xl font-semibold tracking-tight">
          These are lenses, not answers
        </motion.h1>
        <motion.p variants={fadeUp} className="mt-3 text-muted-foreground">
          Each row is a spectrum your ideas can sit on. Edit the words so they match{" "}
          <span className="text-foreground">{prompt}</span>. Nothing here is a suggestion.
        </motion.p>

        <motion.ul variants={fadeUp} className="mt-8 flex flex-col gap-3">
          {drafts.map((row, index) => (
            <motion.li
              key={row.key}
              layout={!reduce}
              transition={transition}
              className="rounded-2xl border border-border bg-card p-3"
            >
              <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                <span>Lens {index + 1}</span>
                <button
                  type="button"
                  className="underline-offset-2 hover:underline disabled:opacity-40"
                  disabled={drafts.length <= 2}
                  onClick={() => setDrafts((rows) => rows.filter((item) => item.key !== row.key))}
                >
                  Remove
                </button>
              </div>
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                <Input
                  aria-label={`Lens ${index + 1} left pole`}
                  value={row.poleA}
                  maxLength={40}
                  onChange={(e) => update(row.key, "poleA", e.target.value)}
                />
                <span className="text-xs text-muted-foreground">↔</span>
                <Input
                  aria-label={`Lens ${index + 1} right pole`}
                  value={row.poleB}
                  maxLength={40}
                  onChange={(e) => update(row.key, "poleB", e.target.value)}
                />
              </div>
            </motion.li>
          ))}
        </motion.ul>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            disabled={drafts.length >= AXIS_COUNT_MAX}
            onClick={() =>
              setDrafts((rows) => [
                ...rows,
                { key: `new-${rows.length}-${Date.now()}`, poleA: "", poleB: "" },
              ])
            }
          >
            Add a lens
          </Button>
          <Button
            type="button"
            size="lg"
            className="h-11 px-5"
            disabled={!valid || busy}
            onClick={() =>
              onStart(
                drafts.map((row) => ({
                  id: row.id,
                  poleA: row.poleA.trim(),
                  poleB: row.poleB.trim(),
                })),
              )
            }
          >
            {busy ? "Saving lenses…" : "Start brainstorm"}
          </Button>
        </div>
      </motion.div>
    </main>
  );
}
