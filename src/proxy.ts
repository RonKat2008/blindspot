import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";
import { apiPolicy, clientIp, SlidingWindowLimiter } from "@/lib/rate-limit";

const limiter = new SlidingWindowLimiter();
const mutationMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export async function proxy(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/api/") && mutationMethods.has(request.method)) {
    const policy = apiPolicy(request.nextUrl.pathname);
    // Header-only guard: missing Content-Length/chunked bodies are not measured.
    // The hosting platform must also enforce its transport-level body limit.
    const length = Number(request.headers.get("content-length"));
    if (length > policy.maxBodyBytes) {
      return NextResponse.json({ error: "Request body is too large." }, { status: 413 });
    }
    const result = limiter.check(clientIp(request.headers), policy.bucket, policy.limit);
    if (!result.allowed) {
      return NextResponse.json(
        { error: "Slow down a little — too many requests. Try again in a few seconds." },
        { status: 429, headers: { "Retry-After": String(result.retryAfter) } },
      );
    }
  }
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/api/:path*",
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
