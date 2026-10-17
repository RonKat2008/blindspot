import { test } from "node:test";
import assert from "node:assert/strict";
import { UpdateIdeaBody } from "../contract.ts";

test("idea patch accepts metadata alone and keeps false values", () => {
  assert.deepEqual(UpdateIdeaBody.parse({ shortlisted: false }), { shortlisted: false });
  assert.deepEqual(UpdateIdeaBody.parse({ kind: "assumption" }), { kind: "assumption" });
  assert.ok(UpdateIdeaBody.safeParse({ board: { x: 0, y: -5 }, kind: "idea", shortlisted: true }).success);
});

test("idea patch rejects empty, unknown, malformed and unbounded updates", () => {
  for (const invalid of [{}, { text: "overwrite" }, { kind: "other" }, { shortlisted: "true" }, { board: { x: Infinity, y: 0 } }, { board: null }]) {
    assert.equal(UpdateIdeaBody.safeParse(invalid).success, false);
  }
});
