// Account / collaboration types. Additive to src/lib/contract.ts (which is claimed by
// another agent): every field here is optional on the wire, so old clients keep working.
// The orchestrator can fold these into contract.ts later.
import type { Idea, SessionState } from "@/lib/contract";

export type Member = {
  id: string;
  displayName: string;
  color: string;
  role?: "owner" | "editor";
  /** Only known for the viewer's own membership (RLS hides other members' rows). */
  lastSeenAt?: string | null;
};

/** Idea as returned by GET state / POST ideas when the author was signed in. */
export type AuthoredIdea = Idea & { authorId?: string; authorName?: string; authorColor?: string };

/** GET /api/sessions/[id]/state adds `members` and author fields on ideas. */
export type SessionStateWithMembers = Omit<SessionState, "ideas"> & { ideas: AuthoredIdea[]; members?: Member[] };

export type Me = { id: string; email: string | null; displayName: string; color: string };
/** GET /api/me */
export type MeResponse = { user: Me | null };

export type BoardSummary = {
  id: string;
  prompt: string;
  teamName: string | null;
  role: "owner" | "editor";
  updatedAt: string;
  lastSeenAt: string | null;
  ideaCount: number;
  /** Ideas created after lastSeenAt by someone other than the viewer. */
  newSinceSeen: number;
  /** Normalised board positions (0..1) for the mini-map. */
  dots: { x: number; y: number; color?: string }[];
  members: Member[];
};
/** GET /api/boards (signed-in only) */
export type BoardsResponse = { boards: BoardSummary[] };

/** GET /api/sessions/[id]/away (signed-in only): what changed since the viewer last looked. */
export type AwayResponse = {
  since: string | null;
  ideas: { id: string; authorName: string; authorColor?: string }[];
  provocations: { id: string; text: string }[];
};
/** POST /api/sessions/[id]/seen (signed-in only) */
export type SeenResponse = { ok: true; lastSeenAt: string };
