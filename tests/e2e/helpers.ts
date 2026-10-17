import { expect, type APIRequestContext, type APIResponse, type Page } from "@playwright/test";
import type { CreateSessionResponse, SessionState } from "../../src/lib/contract";

export const prompt = "How might we make campus life better?";

export async function checkedJson<T>(response: APIResponse): Promise<T> {
  const text = await response.text();
  expect(response.ok(), `${response.url()}: ${response.status()} ${text}`).toBeTruthy();
  return JSON.parse(text) as T;
}

export async function createSession(request: APIRequestContext) {
  const created = await checkedJson<CreateSessionResponse>(await request.post("/api/sessions", {
    data: { prompt, teamName: "Playwright safety net" },
    timeout: 60_000,
  }));
  expect(created.sessionId).toBeTruthy();
  expect(created.axes.length).toBeGreaterThanOrEqual(4);
  return created;
}

export async function state(request: APIRequestContext, id: string) {
  return checkedJson<SessionState>(await request.get(`/api/sessions/${id}/state`));
}

export async function visit(page: Page, path: string) {
  const response = await page.goto(path);
  expect(response, `Navigation to ${path}`).not.toBeNull();
  expect(response!.ok(), `${path} returned ${response!.status()}`).toBeTruthy();
}
