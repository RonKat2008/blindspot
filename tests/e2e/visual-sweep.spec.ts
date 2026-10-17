import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { test, expect, type Page } from "@playwright/test";
import { createSession } from "./helpers";

const OUT = path.join(process.cwd(), "out", "qa");

const widths = [
  { width: 375, height: 812 },
  { width: 1440, height: 900 },
] as const;

type Finding = {
  route: string;
  width: number;
  consoleErrors: string[];
  failedRequests: { url: string; status: number }[];
  overflow: boolean;
  scrollWidth: number;
  innerWidth: number;
  status: number | null;
  screenshot: string;
};

function slug(route: string, width: number) {
  const name = route === "/" ? "home" : route.replace(/^\//, "").replace(/[/?=&]/g, "-");
  return `${name}-${width}.png`;
}

async function sweep(page: Page, route: string, width: number, height: number): Promise<Finding> {
  const consoleErrors: string[] = [];
  const failedRequests: { url: string; status: number }[] = [];
  const onConsole = (msg: { type: () => string; text: () => string }) => {
    if (msg.type() === "error") consoleErrors.push(msg.text().slice(0, 400));
  };
  const onResponse = (res: { url: () => string; status: () => number }) => {
    const status = res.status();
    const url = res.url();
    if (status < 400) return;
    if (status === 401 && url.includes("/api/me")) return;
    failedRequests.push({ url, status });
  };
  page.on("console", onConsole);
  page.on("response", onResponse);
  await page.setViewportSize({ width, height });
  const response = await page.goto(route, { waitUntil: "networkidle", timeout: 60_000 }).catch(() => null);
  await page.waitForTimeout(400);
  const metrics = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));
  const file = slug(route, width);
  await page.screenshot({ path: path.join(OUT, file), fullPage: true });
  page.off("console", onConsole);
  page.off("response", onResponse);
  return {
    route,
    width,
    consoleErrors,
    failedRequests,
    overflow: metrics.scrollWidth > metrics.innerWidth + 1,
    scrollWidth: metrics.scrollWidth,
    innerWidth: metrics.innerWidth,
    status: response?.status() ?? null,
    screenshot: `out/qa/${file}`,
  };
}

test("visual QA sweep of production routes", async ({ page, request }) => {
  mkdirSync(OUT, { recursive: true });
  const created = await createSession(request);
  const id = created.sessionId;
  const routes = [
    "/",
    "/new",
    "/demo",
    "/tour",
    "/tour?mode=guided",
    "/why",
    "/pitch",
    "/insights",
    "/boards",
    "/login",
    `/invite/${id}`,
    `/s/${id}`,
    `/join/${id}`,
    `/ambient/${id}`,
    "/qa-missing-route",
  ];

  const findings: Finding[] = [];
  for (const size of widths) {
    for (const route of routes) {
      findings.push(await sweep(page, route, size.width, size.height));
    }
  }
  writeFileSync(path.join(OUT, "findings.json"), JSON.stringify(findings, null, 2));
  expect(findings.length).toBe(routes.length * widths.length);
});
