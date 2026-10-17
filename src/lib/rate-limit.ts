/** Demo protection only: memory is local to one process/serverless instance and
 * resets on restart. A shared store is needed for a deployment-wide quota.
 * Forwarded IP headers must be supplied/overwritten by the trusted host proxy.
 */
export class SlidingWindowLimiter {
  private readonly entries = new Map<string, number[]>();
  private nextCleanup = 0;

  private readonly windowMs: number;

  constructor(windowMs = 60_000) {
    this.windowMs = windowMs;
  }

  check(ip: string, bucket: string, limit: number, now = Date.now()) {
    const cutoff = now - this.windowMs;
    // Lazy periodic cleanup avoids timers keeping serverless instances alive.
    if (now >= this.nextCleanup) {
      for (const [key, times] of this.entries) {
        const active = times.filter((time) => time > cutoff);
        if (active.length) this.entries.set(key, active);
        else this.entries.delete(key);
      }
      this.nextCleanup = now + this.windowMs;
    }

    const key = JSON.stringify([ip, bucket]);
    const times = (this.entries.get(key) ?? []).filter((time) => time > cutoff);
    if (times.length >= limit) {
      this.entries.set(key, times);
      return {
        allowed: false,
        retryAfter: Math.max(1, Math.ceil((times[0] + this.windowMs - now) / 1000)),
      };
    }
    times.push(now);
    this.entries.set(key, times);
    return { allowed: true, retryAfter: 0 };
  }
}

export function clientIp(headers: Headers): string {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || headers.get("x-real-ip")?.trim()
    || "unknown";
}

export function apiPolicy(path: string) {
  // Share buckets across resource IDs so changing IDs cannot evade the quota.
  const normalized = path.replace(/\/+$/, "");
  let bucket = "default";
  let limit = 120;
  if (normalized === "/api/sessions") { bucket = "sessions"; limit = 10; }
  else if (/^\/api\/sessions\/[^/]+\/ideas$/.test(normalized)) { bucket = "session-ideas"; limit = 60; }
  else if (normalized === "/api/media/upload") { bucket = "media-upload"; limit = 20; }
  else if (normalized === "/api/media/describe") { bucket = "media-describe"; limit = 20; }
  else if (normalized === "/api/extract") { bucket = "extract"; limit = 10; }
  else if (normalized === "/api/reality") { bucket = "reality"; limit = 6; }
  else if (normalized.startsWith("/api/provocations/")) { bucket = "provocations"; limit = 30; }
  else if (normalized.startsWith("/api/ideas/")) { bucket = "ideas"; }
  return { bucket, limit, maxBodyBytes: normalized === "/api/media/upload" ? 6 * 1024 * 1024 : 64 * 1024 };
}
