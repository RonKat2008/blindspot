"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api-client";
import { fadeUp, reducedTransition, spring, staggerChildren } from "@/lib/motion";

const EXAMPLES = [
  "How might we improve onboarding for new users?",
  "How might we make campus dining feel less lonely?",
  "How might we help a team disagree productively?",
];

export function Landing() {
  const router = useRouter();
  const reduce = useReducedMotion();
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);

  async function start(text: string) {
    const value = text.trim();
    if (value.length < 3) {
      toast("Give it a little more — a full question works best.");
      return;
    }
    setBusy(true);
    try {
      const { sessionId } = await api.createSession({ prompt: value });
      router.push(`/s/${sessionId}?review=1`);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not start. Try again.");
      setBusy(false);
    }
  }

  const transition = reduce ? reducedTransition : spring.gentle;

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-2xl flex-col justify-center px-5 py-12">
      <motion.div initial="hidden" animate="show" variants={staggerChildren}>
        <motion.p variants={fadeUp} transition={transition} className="text-sm tracking-wide text-muted-foreground">
          Blind Spot
        </motion.p>
        <motion.h1
          variants={fadeUp}
          transition={transition}
          className="mt-3 text-balance text-4xl font-semibold leading-tight tracking-tight sm:text-5xl"
        >
          AI that widens your thinking without giving you a single idea
        </motion.h1>
        <motion.p variants={fadeUp} transition={transition} className="mt-4 max-w-lg text-lg text-muted-foreground">
          You write every idea. The map shows where your thinking clusters. The AI only asks questions.
        </motion.p>

        <motion.form
          variants={fadeUp}
          transition={transition}
          className="mt-8 flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            void start(prompt);
          }}
        >
          <label htmlFor="prompt" className="text-sm font-medium">
            What are you trying to figure out?
          </label>
          <Textarea
            id="prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="How might we…"
            rows={3}
            className="min-h-28 resize-none bg-card text-base"
            autoFocus
            disabled={busy}
          />
          <Button type="submit" size="lg" className="h-11 self-start px-5" disabled={busy}>
            {busy ? "Finding lenses…" : "Map my thinking"}
          </Button>
        </motion.form>

        <motion.div variants={fadeUp} transition={transition} className="mt-8">
          <p className="text-sm text-muted-foreground">Or start from an example</p>
          <div className="mt-2 flex flex-col gap-2">
            {EXAMPLES.map((example) => (
              <button
                key={example}
                type="button"
                disabled={busy}
                onClick={() => {
                  setPrompt(example);
                  void start(example);
                }}
                className="rounded-xl border border-border bg-card px-4 py-3 text-left text-sm transition-colors hover:bg-accent disabled:opacity-50"
              >
                {example}
              </button>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </main>
  );
}
