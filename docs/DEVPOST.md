# Devpost submission: Blind Spot

**Tagline:** A collaborative whiteboard where AI widens your team's thinking without ever giving you an idea.

**Links**
- Live app: https://blindspot-sable.vercel.app
- Guided demo (works offline): https://blindspot-sable.vercel.app/demo
- How we built it, and what we decided: https://blindspot-sable.vercel.app/why
- Code: https://github.com/RonKat2008/blindspot

---

## Inspiration

<!-- FOUNDER_STORY -->
[Your story: when you noticed AI narrowing your team's ideas]

Then we found the research. Microsoft Research reports that generative AI narrows the range of ideas knowledge workers produce ([source](https://www.microsoft.com/en-us/research/articles/rethinking-ai-in-knowledge-work-from-assistant-to-tool-for-thought/)). When everyone asks the same model, everyone gets the same answer. We wanted the opposite: AI that shows a team where it hasn't looked and leaves the ideas to the people.

## What it does

Blind Spot is a collaborative whiteboard for brainstorming.

- **Sticky notes, as usual.** Your team adds ideas to a shared board, from laptops or from phones that join with a QR code and can snap photos of paper sticky notes.
- **Lenses.** The AI picks named bipolar axes for your problem (for example *incremental ↔ radical*, *individual ↔ social*) and places every idea on them.
- **Threads.** It draws threads between related ideas and shows clusters and islands. You can draw your own links too.
- **Lens view.** Flip the board and the ideas rearrange onto two lenses. The empty corner is your blind spot, and it has a name: "you never went radical."
- **Question notes, never ideas.** The AI pins a question on the board about the gap. It never suggests an idea. A regex blocklist plus an LLM judge check every question, with a template fallback, so a suggestion can't reach the board (eval: 20/20).
- **Converge.** Shortlist ideas and surface the assumptions under them as assumption cards.
- **Reality check (Glasser).** Shows how crowded a space already is. Evidence, not ideas.
- **Async teams.** Accounts, saved boards, invite links, and a "while you were away" digest. Replay how a board grew, and watch an ambient room light shift from teal to amber as the team's range grows.

## How we built it

- **App:** Next.js 16 (App Router), TypeScript, Tailwind v4, motion for animation.
- **AI:** Vercel AI Gateway. Claude Sonnet writes the lenses and questions, Claude Haiku is the suggestion judge, OpenAI embeddings place ideas on the lenses.
- **Data:** Supabase Postgres with pgvector and Supabase Auth, row-level security on every table.
- **Gap detection:** pure TypeScript over in-memory vectors, so it runs the same live and in the offline demo.
- **Reliability:** `DEMO_MODE` serves a seeded session with cached embeddings and canned questions; Playwright smoke tests cover the demo path.
- **Process:** a multi-agent build. Claude Code orchestrated Codex and Cursor, each working its own branch in parallel and merging as slices went green.

## What AI couldn't do alone

AI wrote most of our code. It couldn't decide what the product is for, who it helps, or what it must never do. The calls that shaped Blind Spot were ours (full log at `/why`):

1. **The one rule.** Models are trained to be helpful, so every early draft slipped into "you could try…". We built a separate checker that rejects any suggestion, because the moment the AI generates content, the thesis collapses.
2. **Lenses over clusters.** The default was a UMAP plot. An empty patch of a UMAP plot can't be named; an axis can. So gaps get names.
3. **We caught a flaw in the AI-proposed scoring.** Per-session normalization would have made every axis look balanced and hidden every real gap. We measured the raw embeddings and switched to absolute scores.
4. **Whiteboard first.** We pivoted the whole UI to a sticky-note board because that's where brainstorms actually happen.
5. **Connections.** Threads, clusters, islands, links you draw, because thinking is relational.
6. **Async.** Accounts and invites because brainstorms don't happen in one sitting.
7. **Questions, not answers; evidence, not ideas.** Even the reality check only shows how crowded a space is.

The product's own rule mirrors how we built it: the AI does the work, people make the calls.

## Challenges we ran into

- **The scoring flaw.** The first scoring normalized each lens within the session. It looked clean, but it stretched any set of ideas across the full range, so every lens looked balanced and real gaps disappeared. We caught it by measuring the raw embedding scores against the seeded session and switched to absolute scoring.
- **Keeping the AI from suggesting.** Language models want to help, and "What if you tried a peer-mentor program?" is a question that's really an idea. One prompt wasn't enough, so we layered a regex blocklist, an LLM judge, and deterministic template questions built from the team's own words.

## Accomplishments that we're proud of

- An AI feature whose success metric is that it wrote zero ideas.
- Gaps you can read aloud: "None of your ideas involve other people."
- A full product, not a single screen: shared boards, accounts, invites, phone join, replay, converge, reality check, and an offline guided demo.
- 20/20 on our suggestion-guard eval.

## What we learned

- The hardest part of building with AI was knowing when to overrule it. The scoring bug looked correct and passed every check except the one that mattered: does it find real gaps?
- A constraint ("never write an idea") made the product clearer, not weaker.
- Fast parallel agents make judgment the bottleneck, so we had to make it explicit.

## What's next

- **Purpose-built room hardware:** an always-on display and light for team rooms that shows a brainstorm's range at a glance.
- **Longitudinal team insights:** across many sessions, show a team how it tends to think ("your team never goes radical").
- **Education:** classrooms and design courses, where widening students' thinking matters more than handing them answers.

## Built with

`next.js` `react` `typescript` `tailwindcss` `motion` `vercel` `vercel-ai-gateway` `claude` `anthropic` `openai-embeddings` `supabase` `postgresql` `pgvector` `supabase-auth` `playwright` `claude-code` `codex` `cursor` `glasser`

---

## Email to ariachen@berkeley.edu

**Subject:** Blind Spot: submission for Code Something AI Cannot Do Alone

Hi Aria,

Here is our submission for Code Something AI Cannot Do Alone.

**Blind Spot** is a collaborative whiteboard where AI widens a team's thinking without ever giving them an idea. It maps sticky notes onto named lenses, shows the empty corner, and asks a question about it. A guard checks every question so a suggestion never reaches the board.

- Live app: https://blindspot-sable.vercel.app
- Guided demo: https://blindspot-sable.vercel.app/demo
- What we decided, and what AI couldn't: https://blindspot-sable.vercel.app/why
- Code: https://github.com/RonKat2008/blindspot
- Devpost: [Devpost link]

Team: [names]

Thank you,
[Name]
