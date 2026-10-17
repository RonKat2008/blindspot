// Static mock data: 3 past sessions for team "Acme Product".
export type Lens = { id: string; poleA: string; poleB: string; color: string };

export const LENSES: Lens[] = [
  { id: "novelty", poleA: "incremental", poleB: "radical", color: "var(--axis-0)" },
  { id: "scope", poleA: "individual", poleB: "social", color: "var(--axis-1)" },
  { id: "medium", poleA: "digital", poleB: "physical", color: "var(--axis-2)" },
  { id: "horizon", poleA: "short-term", poleB: "long-term", color: "var(--axis-3)" },
  { id: "cost", poleA: "cheap", poleB: "costly", color: "var(--axis-4)" },
];

export type Session = {
  id: string;
  label: string;
  date: string;
  ideas: number;
  /** Ideas leaning to each end, keyed `${lensId}:A|B`. */
  ends: Record<string, number>;
  range: number;
  provocations: { accepted: number; dismissed: number };
};

const ends = (v: number[]): Record<string, number> =>
  Object.fromEntries(
    LENSES.flatMap((l, i) => [
      [`${l.id}:A`, v[i * 2]],
      [`${l.id}:B`, v[i * 2 + 1]],
    ]),
  );

export const SESSIONS: Session[] = [
  {
    id: "s1", label: "Onboarding", date: "Sep 12", ideas: 14,
    ends: ends([11, 0, 10, 1, 9, 2, 8, 2, 7, 1]), range: 34,
    provocations: { accepted: 1, dismissed: 3 },
  },
  {
    id: "s2", label: "Retention", date: "Sep 26", ideas: 15,
    ends: ends([12, 1, 11, 1, 10, 3, 9, 3, 8, 2]), range: 41,
    provocations: { accepted: 2, dismissed: 3 },
  },
  {
    id: "s3", label: "Pricing", date: "Oct 8", ideas: 18,
    ends: ends([13, 1, 10, 2, 9, 5, 7, 5, 9, 3]), range: 58,
    provocations: { accepted: 4, dismissed: 1 },
  },
];

export const TOTAL_IDEAS = SESSIONS.reduce((n, s) => n + s.ideas, 0); // 47
export const TEAM = "Acme Product";
