import { test } from "node:test";
import assert from "node:assert/strict";
import { graph, EDGE_MIN } from "./graph.ts";
const idea = (id: string, embedding: number[]) => ({ id, embedding });

test("empty and unrelated ideas are islands, with no singleton clusters", () => {
  assert.deepEqual(graph([]), { edges: [], clusters: [], islands: [] });
  const result = graph([idea("a", [1, 0]), idea("b", [0, 1]), idea("zero", [0, 0])]);
  assert.deepEqual(result.islands, ["a", "b", "zero"]);
  assert.deepEqual(result.clusters, []);
  assert.deepEqual(result.edges, []);
});
test("deduplicates neighbors and groups transitive strong connections", () => {
  const result = graph([idea("a", [1, 0, 0]), idea("b", [0.8, 0.6, 0]), idea("c", [0, 1, 0]), idea("island", [0, 0, 1])]);
  assert.equal(result.edges.length, 2);
  assert.deepEqual(result.clusters, [{ id: "a", ideaIds: ["a", "b", "c"] }]);
  assert.deepEqual(result.islands, ["island"]);
  assert.ok(result.edges.every(e => e.a !== e.b && e.similarity >= EDGE_MIN));
});
test("weak edges connect ideas without clustering them", () => {
  const result = graph([idea("a", [1, 0]), idea("b", [0.32, Math.sqrt(1 - 0.32 ** 2)])]);
  assert.equal(result.edges.length, 1);
  assert.deepEqual(result.clusters, []);
  assert.deepEqual(result.islands, []);
});
test("eight similar ideas yield a sparse stable graph with top two neighbors", () => {
  const ideas = Array.from({ length: 8 }, (_, i) => idea(String(i), [Math.cos(i * 0.1), Math.sin(i * 0.1)]));
  const result = graph(ideas);
  assert.ok(result.edges.length >= 6 && result.edges.length <= 12);
  assert.deepEqual(graph([...ideas].reverse()).edges, result.edges);
  assert.equal(new Set(result.edges.map(e => `${e.a}:${e.b}`)).size, result.edges.length);
});
