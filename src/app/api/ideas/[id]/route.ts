import { UpdateIdeaBody } from "@/lib/contract";
import { body, check, db, failure, HttpError, validId } from "@/lib/db";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  try {
    const id = validId((await params).id);
    const input = await body(request, UpdateIdeaBody);
    const update = {
      ...(input.board ? { board_x: input.board.x, board_y: input.board.y } : {}),
      ...(input.kind !== undefined ? { kind: input.kind } : {}),
      ...(input.shortlisted !== undefined ? { shortlisted: input.shortlisted } : {}),
    };
    const result = await db().from("ideas").update(update).eq("id", id).is("deleted_at", null).select("id").maybeSingle();
    check(result.error);
    if (!result.data) throw new HttpError(404, "Idea not found");
    return Response.json({ ok: true });
  } catch (error) { return failure(error); }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  try {
    const id = validId((await params).id);
    const result = await db().from("ideas").update({ deleted_at: new Date().toISOString() }).eq("id", id).is("deleted_at", null).select("id").maybeSingle();
    check(result.error);
    if (!result.data) throw new HttpError(404, "Idea not found");
    return Response.json({ ok: true });
  } catch (error) { return failure(error); }
}
