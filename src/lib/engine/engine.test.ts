import { test } from "node:test";
import assert from "node:assert/strict";
import { cosine, scoreIdea, scoreIdeas, SCORE_SCALE } from "./score.ts";
import { detect } from "./detect.ts";
import { diversity } from "./diversity.ts";
import { axisPair, pca2 } from "./project.ts";

const axis = { id: "axis", poleA: "a", poleB: "b", position: 0, userEdited: false };
const basis = (i: number, d = 6) => Array.from({ length: d }, (_, k) => Number(k === i));
const idea = (embedding: number[], i: number, score = 0) => ({ id: `idea-${i}`, embedding, axisScores: { axis: score }, createdAt: new Date(i * 1000).toISOString() });

test("cosine handles zero vectors, opposites, and dimension errors", () => {
  assert.equal(cosine([0,0], [1,0]), 0);
  assert.equal(cosine([1,0], [-1,0]), -1);
  assert.throws(() => cosine([1], [1,0]));
});
test("scores follow pole direction independently of the population", () => {
  const axes = [{ ...axis, poleAEmbedding: [1,0], poleBEmbedding: [0,1] }];
  const scored = scoreIdeas([[1,0], [1,1], [0,1]], axes);
  assert.ok(scored[0].axis < 0);
  assert.equal(scored[1].axis, 0);
  assert.ok(scored[2].axis > 0);
  assert.equal(scoreIdeas([[1,0]], axes)[0].axis, -1);
  assert.equal(scoreIdeas([], axes).length, 0);
  assert.deepEqual(scoreIdea([1,1], axes), scored[1]);
  const weakIdea = [1, 1.02];
  const raw = cosine(weakIdea, [0,1]) - cosine(weakIdea, [1,0]);
  assert.equal(scoreIdea(weakIdea, axes).axis, raw / SCORE_SCALE);
  assert.equal(scoreIdeas([weakIdea], axes)[0].axis, scoreIdeas([[1,0], weakIdea, [0,1]], axes)[1].axis);
});
test("gap identifies the empty end and references crowded ideas", () => {
  const result = detect({ ideas: [0,1,2,3,4].map(i => idea(basis(i), i, -0.8)), axes: [axis] });
  assert.equal(result?.type, "gap"); assert.equal(result?.side, 1); assert.equal(result?.ideaIds.length, 5);
});
test("duplicate detects near-identical vectors", () => {
  assert.equal(detect({ ideas: [idea([1,0], 0), idea([1,0], 1), idea([0,1], 2)], axes: [] })?.type, "duplicate");
});
test("fixation identifies a tightly grouped recent window", () => {
  const ideas = Array.from({ length: 5 }, (_, i) => idea([Math.sqrt(.85), ...basis(i).map(v => v * Math.sqrt(.15))], i));
  assert.equal(detect({ ideas, axes: [] })?.type, "fixation");
});
test("abandoned identifies an old isolated idea", () => {
  const result = detect({ ideas: [0,1,2,3,4,5].map(i => idea(basis(i), i)), axes: [] });
  assert.equal(result?.type, "abandoned"); assert.deepEqual(result.ideaIds, ["idea-0"]);
});
test("unexplored identifies neutral axes and cooldown forbids immediate repetition", () => {
  const ideas = [0,1,2].map(i => idea(basis(i), i));
  assert.equal(detect({ ideas, axes: [axis] })?.type, "unexplored");
  assert.equal(detect({ ideas, axes: [axis], lastType: "unexplored" }), null);
});
test("balanced ideas and small sessions do not trigger detection", () => {
  assert.equal(detect({ ideas: [idea(basis(0),0,-.8),idea(basis(1),1,0),idea(basis(2),2,.8)], axes: [axis] }), null);
  assert.equal(detect({ ideas: [idea([1],0),idea([1],1)], axes: [axis] }), null);
});
test("diversity rewards vector spread and both covered ends", () => {
  assert.equal(diversity([], [], ["axis"]).diversity, 0);
  assert.equal(diversity([[1,0],[1,0]], [{axis:-1},{axis:-1}], ["axis"]).diversity, 20);
  assert.equal(diversity([[1,0],[0,1],[-1,0],[0,-1]], [{axis:-1},{axis:-1},{axis:1},{axis:1}], ["axis"]).diversity, 100);
});
test("projection is deterministic, bounded, centered, and handles degenerate data", () => {
  assert.deepEqual(axisPair({a:.2},"a","b"), {x:.2,y:0});
  assert.deepEqual(pca2([[1],[2]]), [{x:0,y:0},{x:0,y:0}]);
  const data = [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0]];
  const points = pca2(data);
  assert.deepEqual(points, pca2(data));
  assert.ok(points.every(p => Number.isFinite(p.x) && Math.abs(p.x)<=1 && Math.abs(p.y)<=1));
  assert.ok(Math.abs(points.reduce((sum,p) => sum+p.x,0)) < 1e-9);
  assert.deepEqual(pca2([[1,1],[1,1],[1,1]]), [{x:0,y:0},{x:0,y:0},{x:0,y:0}]);
});

test("gap waits for five ideas and distinguishes neutral axes", () => {
  assert.equal(detect({ ideas: [0,1,2,3].map(i => idea(basis(i), i, -.8)), axes: [axis] }), null);
  assert.equal(detect({ ideas: [0,1,2,3,4].map(i => idea(basis(i), i)), axes: [axis] })?.type, "unexplored");
  const ideas = [0,1,2,3,4].map(i => idea(basis(i), i, i === 4 ? .8 : -.8));
  assert.equal(detect({ ideas, axes: [axis] })?.type, "gap");
});
