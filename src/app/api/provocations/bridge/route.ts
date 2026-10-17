import { z } from "zod";
import { body, check, db, failure, HttpError, loadSession, mapProvocation } from "@/lib/db";
import { detectBridge } from "@/lib/engine/detect";
import { graph } from "@/lib/engine/graph";
import { templateExtra } from "@/lib/engine/templates-extra";

export const dynamic = "force-dynamic";
const BridgeBody = z.object({ sessionId: z.uuid(), a: z.uuid(), b: z.uuid() }).strict();

export async function POST(request: Request): Promise<Response> {
  try {
    const input = await body(request, BridgeBody);
    const client = db();
    const data = await loadSession(client, input.sessionId);
    if (![input.a, input.b].every(id => data.ideas.some(i => i.id === id))) {
      throw new HttpError(404, "Idea not found in this session");
    }
    const signal = detectBridge(input.a, input.b, graph(data.ideas).edges);
    if (!signal) return Response.json({ provocation: null });
    const written = templateExtra(signal, data.ideas);
    if (!written) throw new HttpError(400, "Two idea cards are required");
    const result = await client.from("provocations").insert({
      session_id: input.sessionId, type: signal.type, text: written.text,
      why: written.why.explanation, idea_ids: signal.ideaIds, status: "shown",
    }).select("*").single();
    check(result.error);
    return Response.json({ provocation: mapProvocation(result.data!) });
  } catch (error) { return failure(error); }
}
