import { UpdateProvocationBody } from "@/lib/contract";
import { body, check, db, failure, HttpError, validId } from "@/lib/db";
export const dynamic = "force-dynamic";
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  try {
    const input = await body(request, UpdateProvocationBody);
    const id = validId((await params).id);
    const result = await db().from("provocations").update({ status: input.status }).eq("id", id).select("id").maybeSingle();
    check(result.error);
    if (!result.data) throw new HttpError(404, "Provocation not found");
    return Response.json({ ok: true });
  } catch (error) { return failure(error); }
}
