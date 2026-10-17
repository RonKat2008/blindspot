import { test, expect, type Page } from "@playwright/test";
import { createSession, visit } from "./helpers";

async function noOverflow(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  const widths = await page.evaluate(() => ({ document: document.documentElement.scrollWidth, viewport: innerWidth }));
  expect(widths.viewport).toBe(375);
  expect(widths.document, `Page overflows at 375px: ${JSON.stringify(widths)}`).toBeLessThanOrEqual(widths.viewport);
}

test("mobile landing fits 375px", async ({ page }) => {
  await visit(page, "/");
  await expect(page.locator("h1").first()).toBeVisible();
  await noOverflow(page);
});

test("mobile join fits 375px through role selection", async ({ page, request }) => {
  const { sessionId } = await createSession(request);
  await visit(page, `/join/${sessionId}`);
  await expect(page.getByRole("heading", { name: "Pull up a sticky." })).toBeVisible();
  await noOverflow(page);
  await page.getByLabel("What should we call you?").fill("E2E participant");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByRole("heading", { name: /How do you want to help/ })).toBeVisible();
  await noOverflow(page);
});
