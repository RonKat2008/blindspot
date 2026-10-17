import { UpdateIdeaBody } from "@/lib/contract";
import { body, check, db, failure, HttpError, validId } from "@/lib/db";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  try {
    const id = validId((await params).id);
    const { board } = await body(request, UpdateIdeaBody);
    const result = await db().from("ideas").update({ board_x: board.x, board_y: board.y }).eq("id", id).select("id").maybeSingle();
    check(result.error);
    if (!result.data) throw new HttpError(404, "Idea not found");
    return Response.json({ ok: true });
  } catch (error) { return failure(error); }
}
