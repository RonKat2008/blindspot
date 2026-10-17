import { getCurrentUser, publicMe } from "@/lib/auth";
import type { MeResponse } from "@/lib/supabase/account-types";
export const dynamic = "force-dynamic";
export async function GET(): Promise<Response> {
  const user = await getCurrentUser();
  const body: MeResponse = { user: user ? publicMe(user) : null };
  return Response.json(body, { headers: { "Cache-Control": "no-store" } });
}
