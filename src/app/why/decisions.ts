/**
 * The real human judgment calls made while building Blind Spot on
 * Oct 17, 2026. Mirrors docs/JUDGMENT_LOG.md. Do not add calls that
 * did not happen.
 */
export interface Decision {
  id: string;
  label: string;
  title: string;
  aiSide: string;
  weDecided: string;
  why: string;
}

export const DECISIONS: readonly Decision[] = [
  {
    id: "one-rule",
    label: "The one rule",
    title: "The AI never writes an idea.",
    aiSide:
      "Language models are built to be helpful, so the first drafts of every prompt slid into suggestions: \"you could try…\", \"what about a…\".",
    weDecided:
      "We built a separate checker (a regex blocklist plus an LLM judge, with a template fallback) that rejects any question containing a suggestion before it reaches the board.",
    why: "The moment the AI generates content, the thesis collapses: it becomes one more machine narrowing everyone toward the same answer.",
  },
  {
    id: "lenses",
    label: "Lenses over clusters",
    title: "Gaps you can name.",
    aiSide:
      "The default playbook: embed the ideas, project them with UMAP, and show clusters on a plot.",
    weDecided:
      "Map every idea onto named bipolar lenses picked for the problem, like incremental ↔ radical.",
    why: "An empty patch of a UMAP plot can't be named. An axis can. So the gap becomes a sentence: \"you never went radical.\"",
  },
  {
    id: "scoring",
    label: "Caught a flaw",
    title: "Absolute scores, not normalized ones.",
    aiSide:
      "The AI-proposed scoring normalized each lens per session, stretching the ideas across the full range.",
    weDecided:
      "We measured the raw embeddings, saw that normalization made every axis look balanced and hid every real gap, and switched to absolute scores.",
    why: "A tool for finding blind spots that erases blind spots by construction is worse than no tool.",
  },
  {
    id: "whiteboard",
    label: "Whiteboard first",
    title: "Meet people where brainstorms happen.",
    aiSide:
      "The first build was a form-and-chart flow: type ideas into a box, review lenses, look at a scatter plot.",
    weDecided:
      "We pivoted the whole UI to a whiteboard-first board of sticky notes, with the lens view one flip away.",
    why: "That's where brainstorms actually happen. A tool you have to leave the room for doesn't get used.",
  },
  {
    id: "connections",
    label: "Connections",
    title: "Thinking is relational.",
    aiSide: "Ideas were independent dots, each scored on its own.",
    weDecided:
      "We added threads between related ideas, clusters, islands, and links you draw yourself.",
    why: "Ideas don't live alone. What connects to what, and what connects to nothing, is part of the picture.",
  },
  {
    id: "async",
    label: "Async",
    title: "Brainstorms don't happen in one sitting.",
    aiSide: "A single live session that ended when the tab closed.",
    weDecided:
      "Accounts, saved boards, invite links, and a \"while you were away\" digest.",
    why: "Real teams come back to a problem over days. The board has to remember, and has to tell you what changed.",
  },
  {
    id: "evidence",
    label: "Questions, not answers",
    title: "Evidence, not ideas.",
    aiSide:
      "A reality-check feature could easily have returned \"here's what others built, try this.\"",
    weDecided:
      "Even the Glasser reality check only shows how crowded a space is. It reports evidence and never hands over an idea.",
    why: "Every surface follows the same rule. The AI can ask questions and show evidence. The ideas come from you.",
  },
];
