// The live run: real session, real lenses, real ideas and photos, real question.
import { quadOf, type QuadKey } from "@/components/board/board-utils";
import { api } from "@/lib/api-client";
import type { SessionState } from "@/lib/contract";
import { $, buttonWithText, Director, pickImage, pressEnter, stickyWithText } from "./director";

export const LIVE_PROMPT = "How might we make a new hire's first week great?";

export const SAFE_IDEAS = [
  "Shorter signup form",
  "Welcome email with three tips",
  "Progress checklist in the app",
  "Skip button on the tutorial",
  "Short help videos",
  "Pre-filled sample project",
] as const;

export const GAP_IMAGE_LABEL = "Replace training with a community of past new hires who coach each cohort";
export const GAP_TEXT_IDEA = "Scrap the manual: new hires ship a real feature with the whole team on day one";

export type LiveStep = {
  id: string;
  caption: string;
  run: (d: Director, say: (caption: string) => void) => Promise<void>;
};

async function readState(): Promise<SessionState | null> {
  const m = window.location.pathname.match(/\/s\/([^/?#]+)/);
  if (!m) return null;
  try {
    return await api.getState(decodeURIComponent(m[1]));
  } catch {
    return null;
  }
}

/** Quadrants of the default Lens view (first two lenses, as the board picks them) with no ideas. */
function emptyQuads(st: SessionState): Set<QuadKey> {
  const [x, y] = st.axes;
  const empty = new Set<QuadKey>(["tl", "tr", "bl", "br"]);
  if (!x || !y) return new Set();
  for (const idea of st.ideas) empty.delete(quadOf(idea, x.id, y.id));
  return empty;
}

/** True when one of the answer ideas landed in a quadrant that was empty before. */
function filledEmptyCorner(before: Set<QuadKey>, after: SessionState | null, texts: readonly string[]): boolean {
  const [x, y] = after?.axes ?? [];
  if (!after || !x || !y || before.size === 0) return false;
  return after.ideas.some((i) => texts.includes(i.text) && before.has(quadOf(i, x.id, y.id)));
}

const MISSED = "Taking longer than usual, so we're moving on.";

function textareaBy(selector: string): HTMLTextAreaElement | null {
  return document.querySelector<HTMLTextAreaElement>(selector);
}

function lensButtons(): HTMLButtonElement[] {
  return Array.from(document.querySelectorAll<HTMLButtonElement>('[data-tour="lens-toggle"] button'));
}

async function setView(d: Director, view: "board" | "lens"): Promise<void> {
  const btn = lensButtons()[view === "board" ? 0 : 1];
  btn?.click();
  await d.sleep(900);
}

async function addText(d: Director, say: (c: string) => void, text: string): Promise<boolean> {
  // The board's one input bar: <form data-tour="add-sticky"><input id="bs-thought" /></form>.
  const box = await d.waitFor(() => {
    const el = document.querySelector<HTMLInputElement>("#bs-thought");
    return el && !el.disabled ? el : null;
  }, 8000);
  if (!box) return false;
  await d.type(box, text, 38);
  await d.sleep(250);
  const form = box.closest("form");
  if (form) form.requestSubmit();
  else pressEnter(box);
  const landed = await d.waitFor(() => stickyWithText(text), 20_000);
  if (!landed) say(MISSED);
  return Boolean(landed);
}

async function addImage(d: Director, say: (c: string) => void, url: string, name: string, label?: string): Promise<boolean> {
  const ok = await pickImage(url, name).catch(() => false);
  if (!ok) return false;
  const dialog = await d.waitFor(() => $('[role="dialog"][aria-label="Place an image"]'), 5000);
  if (!dialog) return false;
  const done = await d.waitFor(() => {
    const text = dialog.textContent ?? "";
    return text.includes("Described.") || text.includes("Couldn't read");
  }, 35_000);
  if (!done) say(MISSED);
  const field = textareaBy("#bs-media-label");
  await d.sleep(1600);
  if (label && field) {
    await d.type(field, label, 32);
    await d.sleep(400);
  }
  const placeBtn = await d.waitFor(() => buttonWithText("Place it", dialog), 3000);
  if (!placeBtn) {
    buttonWithText("Cancel", dialog)?.click();
    return false;
  }
  placeBtn.click();
  const placedText = label ?? field?.value ?? "";
  const landed = placedText ? await d.waitFor(() => stickyWithText(placedText), 20_000) : null;
  return Boolean(landed);
}

export const LIVE_STEPS: readonly LiveStep[] = [
  {
    id: "prompt",
    caption: "A fresh, real board. Typing the team's question.",
    async run(d, say) {
      const box = await d.waitFor(() => textareaBy("#bs-prompt"), 10_000);
      if (!box) return say(MISSED);
      await d.sleep(600);
      await d.type(box, LIVE_PROMPT, 45);
      await d.sleep(400);
      pressEnter(box);
    },
  },
  {
    id: "lenses",
    caption: "Blind Spot picks lenses for this problem: frames, not answers.",
    async run(d, say) {
      const ready = await d.waitFor(() => ($('[data-tour="lens-bar"]')?.textContent ?? "").includes("↔"), 40_000);
      if (!ready) return say(MISSED);
      await d.sleep(2500);
    },
  },
  {
    id: "ideas",
    caption: "The team adds ideas. Notice: all safe, all individual.",
    async run(d, say) {
      for (const [i, idea] of SAFE_IDEAS.entries()) {
        say(`The team adds ideas (${i + 1}/${SAFE_IDEAS.length}). All safe, all individual.`);
        await addText(d, say, idea);
        await d.sleep(600);
      }
    },
  },
  {
    id: "photos",
    caption: "Photos count too. The AI only describes them; a human places them.",
    async run(d, say) {
      await addImage(d, say, "/tour/sticky-wall.jpeg", "sticky-wall.jpeg");
      await d.sleep(800);
      await addImage(d, say, "/tour/phone-checklist.jpeg", "phone-checklist.jpeg");
    },
  },
  {
    id: "question",
    caption: "Waiting for Blind Spot to notice a pattern…",
    async run(d, say) {
      const note = await d.waitFor(() => $('[data-tour="question-note"]'), 20_000);
      if (!note) return say("No question this time: the spread was already wide. Moving on.");
      say("A question, not an idea.");
      await d.sleep(3000);
      note.querySelector<HTMLButtonElement>("button[aria-expanded]")?.click();
      say("“Why am I seeing this?” shows the exact pattern and notes behind it.");
      await d.sleep(5000);
    },
  },
  {
    id: "lens",
    caption: "Lens view: the shaded corner is where nobody has looked yet.",
    async run(d) {
      await setView(d, "lens");
      await d.sleep(5000);
    },
  },
  {
    id: "answer",
    caption: "A human answers the question, with a photo and a note.",
    async run(d, say) {
      const beforeState = await readState();
      const before = beforeState ? emptyQuads(beforeState) : new Set<QuadKey>();
      await setView(d, "board");
      await addImage(d, say, "/tour/buddy-pairing.jpeg", "buddy-pairing.jpeg", GAP_IMAGE_LABEL);
      await d.sleep(600);
      await addText(d, say, GAP_TEXT_IDEA);
      await d.sleep(800);
      await setView(d, "lens");
      const filled = filledEmptyCorner(before, await readState(), [GAP_IMAGE_LABEL, GAP_TEXT_IDEA]);
      say(filled ? "The human filled the empty corner." : "Back to Lens view: see where the human's answers land, and watch Range move.");
      await d.sleep(5500);
    },
  },
  {
    id: "inspect",
    caption: "Open any point: real connections, and why they're related.",
    async run(d, say) {
      const point = stickyWithText(GAP_IMAGE_LABEL) ?? stickyWithText(GAP_TEXT_IDEA);
      if (!point) return say(MISSED);
      point.click();
      await d.sleep(6500);
    },
  },
];
