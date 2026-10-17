import { CreateSessionBody } from "@/lib/contract";
import { proposeAxes } from "@/lib/prompts";
import { embedMany } from "@/lib/ai";
import { body, check, db, failure, mapAxis, publicAxis } from "@/lib/db";
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  try {
    const input = await body(request, CreateSessionBody);
    const proposed = await proposeAxes(input.prompt);
    const vectors = await embedMany(proposed.flatMap(a => [a.poleA, a.poleB]));
    const client = db();
    const sessionId = crypto.randomUUID();
    const session = await client.from("sessions").insert({ id: sessionId, prompt: input.prompt, team_name: input.teamName ?? null });
    check(session.error);
    const result = await client.from("axes").insert(proposed.map((a, position) => ({ id: crypto.randomUUID(), session_id: sessionId, pole_a: a.poleA, pole_b: a.poleB, pole_a_embedding: JSON.stringify(vectors[position * 2]), pole_b_embedding: JSON.stringify(vectors[position * 2 + 1]), position, user_edited: false }))).select("*");
    if (result.error) {
      await client.from("sessions").delete().eq("id", sessionId);
      check(result.error);
    }
    return Response.json({ sessionId, axes: (result.data ?? []).map(mapAxis).map(publicAxis).sort((a,b) => a.position - b.position) }, { status: 201 });
  } catch (error) { return failure(error); }
}
