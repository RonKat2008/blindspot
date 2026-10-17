import { db, failure, getState } from "@/lib/db";
export const dynamic = "force-dynamic";
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  try { return Response.json(await getState(db(), (await params).id), { headers: { "Cache-Control": "no-store" } }); }
  catch (error) { return failure(error); }
}
