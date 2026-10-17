/** Pure aggregation for GET /api/me/insights. An end is covered with >= 2 ideas beyond |0.3|. */

export const END_THRESHOLD = 0.3;
export const COVERED_MIN = 2;
const AXIS_COLORS = ["var(--axis-0)", "var(--axis-1)", "var(--axis-2)", "var(--axis-3)", "var(--axis-4)"];

export type InsightLens = { id: string; poleA: string; poleB: string; color: string };
export type InsightBoard = {
  id: string;
  label: string;
  date: string;
  ideas: number;
  yours: number;
  others: number;
  ends: Record<string, number>;
  /** 0–100 share of lens ends with enough ideas, or null when axes/scores are missing. */
  range: number | null;
  provocations: { shown: number; accepted: number; dismissed: number };
};
export type InsightsPayload = {
  signedIn: true;
  example: boolean;
  teamName: string;
  boards: InsightBoard[];
  lenses: InsightLens[];
  headline: string;
  detail: string;
  humanIdeas: number;
  aiIdeas: 0;
  asked: number;
  taken: number;
};

type AxisRow = { id: string; session_id: string; pole_a: string; pole_b: string; position: number };
type IdeaRow = { session_id: string; author_id: string | null; axis_scores: unknown };
type ProvRow = { session_id: string; status: string };
type SessionRow = { id: string; prompt: string; team_name: string | null; created_at: string; updated_at: string | null };

function scores(value: unknown): Record<string, number> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (typeof v === "number" && Number.isFinite(v)) out[k] = v;
  }
  return out;
}

function shortLabel(prompt: string): string {
  const words = prompt.trim().split(/\s+/).slice(0, 3).join(" ");
  return words.length > 22 ? `${words.slice(0, 20)}…` : words || "Board";
}

function shortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

export function buildInsights(input: {
  userId: string;
  displayName: string;
  sessions: SessionRow[];
  axes: AxisRow[];
  ideas: IdeaRow[];
  provocations: ProvRow[];
}): InsightsPayload {
  const lensesById = new Map<string, InsightLens>();
  const axesBySession = new Map<string, AxisRow[]>();
  for (const axis of [...input.axes].sort((a, b) => a.position - b.position)) {
    const list = axesBySession.get(axis.session_id) ?? [];
    list.push(axis);
    axesBySession.set(axis.session_id, list);
    if (!lensesById.has(axis.id)) {
      lensesById.set(axis.id, {
        id: axis.id,
        poleA: axis.pole_a,
        poleB: axis.pole_b,
        color: AXIS_COLORS[lensesById.size % AXIS_COLORS.length],
      });
    }
  }

  const boards: InsightBoard[] = input.sessions.map((session) => {
    const axes = axesBySession.get(session.id) ?? [];
    const ideas = input.ideas.filter((i) => i.session_id === session.id);
    const provs = input.provocations.filter((p) => p.session_id === session.id);
    const ends: Record<string, number> = {};
    let scored = 0;
    for (const axis of axes) {
      ends[`${axis.id}:A`] = 0;
      ends[`${axis.id}:B`] = 0;
    }
    let yours = 0;
    for (const idea of ideas) {
      if (idea.author_id === input.userId) yours += 1;
      const map = scores(idea.axis_scores);
      if (Object.keys(map).length) scored += 1;
      for (const axis of axes) {
        const score = map[axis.id];
        if (typeof score !== "number") continue;
        if (score <= -END_THRESHOLD) ends[`${axis.id}:A`] += 1;
        else if (score >= END_THRESHOLD) ends[`${axis.id}:B`] += 1;
      }
    }
    let covered = 0;
    for (const axis of axes) {
      if ((ends[`${axis.id}:A`] ?? 0) >= COVERED_MIN) covered += 1;
      if ((ends[`${axis.id}:B`] ?? 0) >= COVERED_MIN) covered += 1;
    }
    const range = axes.length > 0 && scored > 0 ? Math.round((100 * covered) / (2 * axes.length)) : null;
    const accepted = provs.filter((p) => p.status === "accepted").length;
    const dismissed = provs.filter((p) => p.status === "dismissed").length;
    const when = session.updated_at ?? session.created_at;
    return {
      id: session.id,
      label: shortLabel(session.prompt),
      date: shortDate(when),
      ideas: ideas.length,
      yours,
      others: ideas.length - yours,
      ends,
      range,
      provocations: { shown: provs.length, accepted, dismissed },
    };
  });

  const lenses = [...lensesById.values()];
  const humanIdeas = boards.reduce((n, b) => n + b.ideas, 0);
  const asked = boards.reduce((n, b) => n + b.provocations.shown, 0);
  const taken = boards.reduce((n, b) => n + b.provocations.accepted, 0);

  const missed: { pole: string; opposite: number }[] = [];
  for (const lens of lenses) {
    const a = boards.reduce((n, b) => n + (b.ends[`${lens.id}:A`] ?? 0), 0);
    const b = boards.reduce((n, b) => n + (b.ends[`${lens.id}:B`] ?? 0), 0);
    if (a < COVERED_MIN) missed.push({ pole: lens.poleA.toLowerCase(), opposite: b });
    if (b < COVERED_MIN) missed.push({ pole: lens.poleB.toLowerCase(), opposite: a });
  }
  missed.sort((x, y) => y.opposite - x.opposite);
  const gap = missed[0];
  const who = input.displayName || "Your team";
  const n = boards.length;
  const headline = gap
    ? `never went ${gap.pole}.`
    : n < 3
      ? "is just getting started."
      : "reached every lens end.";

  const ranged = boards.filter((b) => b.range != null);
  const trend =
    ranged.length >= 2
      ? ` Range moved from ${ranged[0].range} to ${ranged[ranged.length - 1].range}.`
      : "";
  const yours = boards.reduce((s, b) => s + b.yours, 0);
  const share = humanIdeas ? Math.round((100 * yours) / humanIdeas) : 0;
  const detail = gap
    ? `${who} wrote ${share}% of ${humanIdeas} ideas. The “${gap.pole}” end stayed thin across ${n} board${n === 1 ? "" : "s"}.${trend}`
    : `${who} wrote ${share}% of ${humanIdeas} ideas across ${n} board${n === 1 ? "" : "s"}.${trend}`;

  const teamName = input.sessions.find((s) => s.team_name)?.team_name ?? who;

  return {
    signedIn: true,
    example: false,
    teamName,
    boards,
    lenses,
    headline,
    detail,
    humanIdeas,
    aiIdeas: 0,
    asked,
    taken,
  };
}
