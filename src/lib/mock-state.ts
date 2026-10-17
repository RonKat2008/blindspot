// Hard-coded SessionState so the frontend can build before the backend exists.
// Ideas skew incremental (a1 < 0) + individual (a2 < 0): the radical + social quadrant is empty.
import type { AddIdeasResponse, Axis, Idea, Provocation, SessionState } from "./contract";

export const MOCK_SESSION_ID = "00000000-0000-4000-8000-000000000001";

const t = (min: number): string => new Date(Date.UTC(2026, 9, 17, 21, min)).toISOString();

export const MOCK_AXES: Axis[] = [
  { id: "ax-1", poleA: "incremental", poleB: "radical", userEdited: false, position: 0 },
  { id: "ax-2", poleA: "individual", poleB: "social", userEdited: false, position: 1 },
  { id: "ax-3", poleA: "digital", poleB: "physical", userEdited: false, position: 2 },
  { id: "ax-4", poleA: "short-term", poleB: "long-term", userEdited: false, position: 3 },
  { id: "ax-5", poleA: "guided", poleB: "self-serve", userEdited: false, position: 4 },
];

type Row = [string, string, number, number, number, number, number, string?];
const rows: Row[] = [
  ["i-1", "Shorter signup form, only email and password", -0.82, -0.7, -0.6, -0.5, 0.4, "Maya"],
  ["i-2", "Progress bar during the setup wizard", -0.75, -0.55, -0.7, -0.4, -0.3, "Leo"],
  ["i-3", "Tooltips on every button the first time you see it", -0.68, -0.8, -0.75, -0.35, -0.6],
  ["i-4", "Welcome email with three quick tips", -0.6, -0.45, -0.5, -0.6, -0.2, "Maya"],
  ["i-5", "Interactive product tour on first login", -0.4, -0.65, -0.8, -0.2, -0.75],
  ["i-6", "Checklist of setup tasks with checkmarks", -0.7, -0.6, -0.55, -0.3, 0.1, "Priya"],
  ["i-7", "Default templates so the first screen is not empty", -0.55, -0.35, -0.65, 0.1, 0.5],
  ["i-8", "Short video explaining the core feature", -0.3, -0.5, -0.4, -0.1, 0.2, "Leo"],
  ["i-9", "Let people skip onboarding entirely", 0.25, -0.75, -0.2, -0.45, 0.85, "Priya"],
];

export const MOCK_IDEAS: Idea[] = rows.map(([id, text, a1, a2, a3, a4, a5, speaker], i) => ({
  id,
  text,
  source: "typed",
  speaker,
  axisScores: { "ax-1": a1, "ax-2": a2, "ax-3": a3, "ax-4": a4, "ax-5": a5 },
  pca: { x: a1 * 0.8 + a3 * 0.2, y: a2 * 0.7 + a5 * 0.3 },
  createdAt: t(i * 2),
}));

export const MOCK_PROVOCATIONS: Provocation[] = [
  {
    id: "p-1",
    type: "fixation",
    text: "Your last 5 ideas all add guidance on top of the existing screens. What assumption do they share about why people get stuck?",
    why: {
      pattern: "fixation",
      ideaIds: ["i-2", "i-3", "i-4", "i-5", "i-6"],
      explanation: "The last 5 ideas are very similar to each other.",
    },
    status: "dismissed",
    createdAt: t(13),
  },
  {
    id: "p-2",
    type: "gap",
    text: "Every idea so far treats a new user as someone alone at a screen. What changes if onboarding is something that happens between people?",
    why: {
      pattern: "gap",
      ideaIds: ["i-1", "i-2", "i-3", "i-4", "i-5", "i-6", "i-8", "i-9"],
      axisId: "ax-2",
      explanation: "8 of 9 ideas sit on the individual side of individual ↔ social; the social end is empty.",
    },
    status: "shown",
    createdAt: t(18),
  },
];

export const MOCK_STATE: SessionState = {
  session: {
    id: MOCK_SESSION_ID,
    prompt: "How might we improve onboarding for new users?",
    teamName: "Demo team",
    createdAt: t(0),
  },
  axes: MOCK_AXES,
  ideas: MOCK_IDEAS,
  provocations: MOCK_PROVOCATIONS,
  diversity: 41,
  diversityBreakdown: { spread: 0.45, coverage: 0.35 },
};

/** Mock add: a new idea lands in the empty radical + social quadrant and diversity jumps. */
export function mockAddIdeas(texts: string[], state: SessionState = MOCK_STATE): AddIdeasResponse {
  const now = new Date().toISOString();
  const ideas: Idea[] = texts.map((text, i) => {
    const jitter = ((text.length * 37 + i * 11) % 20) / 100;
    return {
      id: `i-mock-${Date.now()}-${i}`,
      text,
      source: "typed",
      axisScores: { "ax-1": 0.6 + jitter, "ax-2": 0.7 - jitter, "ax-3": 0.5, "ax-4": 0.4, "ax-5": -0.2 },
      pca: { x: 0.6 + jitter, y: 0.7 - jitter },
      createdAt: now,
    };
  });
  const diversity = Math.min(100, state.diversity + 17 * texts.length);
  return {
    ideas,
    allIdeas: [...state.ideas, ...ideas],
    diversity,
    diversityBreakdown: { spread: 0.6, coverage: 0.5 },
  };
}
