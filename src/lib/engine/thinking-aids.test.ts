import { test } from "node:test";
import assert from "node:assert/strict";
import { detect, detectAssumption, detectBridge, detectShortlist, detectVoice } from "./detect.ts";
import { templateExtra } from "./templates-extra.ts";
import type { Idea, DetectionSignal } from "../contract";

const axis = { id: "axis", poleA: "a", poleB: "b", position: 0, userEdited: false };
const idea = (n: number, score = .3, speaker = "Ada") => ({
  id: `idea-${n}`, text: `Our own phrase ${n}`, source: "typed" as const,
  speaker, kind: "idea" as Idea["kind"], shortlisted: false,
  axisScores: { axis: score }, createdAt: new Date(n * 1000).toISOString(),
  embedding: Array.from({ length: 8 }, (_, k) => Number(k === n)),
});

test("voice requires two known participants, three cards and at least 75% at an end", () => {
  const ideas = [idea(0), idea(1), idea(2), idea(3, .3, "Bo")];
  const signal = detectVoice(ideas, [axis]);
  assert.equal(signal?.type, "voice");
  assert.equal(signal?.speaker, "Ada");
  assert.deepEqual(signal?.ideaIds, ideas.map(i => i.id));
  assert.equal(detectVoice(ideas.slice(0, 3), [axis]), null);
  assert.equal(detectVoice([idea(0), idea(1), idea(2, .3, "Bo")], [axis]), null);
  assert.equal(detectVoice([idea(0), idea(1), idea(2, 0, "Bo")], [axis]), null);
  assert.equal(detectVoice([idea(0), idea(1), { ...idea(2), speaker: undefined }], [axis]), null);
  assert.ok(detectVoice([idea(0), idea(1), idea(2), idea(3, -.3, "Bo")], [axis]));
});

test("voice falls back to device identity and handles the negative pole", () => {
  const ideas = [0, 1, 2, 3].map(n => ({ ...idea(n, -.8), speaker: undefined, deviceId: n === 3 ? "device-b" : "device-a" }));
  assert.equal(detectVoice(ideas, [axis])?.speaker, "device-a");
  assert.equal(detectVoice(ideas, [axis])?.side, -1);
});

test("shortlist requires three selected cards, all beyond the inclusive same-pole threshold", () => {
  const selected = [0, 1, 2].map(n => ({ ...idea(n), shortlisted: true }));
  assert.equal(detectShortlist([...selected, idea(3, -.8)], [axis])?.type, "shortlist");
  assert.equal(detectShortlist(selected.slice(0, 2), [axis]), null);
  assert.equal(detectShortlist([...selected, { ...idea(3, -.3), shortlisted: true }], [axis]), null);
  assert.equal(detectShortlist([...selected, { ...idea(3, .29), shortlisted: true }], [axis]), null);
  assert.equal(detectShortlist(selected.map(i => ({ ...i, axisScores: { axis: -.3 } })), [axis])?.side, -1);
});

test("assumption converts fixation for metadata-aware callers and waits for four later cards", () => {
  const ideas = [0, 1, 2, 3, 4].map(n => ({ ...idea(n), embedding: [Math.sqrt(.85), ...Array.from({ length: 5 }, (_, k) => Number(k === n) * Math.sqrt(.15))] }));
  assert.equal(detect({ ideas, axes: [] })?.type, "assumption");
  assert.equal(detectAssumption(ideas), null);
  const card = { ...idea(0), kind: "assumption" as const };
  assert.equal(detectAssumption([card, idea(1), idea(2), idea(3)]), null);
  assert.deepEqual(detectAssumption([card, ...ideas.slice(1)])?.ideaIds, [card.id]);
  assert.equal(detectAssumption([card, ...ideas.slice(1), { ...idea(5), kind: "assumption" }]), null);
  assert.equal(detectAssumption([card, ...[1, 2, 3, 4].map(n => ({ ...idea(n), createdAt: card.createdAt }))]), null);
});

test("thinking aids run on detection and obey the same-type cooldown", () => {
  const ideas = [0, 1, 2].map(n => ({ ...idea(n), shortlisted: true }));
  assert.equal(detect({ ideas, axes: [axis] })?.type, "shortlist");
  assert.equal(detect({ ideas, axes: [axis], lastType: "shortlist" }), null);
  const voices = [...ideas.map(i => ({ ...i, shortlisted: false })), idea(3, -.3, "Bo")];
  assert.equal(detect({ ideas: voices, axes: [axis] })?.type, "voice");
  assert.equal(detect({ ideas: voices, axes: [axis], lastType: "voice" }), null);
});

test("bridge ignores direction of AI edges and rejects self links", () => {
  assert.deepEqual(detectBridge("a", "b", [])?.ideaIds, ["a", "b"]);
  assert.equal(detectBridge("a", "b", [{ a: "b", b: "a" }]), null);
  assert.equal(detectBridge("a", "b", [{ a: "a", b: "b" }]), null);
  assert.equal(detectBridge("a", "a", []), null);
  assert.equal(detectBridge(idea(0), idea(1), [])?.type, "bridge");
});

test("extra templates quote human text and remain questions of at most 22 words", () => {
  const ideas = [idea(0), idea(1)];
  ideas[0].text = "our many user supplied words that should never make a template too long";
  for (const type of ["bridge", "voice", "shortlist", "assumption"] as const) {
    const signal: DetectionSignal = { type, strength: 1, ideaIds: ideas.map(i => i.id) };
    for (const kind of ["idea", "assumption"] as const) {
      const result = templateExtra(signal, ideas.map(i => ({ ...i, kind })))!;
      assert.ok(result.text.endsWith("?"));
      assert.ok(result.text.split(/\s+/u).length <= 22, result.text);
      assert.ok(result.text.includes("“our many user”"));
      assert.deepEqual(result.why.ideaIds, signal.ideaIds);
    }
  }
  assert.equal(templateExtra({ type: "gap", strength: 1, ideaIds: [ideas[0].id] }, ideas), null);
});

test("assumption flip is prioritized and cools down on consecutive runs", () => {
  const ideas = [0, 1, 2, 3, 4].map(n => ({ ...idea(n, 0), kind: n === 0 ? "assumption" as const : "idea" as const }));
  assert.equal(detect({ ideas, axes: [] })?.type, "assumption");
  assert.equal(detect({ ideas, axes: [], lastType: "assumption" }), null);
});
