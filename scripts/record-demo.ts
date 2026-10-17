import { chromium, type Page } from "@playwright/test";
import { spawnSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

type Segment = "demo" | "tour" | "live";
const segments: Segment[] = ["demo", "tour", "live"];
const size = { width: 1920, height: 1080 };
const out = resolve("out/video");
const args = process.argv.slice(2);
let base = "http://localhost:3000";
let selected = segments;
for (let i = 0; i < args.length; i++) {
  const flag = args[i];
  if (flag === "--help") {
    console.log("npm run record -- [--base http://localhost:3000] [--only demo|tour|live]");
    process.exit(0);
  }
  const value = args[++i];
  if (flag === "--base" && value) base = value;
  else if (flag === "--only" && segments.includes(value as Segment)) selected = [value as Segment];
  else throw new Error(`Invalid argument: ${flag}. Use --help.`);
}
const origin = new URL(base);
if (!["http:", "https:"].includes(origin.protocol)) throw new Error("--base must be an HTTP(S) URL");
const url = (path: string) => new URL(path, origin).href;
const pause = (ms: number) => new Promise<void>((done) => setTimeout(done, ms));

async function live(page: Page) {
  const prompt = page.getByPlaceholder("What are we brainstorming?");
  await prompt.waitFor();
  await prompt.pressSequentially("How might we make our campus greener?", { delay: 60 });
  const created = page.waitForResponse((res) => res.request().method() === "POST" && new URL(res.url()).pathname === "/api/sessions");
  await prompt.press("Enter");
  if (!(await created).ok()) throw new Error("Session creation failed; check local environment and API credentials");
  await page.locator('button[title="We place each idea somewhere between these two ends. Click to edit."]').first().waitFor({ timeout: 60_000 });
  const skip = page.getByRole("button", { name: "Skip tour", exact: true });
  if (await skip.isVisible()) await skip.click();
  const board = page.getByRole("application", { name: "Whiteboard. Click to add a sticky note.", exact: true });
  await board.waitFor();
  const ideas = [
    "Install more recycling bins near lecture halls",
    "Put recycling bins outside every classroom",
    "Add clearly labeled recycling bins in the library",
    "Place recycling bins beside every campus cafe",
    "Provide recycling bins in every student residence",
    "Add recycling stations at every campus entrance",
  ];
  for (const [i, text] of ideas.entries()) {
    await board.click({ position: { x: 170 + (i % 3) * 340, y: 120 + Math.floor(i / 3) * 240 } });
    const draft = page.getByRole("textbox", { name: "New idea", exact: true });
    await draft.waitFor();
    await draft.pressSequentially(text, { delay: 60 });
    const posted = page.waitForResponse((res) => res.request().method() === "POST" && /\/api\/sessions\/[^/]+\/ideas$/.test(new URL(res.url()).pathname));
    await draft.press("Enter");
    if (!(await posted).ok()) throw new Error(`Could not save sticky ${i + 1}`);
    await draft.waitFor({ state: "detached" });
    await pause(300); // Give the viewer a beat between human actions.
  }
  await page.locator('[data-tour="question-note"], [aria-label="A question for you"]').first().waitFor({ timeout: 120_000 });
  await pause(2000);
  // Blur the last input without clicking the board (which would create another note).
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.keyboard.press("l");
  await page.getByRole("application", { name: "Lens view of your ideas", exact: true }).waitFor();
  await page.getByRole("button", { name: "Empty corner — nobody's been here yet", exact: true }).first().hover();
  await pause(4000);
}

function ffmpeg(args: string[]) {
  const result = spawnSync("ffmpeg", args, { stdio: "inherit" });
  if (result.error || result.status !== 0) throw result.error ?? new Error(`ffmpeg exited ${result.status}`);
}

async function main() {
  await mkdir(out, { recursive: true });
  const run = new Date().toISOString().replace(/[:.]/g, "-");
  const runDir = resolve(out, run);
  await mkdir(runDir, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const results: { segment: Segment; status: string; seconds: number; webm?: string; mp4?: string; error?: string }[] = [];
  let failed = false;
  try {
    for (const segment of selected) {
      console.log(`Recording ${segment} at 1920×1080…`);
      const context = await browser.newContext({ viewport: size, deviceScaleFactor: 1, recordVideo: { dir: runDir, size } });
      context.setDefaultTimeout(30_000);
      context.setDefaultNavigationTimeout(60_000);
      const page = await context.newPage();
      const video = page.video()!;
      const started = Date.now();
      const result: (typeof results)[number] = { segment, status: "complete", seconds: 0 };
      try {
        const response = await page.goto(url(segment === "live" ? "/new" : `/${segment}?autoplay=1`));
        if (segment === "tour" && response?.status() === 404) {
          result.status = "skipped";
          console.warn("/tour is not deployed (404); skipping it.");
        } else {
          if (!response?.ok()) throw new Error(`Navigation failed: HTTP ${response?.status()}`);
          if (segment === "live") await live(page);
          else {
            const end = segment === "demo"
              ? page.locator('[data-tour="wrap-up"]')
              : page.getByRole("main").getByText("That's the tour", { exact: true });
            // A stalled autoplay fails after 120s; its partial video is retained.
            await end.waitFor({ timeout: 120_000 });
            await pause(4000); // Hold the ledger/end card long enough to read.
          }
        }
      } catch (error) {
        failed = true;
        result.status = "failed";
        result.error = error instanceof Error ? error.message : String(error);
        console.error(`${segment}: ${result.error}`);
      } finally {
        await context.close(); // Flush the video before saving or transcoding.
        result.seconds = Math.round((Date.now() - started) / 100) / 10;
        if (result.status === "skipped") await video.delete();
        else {
          result.webm = resolve(runDir, `${segment}${result.status === "failed" ? "-partial" : ""}.webm`);
          await video.saveAs(result.webm);
          await video.delete();
        }
        results.push(result);
      }
    }
  } finally {
    await browser.close();
    await writeFile(resolve(runDir, "manifest.json"), JSON.stringify({ base, results }, null, 2));
  }
  const available = spawnSync("ffmpeg", ["-version"], { stdio: "ignore" }).status === 0;
  if (available) {
    const complete = results.filter((r) => r.status === "complete");
    for (const result of complete) {
      result.mp4 = resolve(runDir, `${result.segment}.mp4`);
      ffmpeg(["-y", "-i", result.webm!, "-an", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-r", "30", "-movflags", "+faststart", result.mp4]);
    }
    if (complete.length) {
      // Generated filenames are fixed ASCII basenames; no shell or concat escaping needed.
      const list = resolve(runDir, "concat.txt");
      await writeFile(list, complete.map((r) => `file '${r.segment}.mp4'`).join("\n") + "\n");
      const combined = resolve(out, "blindspot-demo.mp4");
      // Never publish a partial run under the submission filename.
      const destination = failed ? resolve(runDir, "incomplete-demo.mp4") : combined;
      ffmpeg(["-y", "-f", "concat", "-safe", "0", "-i", list, "-c", "copy", "-movflags", "+faststart", destination]);
      console.log(`Combined video: ${destination}`);
    }
  } else console.warn("ffmpeg not installed; WebM recordings are ready to use.");
  await writeFile(resolve(runDir, "manifest.json"), JSON.stringify({ base, results }, null, 2));
  for (const result of results) console.log(`${result.segment}: ${result.status}, ~${result.seconds}s${result.webm ? `\n  ${result.webm}` : ""}${result.mp4 ? `\n  ${result.mp4}` : ""}`);
  console.log(`Manifest: ${resolve(runDir, "manifest.json")}`);
  if (failed) process.exitCode = 1;
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
