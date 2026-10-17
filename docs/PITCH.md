# Blind Spot: pitch

**One line:** A whiteboard where AI widens your team's thinking without giving you a single idea.
**The one rule:** it asks, it never suggests.
**Every pitch answers three things:** what it does, why we built it, what we brought that AI couldn't.
**Tabs to have open:** live board (seeded onboarding session), `/demo` (offline backup), `/why` (judgment log), `/pitch` (deck).

## 3-minute talk (top 8, 5:15)

| Time | Beat | Show | Say |
|---|---|---|---|
| 0:00 | **Why we built it** (founder story) | `/pitch` slide 1 | <!-- FOUNDER_STORY --> "[Your story: when you noticed AI narrowing your team's ideas]" |
| 0:25 | The problem is real | slide 1 | "Then we found Microsoft Research: generative AI narrows the range of ideas knowledge workers produce. Everyone asks the same model, everyone gets the same answer." |
| 0:40 | **What it does** (thesis) | slide 2 | "Blind Spot is a whiteboard where AI widens your thinking without giving you a single idea. One rule: it asks, it never suggests." |
| 0:55 | Demo: the board | live board | "This is our team brainstorming onboarding. Sticky notes, as usual. Blind Spot draws threads between related ideas." |
| 1:10 | Demo: Lens view | flip to Lens view | "Flip to Lens view. Every idea lands on named lenses: incremental to radical, individual to social. That empty corner is our blind spot, and it has a name: we never went radical." |
| 1:30 | Demo: the question | question note | "Blind Spot pins a question, not an idea. It doesn't answer it. We do." Add one sticky in the corner; Range climbs. "The AI wrote nothing. It showed us where we hadn't looked." |
| 1:50 | **What we brought** | `/why` | "AI wrote most of our code today. Here's what it couldn't do." Scroll the timeline. |
| 2:00 | Call 1: the rule | `/why` #1 | "Models want to help, so every draft slipped into 'you could try…'. We built a separate checker that rejects any suggestion. 20 out of 20 on our eval. The moment it writes an idea, the thesis collapses." |
| 2:15 | Call 2: the flaw | `/why` #3 | "The AI's scoring normalized every session. It looked right, and it made every lens look balanced. It hid every real gap. We measured the raw embeddings and switched to absolute scores." |
| 2:30 | Calls 3-4: the shape | `/why` #2, #4 | "We chose named lenses over clusters, because you can't name an empty patch on a plot. And we rebuilt the whole thing as a whiteboard, because that's where brainstorms actually happen." |
| 2:45 | Close | slide 5 | "AI built the product. We decided what it's for, who it helps, and what it must never do. Blind Spot never writes an idea. It shows you your own thinking. Thank you." |

Time checks: demo starts by 0:55, `/why` on screen by 1:50, off stage at 3:00.
If running long: cut calls 3-4 (2:30 beat). Never cut the founder story, the question moment, or the scoring flaw.
If the live board fails: switch to `/demo` (offline, seeded) and keep talking; the beats are identical.

## Expo table, 2-3 minutes (4:30)

Open on the live board, seeded onboarding session, already in board view. Hand the visitor the keyboard.

| Time | Beat | Do | Say |
|---|---|---|---|
| 0:00 | **Why** | eye contact, no screen | <!-- FOUNDER_STORY --> "[Your story: when you noticed AI narrowing your team's ideas]" "Turns out Microsoft Research found the same thing: AI narrows people's ideas." |
| 0:20 | **What it does** | point at the board | "So we built a whiteboard where the AI never gives you an idea. It shows you where you haven't looked." |
| 0:35 | The gap | flip to Lens view | "Your team's ideas, on named lenses. The amber corner is where nobody has looked." |
| 1:00 | Their turn | read the question note aloud | "It asks. You answer." Visitor types one sticky; it lands in the corner and Range climbs. "You wrote that, not us." |
| 1:30 | Phone (optional) | show the QR | "Scan it. Your phone joins the board, and you can snap a paper sticky note." |
| 1:50 | **What we brought** | open `/why` | "AI wrote most of the code. These are the calls it couldn't make." Point at #1 (the rule) and #3 (the scoring flaw we caught). |
| 2:30 | Close | back to the board | "The AI wrote zero ideas. That's the point." |

## If asked

- **Why not just prompt ChatGPT for "unusual ideas"?** That still hands over ideas, and ideas anchor and homogenize. We hand over questions about your own ideas.
- **How do you place ideas on a lens?** Embeddings: each idea's cosine similarity to each pole, scored on an absolute scale. We tried per-session normalization first and caught that it hid every real gap.
- **How do you stop it suggesting?** Three layers: the prompt, a regex blocklist, and a Haiku judge. If any check fails, a template question built from your own ideas and lens names replaces it. Eval: 20/20.
- **What did AI do, honestly?** Claude Code orchestrated Codex and Cursor; they wrote most of the code in parallel. We decided what to build, who it's for, and what it must never do. The whole log is at `/why`.
- **What does the reality check do?** It asks Glasser how crowded a space already is. Evidence, not ideas.
- **Who is it for, and what's next?** Product and design teams first, then education. Next: purpose-built room hardware and longitudinal insights into how a team thinks.
- **What if the demo breaks?** `DEMO_MODE` and `/demo` serve a seeded session and canned questions offline.
