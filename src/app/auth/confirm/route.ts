import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { safeNext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Email confirmation / magic-link landing: supports both token_hash and PKCE code links. */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const next = safeNext(url.searchParams.get("next"));
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const code = url.searchParams.get("code");
  const supabase = await createClient();
  let failed = true;
  if (tokenHash && type) failed = Boolean((await supabase.auth.verifyOtp({ type, token_hash: tokenHash })).error);
  else if (code) failed = Boolean((await supabase.auth.exchangeCodeForSession(code)).error);
  const target = failed ? `/login?next=${encodeURIComponent(next)}` : next;
  return NextResponse.redirect(new URL(target, url.origin));
}
