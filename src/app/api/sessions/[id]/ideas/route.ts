import { after } from "next/server";
import { AddIdeasBody, DETECT_EVERY_N_IDEAS, IDEA_TEXT_MAX } from "@/lib/contract";
import { isOwnMediaUrl } from "@/lib/media";
import { embedMany } from "@/lib/ai";
import { body, check, db, failure, HttpError, loadSession, mapIdea, mapProvocation, metrics, publicIdeas, saveScores, validId } from "@/lib/db";
import { scoreIdeas } from "@/lib/engine/score";
import { detect } from "@/lib/engine/detect";
import { writeProvocation } from "@/lib/prompts";
import { getCurrentUser } from "@/lib/auth";
import { boardPeople, ensureMembership, withAuthors } from "@/lib/supabase/members";
export const maxDuration = 60;
export const dynamic = "force-dynamic";
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  const startedAt = Date.now();
  try {
    const input = await body(request, AddIdeasBody);
    const id = validId((await params).id), client = db();
    const [before, user] = await Promise.all([loadSession(client, id), getCurrentUser()]);
    const speaker = input.speaker ?? user?.displayName ?? null;
    if (input.deviceId) {
      validId(input.deviceId);
      const device = await client.from("devices").select("id").eq("id", input.deviceId).eq("session_id", id).maybeSingle();
      check(device.error);
      if (!device.data) throw new HttpError(400, "Device does not belong to this session");
    }
    const media = input.texts.map((_, i) => input.media?.[i] ?? null);
    if (media.some(m => m && !isOwnMediaUrl(m.mediaUrl))) throw new HttpError(400, "mediaUrl must be an uploaded idea-media file");
    // The human's label (if any) plus the AI description/transcript is what gets embedded.
    const embedTexts = input.texts.map((text, i) => [text, media[i]?.caption].filter(Boolean).join(". ") || (media[i]?.mediaType === "audio" ? "Voice note" : "Image"));
    // Stored idea text: the human's label; else the transcript (their own words) or the image description.
    const texts = input.texts.map((text, i) => (text || media[i]?.caption || (media[i]?.mediaType === "audio" ? "Voice note" : "Image")).slice(0, IDEA_TEXT_MAX));
    const vectors = await embedMany(embedTexts);
    const now = Date.now();
    const inserted = await client.from("ideas").insert(texts.map((text, i) => ({ id: crypto.randomUUID(), session_id: id, text, source: input.source, media_type: media[i]?.mediaType ?? "text", media_url: media[i]?.mediaUrl ?? null, media_caption: media[i]?.caption ?? null, speaker, ...(user ? { author_id: user.id } : {}), device_id: input.deviceId ?? null, embedding: JSON.stringify(vectors[i]), axis_scores: {}, board_x: input.positions?.[i]?.x ?? null, board_y: input.positions?.[i]?.y ?? null, color: input.color ?? null, created_at: new Date(now + i).toISOString() }))).select("*");
    check(inserted.error);
    if (user) await ensureMembership(user, id, "editor");
    const newIds = new Set((inserted.data ?? []).map(row => mapIdea(row).id));
    // Reload after insertion to include ideas posted by other devices during embedding.
    const data = await loadSession(client, id);
    const scores = scoreIdeas(data.ideas.map(i => i.embedding), data.axes);
    data.ideas.forEach((idea, i) => { idea.axisScores = scores[i]; });
    await saveScores(client, data.ideas);
    const people = user ? await boardPeople(client, id, user).catch(() => null) : null;
    const allIdeas = people ? withAuthors(publicIdeas(data.ideas), people.authorOf, people.members) : publicIdeas(data.ideas);
    let provocation = null;
    if (Math.floor(data.ideas.length / DETECT_EVERY_N_IDEAS) > Math.floor(before.ideas.length / DETECT_EVERY_N_IDEAS)) {
      const signal = detect({ ideas: data.ideas, axes: data.axes, lastType: data.provocations.at(-1)?.type });
      if (signal) {
        const pending = (async () => {
          const written = await writeProvocation(signal, allIdeas, data.axes, data.session.prompt);
          const result = await client.from("provocations").insert({ session_id: id, type: signal.type, text: written.text, why: written.why.explanation, idea_ids: written.why.ideaIds, axis_id: written.why.axisId ?? null, status: "shown" }).select("*").single();
          check(result.error);
          return mapProvocation(result.data!);
        })();
        // Register immediately: the same promise is awaited by after(), never rerun.
        const completion = pending.catch(error => { console.error("Provocation generation failed", error instanceof Error ? error.message : "Unknown error"); return null; });
        after(async () => { await completion; });
        let timer: ReturnType<typeof setTimeout> | undefined;
        try {
          provocation = await Promise.race([
            completion,
            new Promise<null>(resolve => { timer = setTimeout(() => resolve(null), Math.max(0, 4000 - (Date.now() - startedAt))); }),
          ]);
        } finally { if (timer) clearTimeout(timer); }
      }
    }
    return Response.json({ ideas: allIdeas.filter(i => newIds.has(i.id)), allIdeas, provocation, ...metrics(data.ideas, data.axes) });
  } catch (error) { return failure(error); }
}
