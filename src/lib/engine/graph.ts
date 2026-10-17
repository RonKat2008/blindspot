import { cosine } from "./score.ts";

// Short brainstorm phrases rarely exceed ~0.4 cosine with text-embedding-3-small; each idea still keeps only its top-2 links.
export const EDGE_MIN = 0.28;
export const CLUSTER_MIN = 0.36;
type GraphIdea = { id: string; embedding: number[] };

/** Union of each idea's two strongest neighbors; vectors stay server-side. */
export function graph(ideas: GraphIdea[]) {
  const neighbors = ideas.map(() => [] as { index: number; similarity: number }[]);
  for (let i = 0; i < ideas.length; i++) {
    for (let j = i + 1; j < ideas.length; j++) {
      const similarity = cosine(ideas[i].embedding, ideas[j].embedding);
      if (similarity >= EDGE_MIN) {
        neighbors[i].push({ index: j, similarity });
        neighbors[j].push({ index: i, similarity });
      }
    }
  }
  const edges: { a: string; b: string; similarity: number }[] = [];
  const seen = new Set<string>();
  neighbors.forEach((list, i) => {
    list.sort((a, b) => b.similarity - a.similarity || ideas[a.index].id.localeCompare(ideas[b.index].id));
    for (const { index: j, similarity } of list.slice(0, 2)) {
      const [a, b] = [ideas[i].id, ideas[j].id].sort();
      const key = JSON.stringify([a, b]);
      if (!seen.has(key)) { edges.push({ a, b, similarity }); seen.add(key); }
    }
  });
  edges.sort((a, b) => a.a.localeCompare(b.a) || a.b.localeCompare(b.b));
  const parent = new Map(ideas.map(i => [i.id, i.id]));
  const root = (id: string): string => {
    const p = parent.get(id)!;
    if (p === id) return id;
    const r = root(p); parent.set(id, r); return r;
  };
  const connected = new Set<string>();
  for (const { a, b, similarity } of edges) {
    connected.add(a); connected.add(b);
    if (similarity >= CLUSTER_MIN) parent.set(root(b), root(a));
  }
  const groups = new Map<string, string[]>();
  for (const idea of ideas) {
    const r = root(idea.id);
    const members = groups.get(r) ?? []; members.push(idea.id); groups.set(r, members);
  }
  const clusters = [...groups.values()].filter(ids => ids.length > 1).map(ids => {
    const ideaIds = ids.sort(); return { id: ideaIds[0], ideaIds };
  }).sort((a, b) => a.id.localeCompare(b.id));
  return { edges, clusters, islands: ideas.filter(i => !connected.has(i.id)).map(i => i.id) };
}
