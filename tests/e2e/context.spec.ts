import { test, expect } from "@playwright/test";
import type { ContextResponse, SandboxResponse, SessionState } from "../../src/lib/contract";
import { checkedJson } from "./helpers";

test("sandbox persists real text, image and link points; context returns evidence", async ({ request }) => {
  const startedAt = Date.now();
  const { sessionId } = await checkedJson<SandboxResponse>(await request.post("/api/sandbox", { timeout: 30_000 }));
  // Warm server setup; compilation is outside the sandbox's production latency budget.
  const current = await checkedJson<SessionState>(await request.get(`/api/sessions/${sessionId}/state`));
  expect(current.session.prompt).toBe("How might we make a new hire's first week great?");
  expect(current.ideas.length).toBeGreaterThanOrEqual(12);
  expect(current.axes.length).toBeGreaterThanOrEqual(4);
  expect(current.ideas.filter(idea => idea.mediaType === "image")).toHaveLength(3);
  const link = current.ideas.find(idea => idea.mediaType === "link");
  expect(link?.mediaUrl).toMatch(/^https:\/\//);
  expect(link?.mediaCaption).toBeTruthy();
  expect(current.provocations).toHaveLength(0);
  for (const image of current.ideas.filter(idea => idea.mediaType === "image")) {
    const response = await request.get(image.mediaUrl!);
    expect(response.ok()).toBe(true);
    expect(response.headers()["content-type"]).toContain("image/");
  }
  const context = await checkedJson<ContextResponse>(await request.post("/api/context", {
    data: { sessionId, ideaId: current.ideas[0].id },
  }));
  expect(context.query).toContain(current.ideas[0].text);
  expect(context.query).toContain(current.session.prompt);
  expect(context.results.length).toBeGreaterThanOrEqual(1);
  for (const result of context.results) expect(result.url).toMatch(/^https:\/\//);
  const cached = await checkedJson<ContextResponse>(await request.post("/api/context", {
    data: { sessionId, ideaId: current.ideas[0].id },
  }));
  expect(cached).toEqual(context);
  const explicit = await checkedJson<ContextResponse>(await request.post("/api/context", {
    data: { sessionId, query: "new hire onboarding buddy program research" },
  }));
  expect(explicit.query).toBe("new hire onboarding buddy program research");
  expect(explicit.results.length).toBeGreaterThanOrEqual(1);
  const invalid = await request.post(`/api/sessions/${sessionId}/ideas`, {
    data: { texts: [""], media: [{ mediaType: "link", mediaUrl: "http://example.com", caption: "An insecure link" }] },
  });
  expect(invalid.status()).toBe(400);
  const added = await checkedJson<{ ideas: SessionState["ideas"] }>(await request.post(`/api/sessions/${sessionId}/ideas`, {
    data: { texts: [""], media: [{ mediaType: "link", mediaUrl: link!.mediaUrl, caption: "Human-selected onboarding evidence" }] },
  }));
  expect(added.ideas[0].mediaType).toBe("link");
  const saved = await checkedJson<SessionState>(await request.get(`/api/sessions/${sessionId}/state`));
  expect(saved.ideas.find(idea => idea.id === added.ideas[0].id)?.mediaType).toBe("link");
  console.log(`Sandbox + context smoke completed in ${Date.now() - startedAt}ms`);
});

test("context validates identifiers and requires a query or point", async ({ request }) => {
  const invalid = await request.post("/api/context", { data: { sessionId: "invalid", query: "onboarding" } });
  expect(invalid.status()).toBe(400);
  const missing = await request.post("/api/context", { data: { sessionId: crypto.randomUUID() } });
  expect(missing.status()).toBe(400);
  const unknown = await request.post("/api/context", { data: { sessionId: crypto.randomUUID(), query: "onboarding" } });
  expect(unknown.status()).toBe(404);
});

test("play streams a redirect into a new sandbox board", async ({ request }) => {
  // With loading.tsx, Next emits a redirect meta tag in the streamed HTML.
  const response = await request.get("/play", { timeout: 30_000 });
  expect(response.ok()).toBe(true);
  const html = await response.text();
  expect(html).toContain("Setting up a sandbox board with real data");
  const destination = html.match(/\/s\/([0-9a-f-]+)\?sandbox=1/);
  expect(destination).toBeTruthy();
  const current = await checkedJson<SessionState>(await request.get(`/api/sessions/${destination![1]}/state`));
  expect(current.ideas).toHaveLength(13);
});
