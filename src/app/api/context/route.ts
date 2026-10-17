import { ContextBody } from "@/lib/contract";
import { body, check, db, failure, HttpError } from "@/lib/db";
import { cachedContext, ExaError } from "@/lib/exa";

export const dynamic = "force-dynamic";
export async function POST(request: Request): Promise<Response> {
  try {
    const input = await body(request, ContextBody), client = db();
    const session = await client.from("sessions").select("prompt").eq("id", input.sessionId).maybeSingle();
    check(session.error);
    if (!session.data) throw new HttpError(404, "Session not found");
    let query = input.query ?? "";
    if (input.ideaId) {
      const idea = await client.from("ideas").select("text").eq("id", input.ideaId).eq("session_id", input.sessionId).is("deleted_at", null).maybeSingle();
      check(idea.error);
      if (!idea.data) throw new HttpError(404, "Idea not found in this session");
      query = `${idea.data.text} — ${session.data.prompt}`;
    }
    return Response.json({ query, results: await cachedContext(query) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof ExaError) return Response.json({ error: error.message }, { status: error.code === "timeout" ? 504 : 502 });
    return failure(error);
  }
}
