import type { Metadata } from "next";
import { Suspense } from "react";
import { Deck } from "./deck";

export const metadata: Metadata = {
  title: "Pitch · Blind Spot",
  description: "Blind Spot in eight slides. Press N for presenter notes.",
};

export default function PitchPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-[var(--paper)]" />}>
      <Deck />
    </Suspense>
  );
}
