// Eval: 20 provocations over 4 fixture sessions; each is re-checked by regex + Haiku judge.
// Run: npx tsx --env-file=.env.local scripts/eval-provocations.ts
import type { Axis, DetectionSignal, Idea } from "../src/lib/contract";
import { judgeIsSafe, passesRegex, wordCount } from "../src/lib/prompts/guard";
import { writeProvocationGuarded } from "../src/lib/prompts/provocation";

type Spec = {
  name: string;
  prompt: string;
  axes: [string, string][];
  // [text, score per axis index]
  ideas: [string, number[]][];
  // [type, axisIndex|-1, side, idea indexes]
  signals: [DetectionSignal["type"], number, (-1 | 1)?, number[]?][];
};

const SPECS: Spec[] = [
  {
    name: "onboarding",
    prompt: "How might we make onboarding new students less overwhelming?",
    axes: [
      ["incremental", "radical"],
      ["individual", "social"],
      ["digital", "physical"],
      ["short-term", "long-term"],
    ],
    ideas: [
      ["Send a weekly checklist email to new students", [-0.8, -0.7, -0.6, -0.5]],
      ["Make the orientation PDF shorter and clearer", [-0.9, -0.6, -0.7, -0.4]],
      ["Add a FAQ chatbot to the school website", [-0.5, -0.8, -0.9, -0.3]],
      ["Put a progress bar in the student portal", [-0.7, -0.9, -0.8, -0.2]],
      ["Text reminders for deadlines", [-0.8, -0.8, -0.7, -0.6]],
      ["Weekly checklist emails but with a friendlier tone", [-0.8, -0.7, -0.6, -0.5]],
      ["Record a video tour of the portal", [-0.6, -0.6, -0.8, -0.3]],
      ["A single dashboard showing all first-month tasks", [-0.5, -0.9, -0.9, -0.4]],
    ],
    signals: [
      ["gap", 0, 1, [0, 1, 2, 3, 4]],
      ["fixation", -1, undefined, [0, 5, 4]],
      ["duplicate", -1, undefined, [0, 5]],
      ["abandoned", -1, undefined, [6]],
      ["unexplored", 3, undefined, []],
    ],
  },
  {
    name: "food-waste",
    prompt: "Reduce food waste in our school cafeteria",
    axes: [
      ["incremental", "radical"],
      ["product", "people"],
      ["individual", "community"],
      ["immediate", "long-term"],
      ["measured", "intuitive"],
    ],
    ideas: [
      ["Smaller default portion sizes on the tray line", [-0.7, -0.6, -0.5, -0.8, -0.2]],
      ["Weigh leftover trays and post the weekly total", [-0.4, -0.5, 0.1, -0.7, -0.9]],
      ["Let students pick half portions", [-0.8, -0.7, -0.6, -0.8, -0.1]],
      ["Compost bin by the exit", [-0.5, -0.9, -0.4, -0.3, 0.0]],
      ["Weigh trays and show a daily number on a screen", [-0.4, -0.6, 0.0, -0.8, -0.9]],
      ["Ask students to rate each lunch with a sticker", [-0.3, -0.2, 0.3, -0.9, -0.6]],
      ["Cut the menu to fewer items", [-0.6, -0.5, -0.5, -0.4, -0.3]],
      ["A class that runs the lunch line for a term", [0.7, 0.9, 0.8, 0.8, 0.5]],
      ["Leftover trays sold cheap at 1pm", [-0.2, -0.8, -0.3, -0.9, -0.4]],
    ],
    signals: [
      ["gap", 2, -1, [0, 2, 3, 6]],
      ["fixation", -1, undefined, [1, 4, 5]],
      ["duplicate", -1, undefined, [1, 4]],
      ["abandoned", -1, undefined, [7]],
      ["unexplored", 4, undefined, []],
    ],
  },
  {
    name: "lonely-seniors",
    prompt: "Help elderly neighbors feel less isolated",
    axes: [
      ["incremental", "radical"],
      ["individual", "social"],
      ["technology", "human contact"],
      ["short-term", "long-term"],
    ],
    ideas: [
      ["Weekly phone call from a volunteer", [-0.6, -0.4, 0.8, -0.5]],
      ["Tablet preloaded with video calling for each senior", [-0.5, -0.6, -0.9, -0.4]],
      ["Doorstep notes from kids at the elementary school", [-0.4, 0.2, 0.7, -0.6]],
      ["Smart speaker that reminds them to call family", [-0.7, -0.9, -0.9, -0.3]],
      ["Printed neighborhood newsletter with local news", [-0.6, 0.0, 0.1, -0.2]],
      ["Video-call lessons on how to use the tablet", [-0.5, -0.7, -0.8, -0.4]],
      ["Tablet video-calling setup days at the library", [-0.5, -0.5, -0.8, -0.4]],
      ["Pen pal letters with a student", [-0.3, -0.5, 0.6, -0.3]],
      ["A monthly porch-light check: lit means okay", [0.4, 0.3, 0.8, 0.9]],
    ],
    signals: [
      ["gap", 0, 1, [0, 1, 2, 3, 4, 5]],
      ["fixation", -1, undefined, [1, 5, 6]],
      ["duplicate", -1, undefined, [1, 6]],
      ["abandoned", -1, undefined, [8]],
      ["unexplored", 3, undefined, []],
    ],
  },
  {
    name: "transit",
    prompt: "Make our city's bus system something people actually choose over driving",
    axes: [
      ["incremental", "radical"],
      ["rider", "operator"],
      ["service", "infrastructure"],
      ["quick win", "long-term"],
      ["technology", "behavior"],
    ],
    ideas: [
      ["Real-time arrival screens at the 10 busiest stops", [-0.6, -0.8, 0.0, -0.8, -0.9]],
      ["A better route-planning app with live delays", [-0.5, -0.9, -0.5, -0.7, -0.9]],
      ["Contactless tap-to-pay on every bus", [-0.7, -0.7, -0.4, -0.6, -0.8]],
      ["Cleaner bus interiors on weekends", [-0.8, -0.8, -0.8, -0.9, 0.1]],
      ["Text alerts when a route is delayed", [-0.6, -0.9, -0.6, -0.8, -0.9]],
      ["Bus-stop benches with shelter", [-0.7, -0.6, 0.9, -0.2, -0.1]],
      ["Drivers wear a name badge and greet riders", [-0.6, 0.2, -0.9, -0.7, 0.8]],
      ["Free rides one day a month", [-0.3, -0.5, -0.8, -0.9, 0.7]],
    ],
    signals: [
      ["gap", 0, 1, [0, 1, 2, 3, 4, 5]],
      ["fixation", -1, undefined, [0, 1, 4]],
      ["duplicate", -1, undefined, [1, 4]],
      ["abandoned", -1, undefined, [6]],
      ["unexplored", 2, undefined, []],
    ],
  },
];

function build(spec: Spec): { axes: Axis[]; ideas: Idea[]; signals: DetectionSignal[] } {
  const axes: Axis[] = spec.axes.map(([a, b], i) => ({
    id: `ax${i}`,
    poleA: a,
    poleB: b,
    userEdited: false,
    position: i,
  }));
  const ideas: Idea[] = spec.ideas.map(([text, scores], i) => ({
    id: `i${i}`,
    text,
    source: "typed",
    axisScores: Object.fromEntries(scores.map((s, j) => [`ax${j}`, s])),
    createdAt: new Date(2026, 0, 1, 12, i).toISOString(),
  }));
  const signals: DetectionSignal[] = spec.signals.map(([type, axisIdx, side, idxs]) => ({
    type,
    strength: 0.8,
    axisId: axisIdx >= 0 ? `ax${axisIdx}` : undefined,
    side,
    ideaIds: (idxs ?? []).map((n) => `i${n}`),
  }));
  return { axes, ideas, signals };
}

async function main(): Promise<void> {
  let pass = 0;
  let total = 0;
  let llm = 0;
  for (const spec of SPECS) {
    const { axes, ideas, signals } = build(spec);
    console.log(`\n=== ${spec.name}: ${spec.prompt}`);
    const results = await Promise.all(
      signals.map((s) => writeProvocationGuarded(s, ideas, axes, spec.prompt)),
    );
    for (let k = 0; k < results.length; k++) {
      const r = results[k];
      total++;
      if (r.source === "llm") llm++;
      let ok = passesRegex(r.text) && passesRegex(r.why.explanation) && wordCount(r.text) < 30;
      let reason = ok ? "" : "regex/length";
      if (ok) {
        try {
          const v = await judgeIsSafe(r.text, ideas.map((i) => i.text));
          ok = v.safe;
          reason = v.reason;
        } catch (e) {
          ok = false;
          reason = `judge error: ${e instanceof Error ? e.message : String(e)}`;
        }
      }
      if (ok) pass++;
      console.log(
        `[${ok ? "PASS" : "FAIL"}] ${signals[k].type.padEnd(10)} (${r.source}, try ${r.attempts}) ${r.text}`,
      );
      console.log(`        why: ${r.why.explanation}${ok ? "" : `\n        reason: ${reason}`}`);
    }
  }
  console.log(`\nPass rate: ${pass}/${total}  |  LLM-authored (not template): ${llm}/${total}`);
  process.exitCode = pass >= 19 ? 0 : 1;
}

void main();
