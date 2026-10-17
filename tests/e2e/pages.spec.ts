import { test, expect } from "@playwright/test";
import { createSession, prompt, visit } from "./helpers";

test("landing renders its heading", async ({ page }) => {
  await visit(page, "/");
  await expect(page.locator("h1, [data-tour='question-heading']").first()).toBeVisible();
});

test("demo guide advances three steps", async ({ page }) => {
  await visit(page, "/demo");
  await page.getByRole("button", { name: "Guide me", exact: true }).click();
  const step = page.getByRole("dialog", { name: "Tour step", exact: true });
  await expect(step).toBeVisible();
  for (let index = 1; index <= 3; index++) {
    await expect(step).toContainText(new RegExp(`\\b${index} / \\d+`));
    await step.getByRole("button", { name: "Next", exact: true }).click();
    await expect(step).toContainText(new RegExp(`\\b${index + 1} / \\d+`));
  }
});

test("demo autoplay starts without the entry card", async ({ page }) => {
  await visit(page, "/demo?autoplay=1");
  await expect(page.getByRole("dialog", { name: "Tour step" })).toBeVisible();
  await expect(page.getByText("Space to pause", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Guide me", exact: true })).toHaveCount(0);
});

test("insights loads", async ({ page }) => {
  await visit(page, "/insights");
  await expect(page).toHaveTitle(/Insights/);
  await expect(page.getByRole("heading").first()).toBeVisible();
});

test("pitch advances with ArrowRight", async ({ page }) => {
  await visit(page, "/pitch");
  await expect(page.getByRole("main", { name: /^Slide 1:/ })).toBeVisible();
  // A functional control click also ensures hydration before the keyboard check.
  await page.getByRole("button", { name: /^Go to slide 1:/ }).click();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("main", { name: /^Slide 2:/ })).toBeVisible();
});

test("fresh session join and ambient pages load", async ({ page, request }) => {
  const { sessionId } = await createSession(request);
  await visit(page, `/join/${sessionId}`);
  await expect(page.getByRole("heading", { name: "Pull up a sticky." })).toBeVisible();
  await expect(page.getByLabel("What should we call you?")).toBeVisible();
  await visit(page, `/ambient/${sessionId}`);
  await expect(page.getByText("Listening to the room…", { exact: true })).toBeVisible();
  await expect(page.getByText(prompt, { exact: true })).toBeVisible();
});
