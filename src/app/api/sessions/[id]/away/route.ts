import type { AwayResponse } from "@/lib/supabase/account-types";
import { check, db, failure, validId } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { loadProfiles, ownMembership } from "@/lib/supabase/members";
export const dynamic = "force-dynamic";

type IdeaRow = { id: string; author_id: string | null; speaker: string | null };
type ProvocationRow = { id: string; text: string };

/** What changed on a board since the viewer last looked. Read-only; POST /seen clears it. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  try {
    const id = validId((await params).id);
    const user = await getCurrentUser();
    const headers = { "Cache-Control": "no-store" };
    // Guests have no "last seen" mark, so there is nothing to catch up on.
    if (!user) return Response.json({ since: null, ideas: [], provocations: [] } satisfies AwayResponse, { headers });
    const membership = await ownMembership(user, id);
    const since = membership?.last_seen_at ?? null;
    if (!since) return Response.json({ since, ideas: [], provocations: [] } satisfies AwayResponse, { headers });
    const client = db();
    const [ideas, provocations] = await Promise.all([
      client.from("ideas").select("id, author_id, speaker").eq("session_id", id).is("deleted_at", null).gt("created_at", since).order("created_at"),
      client.from("provocations").select("id, text").eq("session_id", id).gt("created_at", since).order("created_at"),
    ]);
    check(ideas.error);
    check(provocations.error);
    const others = ((ideas.data ?? []) as IdeaRow[]).filter(r => r.author_id !== user.id);
    const profiles = await loadProfiles(user, others.flatMap(r => (r.author_id ? [r.author_id] : [])));
    const body: AwayResponse = {
      since,
      ideas: others.map(r => {
        const p = r.author_id ? profiles.get(r.author_id) : undefined;
        return { id: r.id, authorName: p?.display_name ?? r.speaker ?? "A guest", ...(p ? { authorColor: p.color } : {}) };
      }),
      provocations: ((provocations.data ?? []) as ProvocationRow[]).map(r => ({ id: r.id, text: r.text })),
    };
    return Response.json(body, { headers });
  } catch (error) { return failure(error); }
}
