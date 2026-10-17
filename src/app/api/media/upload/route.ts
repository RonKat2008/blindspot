import { check, db, failure, HttpError, validId } from "@/lib/db";
import { uploadMedia } from "@/lib/media";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(request: Request): Promise<Response> {
  try {
    let form: FormData;
    try { form = await request.formData(); } catch { throw new HttpError(400, "Expected multipart form data"); }
    const file = form.get("file"), sessionId = form.get("sessionId");
    if (!(file instanceof File)) throw new HttpError(400, "file is required");
    if (typeof sessionId !== "string") throw new HttpError(400, "sessionId is required");
    const client = db();
    const session = await client.from("sessions").select("id").eq("id", validId(sessionId)).maybeSingle();
    check(session.error);
    if (!session.data) throw new HttpError(404, "Session not found");
    return Response.json(await uploadMedia(client, sessionId, file));
  } catch (error) { return failure(error); }
}
