import { AddIdeasBody, DETECT_EVERY_N_IDEAS } from "@/lib/contract";
import { embedMany } from "@/lib/ai";
import { body, check, db, failure, HttpError, loadSession, mapIdea, mapProvocation, metrics, publicIdeas, saveScores, validId } from "@/lib/db";
import { scoreIdeas } from "@/lib/engine/score";
import { detect } from "@/lib/engine/detect";
import { writeProvocation } from "@/lib/prompts";
export const dynamic = "force-dynamic";
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  try {
    const input = await body(request, AddIdeasBody);
    const id = validId((await params).id), client = db();
    const before = await loadSession(client, id);
    if (input.deviceId) {
      validId(input.deviceId);
      const device = await client.from("devices").select("id").eq("id", input.deviceId).eq("session_id", id).maybeSingle();
      check(device.error);
      if (!device.data) throw new HttpError(400, "Device does not belong to this session");
    }
    const vectors = await embedMany(input.texts);
    const now = Date.now();
    const inserted = await client.from("ideas").insert(input.texts.map((text, i) => ({ id: crypto.randomUUID(), session_id: id, text, source: input.source, speaker: input.speaker ?? null, device_id: input.deviceId ?? null, embedding: JSON.stringify(vectors[i]), axis_scores: {}, created_at: new Date(now + i).toISOString() }))).select("*");
    check(inserted.error);
    const newIds = new Set((inserted.data ?? []).map(row => mapIdea(row).id));
    // Reload after insertion to include ideas posted by other devices during embedding.
    const data = await loadSession(client, id);
    const scores = scoreIdeas(data.ideas.map(i => i.embedding), data.axes);
    data.ideas.forEach((idea, i) => { idea.axisScores = scores[i]; });
    await saveScores(client, data.ideas);
    const allIdeas = publicIdeas(data.ideas);
    let provocation;
    if (Math.floor(data.ideas.length / DETECT_EVERY_N_IDEAS) > Math.floor(before.ideas.length / DETECT_EVERY_N_IDEAS)) {
      const signal = detect({ ideas: data.ideas, axes: data.axes, lastType: data.provocations.at(-1)?.type });
      if (signal) {
        const written = await writeProvocation(signal, allIdeas, data.axes, data.session.prompt);
        const result = await client.from("provocations").insert({ session_id: id, type: signal.type, text: written.text, why: written.why.explanation, idea_ids: written.why.ideaIds, axis_id: written.why.axisId ?? null, status: "shown" }).select("*").single();
        check(result.error);
        provocation = mapProvocation(result.data!);
      }
    }
    return Response.json({ ideas: allIdeas.filter(i => newIds.has(i.id)), allIdeas, ...(provocation ? { provocation } : {}), ...metrics(data.ideas, data.axes) });
  } catch (error) { return failure(error); }
}
