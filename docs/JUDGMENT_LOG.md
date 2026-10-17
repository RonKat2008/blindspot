# Judgment log: what AI proposed, what we decided

Built Oct 17, 2026 for "Code Something AI Cannot Do Alone" (UC Berkeley, DiversaTech).
Rendered on the site at `/why`. Source of truth for the page: `src/app/why/decisions.ts`.

These are the real human judgment calls made today, in order. Nothing here is invented.

## Why we built it

<!-- FOUNDER_STORY -->
[Your story: when you noticed AI narrowing your team's ideas]

Microsoft Research found that generative AI narrows the range of ideas knowledge workers produce:
https://www.microsoft.com/en-us/research/articles/rethinking-ai-in-knowledge-work-from-assistant-to-tool-for-thought/

## The calls

| # | Call | AI proposed / built | We decided | Why |
|---|---|---|---|---|
| 1 | **The one rule** | Model drafts drifted into suggestions ("you could try…", "what about a…"). | A separate checker (regex blocklist + LLM judge, template fallback) rejects any question that contains a suggestion. Eval: 20/20. | The moment the AI generates content, the thesis collapses. |
| 2 | **Lenses over clusters** | Embed, project with UMAP, show clusters. | Score every idea on named bipolar lenses picked for the problem. | An empty patch of a UMAP plot can't be named; an axis can. The gap becomes a sentence: "you never went radical." |
| 3 | **Caught a flaw in the scoring** | Per-session normalization of each lens. | Measured the raw embeddings, found normalization made every axis look balanced and hid every real gap, switched to absolute scores (`cc36666`). | A blind-spot finder that erases blind spots by construction is worse than nothing. |
| 4 | **Whiteboard first** | A form-and-chart flow: text box, lens review, scatter plot. | Pivoted the whole UI to a sticky-note board with the lens view one flip away (`dac9a98`). | That's where brainstorms actually happen. |
| 5 | **Connections** | Ideas as independent dots. | Threads between related ideas, clusters, islands, and links you draw. | Thinking is relational. |
| 6 | **Async** | One live session that ends when the tab closes. | Accounts, saved boards, invite links, "while you were away" (`cd9ae39`, `8170931`). | Brainstorms don't happen in one sitting. |
| 7 | **Questions, not answers; evidence, not ideas** | A reality check could easily return "here's what others built, try this." | The Glasser reality check only shows how crowded a space is (`4b8df75`). | Every surface follows the one rule. |

## How AI helped (honestly)

We orchestrated coding agents that wrote most of the code in parallel: Claude Code as orchestrator, with Codex and Cursor on their own branches, merged as each slice went green (see `git log`). Humans decided what to build, who it's for, and what it must never do.
