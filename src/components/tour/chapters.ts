// Chapter script for /tour. Copy lives here so the shell and illustrations stay presentational.

/** Seeded onboarding session (mirrors DEMO_SESSION_ID in src/lib/demo.ts; kept literal so the
 *  tour bundle doesn't pull in the demo dataset). */
const DEMO_ID = "00000000-0000-4000-8000-0000000000d3";

export const MSR_ARTICLE =
  "https://www.microsoft.com/en-us/research/articles/rethinking-ai-in-knowledge-work-from-assistant-to-tool-for-thought/";

export type IllustrationKey =
  | "problem"
  | "whiteboard"
  | "lenses"
  | "lensView"
  | "question"
  | "guard"
  | "connections"
  | "range"
  | "converge"
  | "phones"
  | "ambient"
  | "reality"
  | "async"
  | "replay"
  | "team"
  | "humans";

export type Chapter = {
  key: IllustrationKey;
  /** Short label for the rail. */
  label: string;
  title: string;
  what: string;
  why: string;
  /** Tools-for-Thought principle this chapter leans on. */
  principle: string;
  tryHref: string;
  tryLabel: string;
  /** Optional citation shown under the copy. */
  source?: { href: string; label: string };
};

export const CHAPTERS: readonly Chapter[] = [
  {
    key: "problem",
    label: "The problem",
    title: "AI makes everyone's ideas look the same.",
    what: "When a whole room asks the same assistant for ideas, the answers drift toward one safe middle.",
    why: "Microsoft Research argues AI should be a tool for thought that sharpens your thinking, not an assistant that does it for you.",
    principle: "Productive resistance",
    tryHref: MSR_ARTICLE,
    tryLabel: "Read the research",
    source: { href: MSR_ARTICLE, label: "Microsoft Research — From assistant to tool for thought" },
  },
  {
    key: "whiteboard",
    label: "The whiteboard",
    title: "A whiteboard where only humans write.",
    what: "Type an idea, press Enter, and it lands as a sticky note you can drag anywhere.",
    why: "Your hands stay on the material: every note on the board is one a person actually wrote.",
    principle: "Preserve material engagement",
    tryHref: "/new",
    tryLabel: "Open a whiteboard",
  },
  {
    key: "lenses",
    label: "Lenses for your problem",
    title: "Lenses picked for your problem.",
    what: "Blind Spot reads your prompt and proposes a few spectrums, like cheap ↔ costly, that you can rename or remove.",
    why: "Lenses are frames, not answers, so you see the shape of the problem before anyone suggests a solution.",
    principle: "Scaffold metacognition",
    tryHref: "/new",
    tryLabel: "Pick your lenses",
  },
  {
    key: "lensView",
    label: "Lens view",
    title: "Flip the board. Find the empty corner.",
    what: "Lens view rearranges every sticky onto two lenses, and the corner nobody touched lights up amber.",
    why: "Seeing where you haven't looked is the start of thinking differently; no idea is handed to you.",
    principle: "Scaffold metacognition",
    tryHref: `/s/${DEMO_ID}`,
    tryLabel: "Open the seeded board",
  },
  {
    key: "question",
    label: "Questions, never ideas",
    title: "Question notes. Never idea notes.",
    what: "Every few ideas, the AI pins a single question about what's missing, with a “why am I seeing this?” you can open.",
    why: "A question makes you do the thinking, and the disclosure shows exactly which notes and lens triggered it.",
    principle: "Legible system logic",
    tryHref: `/s/${DEMO_ID}`,
    tryLabel: "See a question note",
  },
  {
    key: "guard",
    label: "The one rule, enforced",
    title: "The one rule, enforced in code.",
    what: "Every question passes model → blocklist → judge → template; anything that smells like an idea is replaced.",
    why: "A promise to never hand you ideas only counts if it holds every time: 40/40 safe in our eval.",
    principle: "Productive resistance",
    tryHref: "/demo",
    tryLabel: "Watch it in the demo",
  },
  {
    key: "connections",
    label: "Connections",
    title: "Threads, clusters, islands, and links you draw.",
    what: "Related notes get soft threads, groups get a cluster outline, loners get flagged, and you can draw your own links.",
    why: "The board shows its structure, so the team argues about the shape of the thinking rather than the loudest note.",
    principle: "Legible system logic",
    tryHref: `/s/${DEMO_ID}`,
    tryLabel: "Explore connections",
  },
  {
    key: "range",
    label: "Range",
    title: "Range: a calm meter, not a grade.",
    what: "One number for how much ground your ideas cover across the lenses; it climbs when you reach new territory.",
    why: "It reflects your spread back to you without judging any single idea as good or bad.",
    principle: "Scaffold metacognition",
    tryHref: `/s/${DEMO_ID}`,
    tryLabel: "Watch Range move",
  },
  {
    key: "converge",
    label: "Assumptions & converge",
    title: "Assumption cards, then converge.",
    what: "Assumption cards name what the room is taking for granted; converge mode checks whether your shortlist still covers your lenses.",
    why: "Narrowing down is where groupthink sneaks back in, so the check happens right when you pick.",
    principle: "Productive resistance",
    tryHref: `/s/${DEMO_ID}`,
    tryLabel: "Try converge mode",
  },
  {
    key: "phones",
    label: "Phones in the room",
    title: "Phones in the room.",
    what: "Scan the QR to add ideas from your phone, or snap a photo of real sticky notes; you confirm how they split.",
    why: "Paper and people stay first-class, and the machine never decides what you meant.",
    principle: "Human-on-the-loop",
    tryHref: `/join/${DEMO_ID}`,
    tryLabel: "Join from a phone",
  },
  {
    key: "ambient",
    label: "Ambient room light",
    title: "A room light that feels the range.",
    what: "Put the ambient view on a big screen: its glow warms when ideas spread out and cools when they bunch up.",
    why: "The room senses its own thinking at a glance, without anyone stopping to read a chart.",
    principle: "Scaffold metacognition",
    tryHref: `/ambient/${DEMO_ID}`,
    tryLabel: "Open ambient view",
  },
  {
    key: "reality",
    label: "Reality check",
    title: "Reality check with Glasser.",
    what: "Ask for a reality check on a note and get evidence: what's been tried, what's known, with sources.",
    why: "Grounding ideas in evidence beats an AI cheerleader, and it still leaves the next idea to you.",
    principle: "Diversity of perspective",
    tryHref: `/s/${DEMO_ID}`,
    tryLabel: "Run a reality check",
  },
  {
    key: "async",
    label: "Async teams",
    title: "Async teams pick up where they left off.",
    what: "Sign in, invite teammates to a board, and come back to a “while you were away” recap of what changed.",
    why: "Different people thinking at different times brings in perspectives a single meeting misses.",
    principle: "Diversity of perspective",
    tryHref: "/boards",
    tryLabel: "See your boards",
  },
  {
    key: "replay",
    label: "Replay & recap",
    title: "Replay the session. Share the recap.",
    what: "Scrub through how the board grew, then share a recap of ideas, questions, and Range.",
    why: "Looking back at how you got there is how teams learn to think better next time.",
    principle: "Scaffold metacognition",
    tryHref: `/s/${DEMO_ID}`,
    tryLabel: "Replay a session",
  },
  {
    key: "team",
    label: "Team view",
    title: "See your team's range across sessions.",
    what: "Insights lines up every session so you can see which lenses your team keeps skipping.",
    why: "Blind spots repeat; spotting the pattern is the first step to breaking it.",
    principle: "Scaffold metacognition",
    tryHref: "/insights",
    tryLabel: "Open team insights",
  },
  {
    key: "humans",
    label: "Decided by humans",
    title: "Built with AI. Decided by humans.",
    what: "The AI maps, connects, and asks; people write every idea and make every call.",
    why: "That split is the product: AI widens the room's thinking while the room keeps authorship.",
    principle: "Human-on-the-loop",
    tryHref: "/why",
    tryLabel: "Why we built it this way",
  },
];

/** Seconds per chapter in autoplay (16 chapters + end card ≈ 2 minutes). */
export const AUTOPLAY_SECONDS = 7;
