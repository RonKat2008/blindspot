import type { Idea, Provocation, SessionState } from "@/lib/contract";
import { rangeShare } from "./range";

export type ReplayFrame = {
  /** Milliseconds from the first event. 0 when the session has no events. */
  offsetMs: number;
  at: string;
  ideaIds: string[];
  provocationIds: string[];
  range: number;
};

type Mark =
  | { kind: "idea"; at: number; id: string }
  | { kind: "provocation"; at: number; id: string };

function stamp(iso: string): number {
  const value = Date.parse(iso);
  return Number.isNaN(value) ? 0 : value;
}

/** One cumulative frame per idea or question, oldest first. */
export function buildFrames(state: SessionState): ReplayFrame[] {
  const marks: Mark[] = [
    ...state.ideas.map((idea) => ({ kind: "idea" as const, at: stamp(idea.createdAt), id: idea.id })),
    ...state.provocations.map((item) => ({
      kind: "provocation" as const,
      at: stamp(item.createdAt),
      id: item.id,
    })),
  ].sort((a, b) => a.at - b.at || (a.kind === b.kind ? 0 : a.kind === "idea" ? -1 : 1));

  if (marks.length === 0) {
    return [
      {
        offsetMs: 0,
        at: state.session.createdAt,
        ideaIds: [],
        provocationIds: [],
        range: 0,
      },
    ];
  }

  const start = marks[0].at;
  const ideasById = new Map(state.ideas.map((idea) => [idea.id, idea]));
  const ideaIds: string[] = [];
  const provocationIds: string[] = [];
  const seenIdeas: Idea[] = [];

  return marks.map((mark) => {
    if (mark.kind === "idea") {
      ideaIds.push(mark.id);
      const idea = ideasById.get(mark.id);
      if (idea) seenIdeas.push(idea);
    } else {
      provocationIds.push(mark.id);
    }
    return {
      offsetMs: mark.at - start,
      at: new Date(mark.at).toISOString(),
      ideaIds: [...ideaIds],
      provocationIds: [...provocationIds],
      range: rangeShare(state.axes, seenIdeas),
    };
  });
}

export function ideaColor(idea: Idea | undefined): string {
  return idea?.color || "oklch(22% 0.02 60)";
}

export function provocationMarker(item: Provocation): "accepted" | "open" {
  return item.status === "accepted" ? "accepted" : "open";
}
