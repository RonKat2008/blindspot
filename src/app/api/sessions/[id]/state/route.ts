import { db, failure, getState, validId } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { boardPeople, withAuthors } from "@/lib/supabase/members";
export const dynamic = "force-dynamic";
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  try {
    const id = validId((await params).id), client = db();
    const [state, viewer] = await Promise.all([getState(client, id), getCurrentUser()]);
    // Members are additive: a failure here must never break board polling.
    const people = await boardPeople(client, id, viewer).catch(error => {
      console.error("Members lookup failed:", error instanceof Error ? error.message : "Unknown error");
      return null;
    });
    const body = people
      ? { ...state, ideas: withAuthors(state.ideas, people.authorOf, people.members), members: people.members }
      : state;
    return Response.json(body, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return failure(error); }
}
