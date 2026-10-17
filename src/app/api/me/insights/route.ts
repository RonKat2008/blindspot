import { getCurrentUser } from "@/lib/auth";
import { check, db, failure, HttpError } from "@/lib/db";
import { buildInsights } from "./compute";

export const dynamic = "force-dynamic";

const MAX_BOARDS = 10;

export async function GET(): Promise<Response> {
  try {
    const user = await getCurrentUser();
    if (!user) throw new HttpError(401, "Sign in to see your insights");

    const client = db();
    const [memberships, owned] = await Promise.all([
      user.client.from("board_members").select("session_id").eq("user_id", user.id),
      client.from("sessions").select("id").eq("owner_id", user.id),
    ]);
    check(memberships.error);
    check(owned.error);
    const ids = new Set<string>();
    for (const row of memberships.data ?? []) ids.add(String(row.session_id));
    for (const row of owned.data ?? []) ids.add(String(row.id));
    if (ids.size === 0) {
      return Response.json(
        { signedIn: true, boards: [], teamName: user.displayName },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    const idList = [...ids];
    const sessionsResult = await client
      .from("sessions")
      .select("id, prompt, team_name, created_at, updated_at")
      .in("id", idList);
    check(sessionsResult.error);
    const sessions = [...(sessionsResult.data ?? [])]
      .sort((a, b) => Date.parse(b.updated_at ?? b.created_at) - Date.parse(a.updated_at ?? a.created_at))
      .slice(0, MAX_BOARDS)
      .reverse();
    const recent = sessions.map((s) => s.id);

    const [axes, ideas, provocations] = await Promise.all([
      client.from("axes").select("id, session_id, pole_a, pole_b, position").in("session_id", recent),
      client.from("ideas").select("session_id, author_id, axis_scores").in("session_id", recent).is("deleted_at", null),
      client.from("provocations").select("session_id, status").in("session_id", recent),
    ]);
    check(axes.error);
    check(ideas.error);
    check(provocations.error);

    const body = buildInsights({
      userId: user.id,
      displayName: user.displayName,
      sessions,
      axes: axes.data ?? [],
      ideas: ideas.data ?? [],
      provocations: provocations.data ?? [],
    });
    return Response.json(body, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return failure(error);
  }
}
