import type { BoardSummary, Member } from "./account-types";
import { pickColor, type CurrentUser } from "@/lib/auth";
import { check, db } from "@/lib/db";
import { loadProfiles } from "./members";

type MembershipRow = { session_id: string; role: "owner" | "editor"; last_seen_at: string | null };
type SessionRow = { id: string; prompt: string; team_name: string | null; owner_id: string | null; created_at: string; updated_at: string | null };
type IdeaRow = { session_id: string; author_id: string | null; speaker: string | null; board_x: number | null; board_y: number | null; color: string | null; created_at: string };

const MAX_DOTS = 60;
const MAX_IDEAS = 5000;

function hash01(seed: string, salt: number): number {
  let h = salt;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return (h % 1000) / 1000;
}

/** Normalises board coordinates into 0..1 per board; ideas without a position get a stable scatter. */
function miniMap(ideas: IdeaRow[]): BoardSummary["dots"] {
  const placed = ideas.filter(i => typeof i.board_x === "number" && typeof i.board_y === "number");
  const xs = placed.map(i => i.board_x as number), ys = placed.map(i => i.board_y as number);
  const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const norm = (v: number, lo: number, hi: number) => (hi - lo < 1e-6 ? 0.5 : 0.08 + 0.84 * ((v - lo) / (hi - lo)));
  return ideas.slice(-MAX_DOTS).map((idea, i) => {
    const hasPos = typeof idea.board_x === "number" && typeof idea.board_y === "number";
    const seed = `${idea.created_at}${i}`;
    return {
      x: hasPos ? norm(idea.board_x as number, minX, maxX) : 0.1 + 0.8 * hash01(seed, 7),
      y: hasPos ? norm(idea.board_y as number, minY, maxY) : 0.1 + 0.8 * hash01(seed, 13),
      ...(idea.color ? { color: idea.color } : {}),
    };
  });
}

/** Boards the user owns or has joined, most recently active first. */
export async function listBoards(user: CurrentUser): Promise<BoardSummary[]> {
  const client = db();
  const [memberships, owned] = await Promise.all([
    user.client.from("board_members").select("session_id, role, last_seen_at").eq("user_id", user.id),
    client.from("sessions").select("id").eq("owner_id", user.id),
  ]);
  check(memberships.error);
  check(owned.error);
  const mine = new Map<string, MembershipRow>(((memberships.data ?? []) as MembershipRow[]).map(m => [m.session_id, m]));
  for (const row of owned.data ?? []) {
    const id = String(row.id);
    if (!mine.has(id)) mine.set(id, { session_id: id, role: "owner", last_seen_at: null });
  }
  const ids = [...mine.keys()];
  if (ids.length === 0) return [];

  const [sessions, ideas] = await Promise.all([
    client.from("sessions").select("id, prompt, team_name, owner_id, created_at, updated_at").in("id", ids),
    client.from("ideas").select("session_id, author_id, speaker, board_x, board_y, color, created_at").in("session_id", ids).is("deleted_at", null).order("created_at").limit(MAX_IDEAS),
  ]);
  check(sessions.error);
  check(ideas.error);
  const ideaRows = (ideas.data ?? []) as IdeaRow[];
  const sessionRows = (sessions.data ?? []) as SessionRow[];
  const people = sessionRows.flatMap(s => (s.owner_id ? [s.owner_id] : [])).concat(ideaRows.flatMap(i => (i.author_id ? [i.author_id] : [])));
  const profiles = await loadProfiles(user, people);

  const boards = sessionRows.map((session): BoardSummary => {
    const membership = mine.get(session.id)!;
    const boardIdeas = ideaRows.filter(i => i.session_id === session.id);
    const memberIds = [...new Set([session.owner_id, ...boardIdeas.map(i => i.author_id), user.id].filter((v): v is string => Boolean(v)))];
    const members: Member[] = memberIds.map(id => {
      const p = id === user.id ? { display_name: user.displayName, color: user.color } : profiles.get(id);
      const spoken = boardIdeas.find(i => i.author_id === id && i.speaker)?.speaker;
      return { id, displayName: p?.display_name ?? spoken ?? "Someone", color: p?.color ?? pickColor(id), role: id === session.owner_id ? "owner" : "editor" };
    });
    const seen = membership.last_seen_at;
    const newSinceSeen = seen ? boardIdeas.filter(i => Date.parse(i.created_at) > Date.parse(seen) && i.author_id !== user.id).length : 0;
    const last = boardIdeas.at(-1)?.created_at;
    const updatedAt = [session.updated_at, last, session.created_at].filter((v): v is string => Boolean(v)).sort((a, b) => Date.parse(a) - Date.parse(b)).at(-1)!;
    return {
      id: session.id,
      prompt: session.prompt,
      teamName: session.team_name,
      role: session.owner_id === user.id ? "owner" : membership.role,
      updatedAt,
      lastSeenAt: seen,
      ideaCount: boardIdeas.length,
      newSinceSeen,
      dots: miniMap(boardIdeas),
      members,
    };
  });
  return boards.sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
}
