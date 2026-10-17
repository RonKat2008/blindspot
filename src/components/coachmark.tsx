"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

const STEPS = [
  "The map is your ideas, plotted on two lenses. Empty, hatched corners are places you have not gone.",
  "Type an idea and press Enter. Dots fly in from the box. You are the only one writing ideas.",
  "When a card appears, it is a question — never a suggestion. Open “Why am I seeing this?” to see which dots it means.",
];

const KEY = "blindspot-coach-done";

export function Coachmark() {
  const [step, setStep] = useState<number | null>(null);

  useEffect(() => {
    const id = window.setTimeout(() => {
      if (window.localStorage.getItem(KEY) !== "1") setStep(0);
    }, 0);
    return () => window.clearTimeout(id);
  }, []);

  if (step === null) return null;

  return (
    <div className="fixed inset-x-0 bottom-24 z-30 mx-auto w-[min(100%-1.5rem,24rem)] rounded-2xl border border-border bg-card p-4 shadow-lg sm:bottom-28">
      <p className="text-xs text-muted-foreground">
        Quick look {step + 1} / {STEPS.length}
      </p>
      <p className="mt-1 text-sm">{STEPS[step]}</p>
      <div className="mt-3 flex justify-between gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            window.localStorage.setItem(KEY, "1");
            setStep(null);
          }}
        >
          Skip
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={() => {
            if (step >= STEPS.length - 1) {
              window.localStorage.setItem(KEY, "1");
              setStep(null);
              return;
            }
            setStep(step + 1);
          }}
        >
          {step >= STEPS.length - 1 ? "Got it" : "Next"}
        </Button>
      </div>
    </div>
  );
}
