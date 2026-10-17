import type { BoardsResponse } from "@/lib/supabase/account-types";
import { failure, HttpError } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { listBoards } from "@/lib/supabase/boards";
export const dynamic = "force-dynamic";
export async function GET(): Promise<Response> {
  try {
    const user = await getCurrentUser();
    if (!user) throw new HttpError(401, "Sign in to see your boards");
    const body: BoardsResponse = { boards: await listBoards(user) };
    return Response.json(body, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return failure(error); }
}
