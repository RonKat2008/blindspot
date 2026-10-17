import { UpdateAxesBody } from "@/lib/contract";
import { embedMany } from "@/lib/ai";
import { body, check, db, failure, HttpError, loadSession, publicAxis, saveScores, validId } from "@/lib/db";
import { scoreIdeas, type AxisWithEmbeddings } from "@/lib/engine/score";
export const dynamic = "force-dynamic";
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  try {
    const input = await body(request, UpdateAxesBody);
    const id = validId((await params).id), client = db();
    const data = await loadSession(client, id);
    const seen = new Set<string>();
    for (const axis of input.axes) if (axis.id) {
      validId(axis.id);
      if (seen.has(axis.id) || !data.axes.some(a => a.id === axis.id)) throw new HttpError(400, "Unknown or repeated axis identifier");
      seen.add(axis.id);
    }
    const pending: string[] = [];
    for (const axis of input.axes) {
      const old = data.axes.find(a => a.id === axis.id);
      if (!old || axis.poleA !== old.poleA) pending.push(axis.poleA);
      if (!old || axis.poleB !== old.poleB) pending.push(axis.poleB);
    }
    const vectors = await embedMany(pending);
    let cursor = 0;
    const axes: AxisWithEmbeddings[] = input.axes.map((axis, position) => {
      const old = data.axes.find(a => a.id === axis.id);
      return { id: axis.id ?? crypto.randomUUID(), poleA: axis.poleA, poleB: axis.poleB, position, userEdited: !old || old.userEdited || old.poleA !== axis.poleA || old.poleB !== axis.poleB,
        poleAEmbedding: old?.poleA === axis.poleA ? old.poleAEmbedding : vectors[cursor++],
        poleBEmbedding: old?.poleB === axis.poleB ? old.poleBEmbedding : vectors[cursor++] };
    });
    const upsert = await client.from("axes").upsert(axes.map(a => ({ id: a.id, session_id: id, pole_a: a.poleA, pole_b: a.poleB, position: a.position, user_edited: a.userEdited, pole_a_embedding: JSON.stringify(a.poleAEmbedding), pole_b_embedding: JSON.stringify(a.poleBEmbedding) })));
    check(upsert.error);
    const removed = data.axes.filter(a => !axes.some(next => next.id === a.id)).map(a => a.id);
    if (removed.length) { const result = await client.from("axes").delete().eq("session_id", id).in("id", removed); check(result.error); }
    const scores = scoreIdeas(data.ideas.map(i => i.embedding), axes);
    data.ideas.forEach((idea, i) => { idea.axisScores = scores[i]; });
    await saveScores(client, data.ideas);
    return Response.json({ axes: axes.map(publicAxis) });
  } catch (error) { return failure(error); }
}
