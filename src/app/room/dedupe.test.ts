import { test } from "node:test";
import assert from "node:assert/strict";
import { isSameNote, newNotesOnly, normalizeNote } from "./dedupe.ts";

test("normalizeNote strips punctuation, case and extra spaces", () => {
  assert.equal(normalizeNote("  Buddy-system, for NEW hires!! "), "buddy system for new hires");
});

test("isSameNote matches exact and near-identical notes only", () => {
  assert.ok(isSameNote("Buddy system for new hires", "buddy system for new hires."));
  assert.ok(isSameNote("A buddy system for new hires", "buddy system for new hires"));
  assert.ok(!isSameNote("Buddy system for new hires", "Remote onboarding kit"));
  assert.ok(!isSameNote("", ""));
});

test("newNotesOnly drops board duplicates and repeats within the batch", () => {
  const out = newNotesOnly(
    ["Buddy system for new hires!", "Free lunch on day one", "free lunch on day one", "  ", "Ask newcomers to teach us"],
    ["buddy system for new hires"],
  );
  assert.deepEqual(out, ["Free lunch on day one", "Ask newcomers to teach us"]);
});
