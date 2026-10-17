import { test } from "node:test";
import assert from "node:assert/strict";
import { apiPolicy, clientIp, SlidingWindowLimiter } from "./rate-limit.ts";

test("sliding window expires individual requests, including the exact boundary", () => {
  const limiter = new SlidingWindowLimiter();
  assert.equal(limiter.check("ip", "ai", 2, 0).allowed, true);
  assert.equal(limiter.check("ip", "ai", 2, 30_000).allowed, true);
  assert.deepEqual(limiter.check("ip", "ai", 2, 59_001), { allowed: false, retryAfter: 1 });
  assert.equal(limiter.check("ip", "ai", 2, 60_000).allowed, true);
  assert.deepEqual(limiter.check("ip", "ai", 2, 60_001), { allowed: false, retryAfter: 30 });
  assert.equal(limiter.check("ip", "ai", 2, 90_000).allowed, true);
});

test("idle windows reset and blocked requests do not extend the window", () => {
  const limiter = new SlidingWindowLimiter();
  limiter.check("ip", "ai", 1, 0);
  assert.equal(limiter.check("ip", "ai", 1, 59_999).allowed, false);
  assert.equal(limiter.check("ip", "ai", 1, 60_000).allowed, true);
  assert.equal(limiter.check("ip", "ai", 1, 180_000).allowed, true);
});

test("IPs and route buckets have independent quotas", () => {
  const limiter = new SlidingWindowLimiter();
  assert.equal(limiter.check("a", "one", 1, 0).allowed, true);
  assert.equal(limiter.check("a", "one", 1, 1).allowed, false);
  assert.equal(limiter.check("b", "one", 1, 1).allowed, true);
  assert.equal(limiter.check("a", "two", 1, 1).allowed, true);
});

test("route policies share resource buckets and apply all specified quotas", () => {
  for (const [path, limit] of [
    ["/api/sessions", 10], ["/api/sessions/a/ideas", 60],
    ["/api/media/upload", 20], ["/api/media/describe", 20],
    ["/api/extract", 10], ["/api/reality", 6],
    ["/api/provocations/bridge", 30], ["/api/ideas/a", 120], ["/api/other", 120],
  ] as const) assert.equal(apiPolicy(path).limit, limit, path);
  assert.deepEqual(apiPolicy("/api/sessions/a/ideas"), apiPolicy("/api/sessions/b/ideas/"));
  assert.equal(apiPolicy("/api/media/upload/").maxBodyBytes, 6 * 1024 * 1024);
  assert.equal(apiPolicy("/api/extract").maxBodyBytes, 64 * 1024);
});

test("client identity uses the first forwarded hop then real IP", () => {
  assert.equal(clientIp(new Headers({ "x-forwarded-for": " 1.2.3.4, 5.6.7.8", "x-real-ip": "other" })), "1.2.3.4");
  assert.equal(clientIp(new Headers({ "x-real-ip": " 1.2.3.4 " })), "1.2.3.4");
  assert.equal(clientIp(new Headers()), "unknown");
});
