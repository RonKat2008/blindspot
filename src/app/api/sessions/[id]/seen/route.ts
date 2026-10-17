import type { SeenResponse } from "@/lib/supabase/account-types";
import { check, db, failure, HttpError, validId } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { markSeen } from "@/lib/supabase/members";
export const dynamic = "force-dynamic";
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  try {
    const id = validId((await params).id);
    const user = await getCurrentUser();
    if (!user) throw new HttpError(401, "Sign in to keep track of what you've seen");
    const exists = await db().from("sessions").select("id").eq("id", id).maybeSingle();
    check(exists.error);
    if (!exists.data) throw new HttpError(404, "Session not found");
    const body: SeenResponse = { ok: true, lastSeenAt: await markSeen(user, id) };
    return Response.json(body);
  } catch (error) { return failure(error); }
}
