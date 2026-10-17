"use client";

import type { ComponentType } from "react";
import type { IllustrationKey } from "./chapters";
import { ConnectionsArt, GuardArt, LensViewArt, LensesArt, ProblemArt, QuestionArt, RangeArt, WhiteboardArt } from "./illustrations-a";
import { AmbientArt, AsyncArt, ConvergeArt, HumansArt, PhonesArt, RealityArt, ReplayArt, TeamArt } from "./illustrations-b";

const ART: Record<IllustrationKey, ComponentType> = {
  problem: ProblemArt,
  whiteboard: WhiteboardArt,
  lenses: LensesArt,
  lensView: LensViewArt,
  question: QuestionArt,
  guard: GuardArt,
  connections: ConnectionsArt,
  range: RangeArt,
  converge: ConvergeArt,
  phones: PhonesArt,
  ambient: AmbientArt,
  reality: RealityArt,
  async: AsyncArt,
  replay: ReplayArt,
  team: TeamArt,
  humans: HumansArt,
};

export function Illustration({ name }: { name: IllustrationKey }) {
  const Art = ART[name];
  return <Art />;
}
