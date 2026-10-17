import type { Idea } from "@/lib/contract";
import type { AuthoredIdea, Member } from "./account-types";
import { pickColor, type CurrentUser } from "@/lib/auth";
import { check, type Database } from "@/lib/db";

type Role = "owner" | "editor";
type Profile = { id: string; display_name: string; color: string };

/** Add the user to a board if they are not already on it. Never downgrades an owner. */
export async function ensureMembership(user: CurrentUser, sessionId: string, role: Role = "editor") {
  const result = await user.client
    .from("board_members")
    .upsert({ session_id: sessionId, user_id: user.id, role }, { onConflict: "session_id,user_id", ignoreDuplicates: true });
  if (result.error) console.error("Membership upsert failed:", result.error.message);
}

/** Reads the viewer's own membership row (RLS only exposes your own rows). */
export async function ownMembership(user: CurrentUser, sessionId: string) {
  const result = await user.client
    .from("board_members")
    .select("role, last_seen_at, joined_at")
    .eq("session_id", sessionId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (result.error) console.error("Membership read failed:", result.error.message);
  return result.data as { role: Role; last_seen_at: string | null; joined_at: string } | null;
}

/** Marks the board as seen now (joining it as editor if needed). Returns the new timestamp. */
export async function markSeen(user: CurrentUser, sessionId: string): Promise<string> {
  const now = new Date().toISOString();
  await ensureMembership(user, sessionId, "editor");
  const result = await user.client
    .from("board_members")
    .update({ last_seen_at: now })
    .eq("session_id", sessionId)
    .eq("user_id", user.id);
  check(result.error);
  return now;
}

/** Profiles are readable by signed-in users only; guests get an empty map. */
export async function loadProfiles(viewer: CurrentUser | null, ids: string[]): Promise<Map<string, Profile>> {
  const unique = [...new Set(ids)];
  if (!viewer || unique.length === 0) return new Map();
  const result = await viewer.client.from("profiles").select("id, display_name, color").in("id", unique);
  if (result.error) {
    console.error("Profile read failed:", result.error.message);
    return new Map();
  }
  return new Map((result.data as Profile[]).map(p => [p.id, p]));
}

type AuthorRow = { id: string; author_id: string | null; speaker: string | null; created_at: string };

/**
 * People on a board, derived from data every viewer can read: the owner, every signed-in
 * author, and the viewer. (board_members RLS hides other people's rows.)
 */
export async function boardPeople(client: Database, sessionId: string, viewer: CurrentUser | null) {
  const [session, ideas] = await Promise.all([
    client.from("sessions").select("owner_id").eq("id", sessionId).maybeSingle(),
    client.from("ideas").select("id, author_id, speaker, created_at").eq("session_id", sessionId).is("deleted_at", null).order("created_at"),
  ]);
  check(session.error);
  check(ideas.error);
  const rows = (ideas.data ?? []) as AuthorRow[];
  const ownerId = (session.data?.owner_id as string | null) ?? null;
  const ids = [ownerId, viewer?.id, ...rows.map(r => r.author_id)].filter((v): v is string => Boolean(v));
  const profiles = await loadProfiles(viewer, ids);
  const speakerName = new Map<string, string>();
  rows.forEach(r => { if (r.author_id && r.speaker) speakerName.set(r.author_id, r.speaker); });
  if (viewer) profiles.set(viewer.id, { id: viewer.id, display_name: viewer.displayName, color: viewer.color });

  const own = viewer ? await ownMembership(viewer, sessionId) : null;
  const order = [...new Set(ids)];
  const members: Member[] = order.map(id => {
    const profile = profiles.get(id);
    return {
      id,
      displayName: profile?.display_name ?? speakerName.get(id) ?? "Someone",
      color: profile?.color ?? pickColor(id),
      role: id === ownerId ? "owner" : "editor",
      ...(viewer && id === viewer.id ? { lastSeenAt: own?.last_seen_at ?? null } : {}),
    };
  });
  const authorOf = new Map(rows.filter(r => r.author_id).map(r => [r.id, r.author_id as string]));
  return { members, authorOf, ownerId };
}

/** Adds authorId/authorName/authorColor to ideas (pure, returns new objects). */
export function withAuthors(ideas: Idea[], authorOf: Map<string, string>, members: Member[]): AuthoredIdea[] {
  const byId = new Map(members.map(m => [m.id, m]));
  return ideas.map(idea => {
    const authorId = authorOf.get(idea.id);
    const member = authorId ? byId.get(authorId) : undefined;
    if (!authorId || !member) return idea;
    return { ...idea, authorId, authorName: member.displayName, authorColor: member.color };
  });
}
