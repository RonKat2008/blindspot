import type { SessionState } from "@/lib/contract";
import { rangeShare } from "@/components/replay/range";

export function ledgerLine(state: SessionState): string {
  const ideas = state.ideas.length;
  const questions = state.provocations.length;
  return `${ideas} ideas by people · 0 by AI · ${questions} questions asked`;
}

export function rangeLabel(state: SessionState): string {
  return `Range ${Math.round(rangeShare(state.axes, state.ideas) * 100)}`;
}

export function recapMarkdown(state: SessionState): string {
  const lines: string[] = [`# ${state.session.prompt}`, ""];

  lines.push("## Lenses", "");
  for (const axis of state.axes) {
    lines.push(`- ${axis.poleA} ↔ ${axis.poleB}`);
  }
  lines.push("");

  lines.push("## Ideas", "");
  if (state.clusters && state.clusters.length > 0) {
    const placed = new Set<string>();
    state.clusters.forEach((cluster, index) => {
      lines.push(`### Cluster ${index + 1}`, "");
      for (const id of cluster.ideaIds) {
        const idea = state.ideas.find((item) => item.id === id);
        if (!idea) continue;
        placed.add(id);
        lines.push(`- ${idea.text}`);
      }
      lines.push("");
    });
    const rest = state.ideas.filter((idea) => !placed.has(idea.id));
    if (rest.length > 0) {
      lines.push("### Other", "");
      for (const idea of rest) lines.push(`- ${idea.text}`);
      lines.push("");
    }
  } else {
    const groups = new Map<string, string[]>();
    for (const idea of state.ideas) {
      const author = idea.speaker?.trim() || "Someone";
      const list = groups.get(author) ?? [];
      list.push(idea.text);
      groups.set(author, list);
    }
    for (const [author, texts] of groups) {
      lines.push(`### ${author}`, "");
      for (const text of texts) lines.push(`- ${text}`);
      lines.push("");
    }
  }

  lines.push("## Questions", "");
  if (state.provocations.length === 0) {
    lines.push("_No questions yet._", "");
  } else {
    for (const item of state.provocations) {
      const status = item.status === "shown" ? "still open" : item.status;
      lines.push(`- ${item.text} — ${status}`);
    }
    lines.push("");
  }

  lines.push(ledgerLine(state));
  return lines.join("\n").trim() + "\n";
}

export function boardLink(sessionId: string): string {
  if (typeof window === "undefined") return `/s/${sessionId}`;
  return `${window.location.origin}/s/${sessionId}`;
}
