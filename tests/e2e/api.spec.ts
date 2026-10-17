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
