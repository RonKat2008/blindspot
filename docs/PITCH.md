# Blind Spot: pitch

**One line:** AI that widens your thinking without giving you a single idea.
**The one rule:** it asks, it never suggests.
**Deck:** `/pitch` (arrow keys or click). **Team view:** `/insights`.

## 3-minute talk (top 5, 5:15)

| Time | Slide | Beat | Say |
|---|---|---|---|
| 0:00 | 1 Problem | Hook | "Microsoft Research found that when knowledge workers use generative AI, their ideas get narrower. Everyone's AI gives everyone the same answer. AI narrows your ideas." |
| 0:25 | 2 Blind Spot | Thesis + rule | "Blind Spot is AI that widens your thinking without giving you a single idea. One rule: it asks, it never suggests. If it ever hands you an idea, we failed." |
| 0:50 | (switch to live demo) | Map | "Our team is brainstorming onboarding. Here are the lenses: incremental to radical, individual to social. Every idea lands on the map. Notice the empty corner. That is our blind spot." |
| 1:15 | demo | Question | "Blind Spot asks: 'None of your ideas involve other people. What would this look like if it were social?' It does not answer. We do." |
| 1:35 | demo | Reveal (the moment) | "I add one idea in the empty corner. Watch the map and the Range score: 41 to 58. The AI wrote nothing. It showed me where I had not looked. Also: the 'why?' button shows exactly which ideas triggered the question." |
| 2:00 | 3 How | Mechanism | "Lenses, map, provocation. Three steps, and a safety net: a judge model and a blocklist check every question, with a template fallback, so a suggestion cannot reach you." |
| 2:15 | 4 Company | Business | "Wedge: product and design teams, alongside FigJam and Miro. Then education. Moat: longitudinal data on how a team thinks." Open `/insights`: "Across 3 sessions, your team never went radical. The AI wrote 0 of 47 ideas." |
| 2:45 | 5 Close | Land it | "The AI never wrote an idea. It only showed you your own thinking. Thank you." |

Time checks: slide 2 by 0:50, demo done by 2:00, off stage at 3:00. If running long, cut the "why?" aside and the safety-net sentence.

## Expo table, 2-3 minutes (4:30)

Open on the live canvas with the seeded onboarding session already mapped. Hand the visitor the keyboard.

1. **Hook (15s):** "Studies say AI makes your ideas narrower. This does the opposite, and it never gives you an idea."
2. **Show the gap (30s):** Point at the amber empty corner. "These are your team's ideas, placed on lenses. The amber region is where nobody has looked."
3. **Take the question (45s):** Read the provocation aloud. Let them type one idea in response. Watch the dot fly into the corner and Range count up. "You wrote that, not us."
4. **Prove the rule (20s):** Open "Why am I seeing this?" to show the pattern and the ideas behind it. "Every question is explainable, and a judge plus a blocklist keep suggestions out."
5. **Phone (optional, 20s):** Scan the QR so a teammate adds ideas live. The ambient page shifts from teal to amber as range grows.
6. **Moat (30s):** Switch to `/insights`. "After three sessions we can say 'your team never went radical.' That longitudinal view of how a team thinks is the company."
7. **Close (10s):** "The AI wrote 0 of 47 ideas. That is the point."

**If asked:**
- *Why not just prompt ChatGPT for "unusual ideas"?* That still hands over ideas, which anchor and homogenize. We hand over questions.
- *How do you place ideas on a lens?* Embeddings: cosine to each pole, normalized across the session.
- *Who pays?* Product and design teams first (seat-based), universities next.
- *What if the demo breaks?* DEMO_MODE serves a seeded session and canned questions; backup recording on the laptop.
