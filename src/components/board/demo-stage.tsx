"use client";

import { DemoTour } from "@/components/demo/demo-tour";
import { Board } from "./board";

/** /demo: the scripted tour rendered on the real whiteboard. */
export function DemoStage({ autoplay }: { autoplay: boolean }) {
  return <DemoTour autoplay={autoplay} renderStage={(snapshot) => <Board snapshot={snapshot} />} />;
}
