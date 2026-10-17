import { test, expect } from "@playwright/test";
import type { AddIdeasResponse } from "../../src/lib/contract";
import { checkedJson, createSession, state } from "./helpers";

const suggestions = /\b(try|you could|consider adding|how about|for example|such as|imagine a)\b/i;

test("API core loop persists ideas, question acceptance, and board positions; AI only asks questions", async ({ request }) => {
  const { sessionId } = await createSession(request);
  const texts = [
    "A campus events app with reminders",
    "A campus events app with event reminders",
    "A campus events app that sends reminders",
    "A campus events reminder app",
    "An app with reminders for campus events",
    "An app for campus event reminders",
  ];
  // Two batches exercise both detection boundaries (3 and 6 ideas).
  for (let i = 0; i < texts.length; i += 3) {
    const added = await checkedJson<AddIdeasResponse>(await request.post(`/api/sessions/${sessionId}/ideas`, {
      data: { texts: texts.slice(i, i + 3), source: "typed" },
      timeout: 60_000,
    }));
    expect(added.allIdeas).toHaveLength(i + 3);
  }
  await expect.poll(async () => (await state(request, sessionId)).provocations.length, {
    message: "Background detection must persist at least one question after six similar ideas",
    timeout: 60_000,
    intervals: [250, 500, 1000, 2000],
  }).toBeGreaterThanOrEqual(1);
  const current = await state(request, sessionId);
  expect(current.ideas).toHaveLength(6);
  expect(Array.isArray(current.edges)).toBe(true);
  expect(Array.isArray(current.clusters)).toBe(true);
  for (const question of current.provocations) {
    expect(question.text.trim(), `Question ${question.id} must end in '?'`).toMatch(/\?$/);
    expect(question.text, `Question ${question.id} must never suggest an idea`).not.toMatch(suggestions);
  }
  const questionId = current.provocations[0].id;
  await checkedJson(await request.patch(`/api/provocations/${questionId}`, { data: { status: "accepted" } }));
  const ideaId = current.ideas[0].id;
  const board = { x: 340, y: -20 };
  await checkedJson(await request.patch(`/api/ideas/${ideaId}`, { data: { board } }));
  await expect.poll(async () => {
    const saved = await state(request, sessionId);
    return {
      status: saved.provocations.find(p => p.id === questionId)?.status,
      board: saved.ideas.find(i => i.id === ideaId)?.board,
    };
  }).toEqual({ status: "accepted", board });
});

test("soft delete hides the idea from session state", async ({ request }) => {
  const { sessionId } = await createSession(request);
  const added = await checkedJson<AddIdeasResponse>(await request.post(`/api/sessions/${sessionId}/ideas`, {
    data: { texts: ["Keep this sticky", "Remove this sticky"], source: "typed" },
    timeout: 60_000,
  }));
  const removed = added.ideas.find(i => i.text === "Remove this sticky");
  expect(removed).toBeTruthy();
  await checkedJson(await request.delete(`/api/ideas/${removed!.id}`));
  const current = await state(request, sessionId);
  expect(current.ideas.map(i => i.id)).not.toContain(removed!.id);
  expect(current.ideas.map(i => i.text)).toEqual(["Keep this sticky"]);
  const missing = await request.delete(`/api/ideas/${removed!.id}`);
  expect(missing.status()).toBe(404);
});

test("bridge question quotes ideas without a mid-word cut", async ({ request }) => {
  const { sessionId } = await createSession(request);
  const shortText = "Bike share for";
  const longText = "Quarterly sourdough baking contest judged by retired opera singers wearing medieval armor costumes";
  const added = await checkedJson<AddIdeasResponse>(await request.post(`/api/sessions/${sessionId}/ideas`, {
    data: { texts: [shortText, longText], source: "typed" },
    timeout: 60_000,
  }));
  const a = added.ideas.find(i => i.text === shortText)!;
  const b = added.ideas.find(i => i.text === longText)!;
  const bridged = await checkedJson<{ provocation: { text: string } | null }>(await request.post("/api/provocations/bridge", {
    data: { sessionId, a: a.id, b: b.id },
  }));
  expect(bridged.provocation).toBeTruthy();
  const text = bridged.provocation!.text;
  expect(text).toContain(`“${shortText}”`);
  const quoted = [...text.matchAll(/“([^”]+)”/g)].map(match => match[1]);
  expect(quoted.length).toBeGreaterThanOrEqual(2);
  for (const piece of quoted) {
    const source = piece.endsWith("…") ? piece.slice(0, -1) : piece;
    const idea = piece === shortText ? shortText : longText;
    expect(idea.startsWith(source)).toBe(true);
    const next = idea[source.length];
    expect(next === undefined || next === " ").toBe(true);
  }
});
