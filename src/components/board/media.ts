import type { AddIdeasResponse, Axis, Idea, SessionState } from "@/lib/contract";

export type MediaType = "image" | "audio";
/** Ideas may carry media once the media backend lands; all fields optional. */
export type PointMediaType = MediaType | "link";
export type MediaIdea = Omit<Idea, "mediaType"> & { mediaType?: PointMediaType; mediaUrl?: string; mediaCaption?: string };

export type RelatedIdea = { id: string; text: string; similarity: number; why?: string };
export type LensLeaning = { axisId: string; poleA: string; poleB: string; score: number };
export type Related = {
  nearest: RelatedIdea[];
  farthest: RelatedIdea[];
  lensLeanings: LensLeaning[];
  questions: { id: string; text: string }[];
};

async function json<T>(res: Response): Promise<T> {
  const data = (await res.json().catch(() => null)) as (T & { error?: string }) | null;
  if (!res.ok || !data) throw new Error(data?.error ?? `Request failed (${res.status})`);
  return data;
}

const MAX_EDGE = 1600;

/** Vercel caps bodies near 4.5MB: images go up as ≤1600px JPEG. Audio is sent as-is. */
async function downscale(file: Blob): Promise<Blob> {
  if (!file.type.startsWith("image/") || file.type === "image/gif") return file;
  try {
    const bitmap = await createImageBitmap(file);
    const ratio = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * ratio);
    canvas.height = Math.round(bitmap.height * ratio);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const out = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.8));
    return out ?? file;
  } catch {
    return file;
  }
}

export async function uploadMedia(file: Blob, sessionId: string, name: string): Promise<{ url: string; mediaType: MediaType }> {
  const form = new FormData();
  const body = await downscale(file);
  form.append("file", body, body === file ? name : name.replace(/\.[a-z0-9]+$/i, "") + ".jpg");
  form.append("sessionId", sessionId);
  return json(await fetch("/api/media/upload", { method: "POST", body: form }));
}

export async function describeMedia(url: string, mediaType: MediaType): Promise<string> {
  const res = await fetch("/api/media/describe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url, mediaType }),
  });
  const data = await json<{ caption: string }>(res);
  return data.caption;
}

export async function addMediaIdea(
  sessionId: string,
  item: { text: string; mediaType: PointMediaType; mediaUrl: string; caption: string },
): Promise<AddIdeasResponse> {
  const res = await fetch(`/api/sessions/${encodeURIComponent(sessionId)}/ideas`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      texts: [item.text === item.caption ? "" : item.text],
      source: item.mediaType === "audio" ? "voice" : item.mediaType === "image" ? "photo" : "typed",
      media: [{ mediaType: item.mediaType, mediaUrl: item.mediaUrl, caption: item.caption }],
    }),
  });
  return json(res);
}

export async function deleteIdea(id: string): Promise<void> {
  const res = await fetch(`/api/ideas/${encodeURIComponent(id)}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
}

/** GET related; falls back to a client estimate from edges and lens scores. */
export async function fetchRelated(id: string, state: SessionState): Promise<Related> {
  try {
    const res = await fetch(`/api/ideas/${encodeURIComponent(id)}/related`, { cache: "no-store" });
    if (res.ok) return (await res.json()) as Related;
  } catch {
    // fall through to the local estimate
  }
  return localRelated(id, state);
}

function distance(a: Idea, b: Idea, axes: Axis[]): number {
  return Math.sqrt(axes.reduce((sum, ax) => sum + ((a.axisScores[ax.id] ?? 0) - (b.axisScores[ax.id] ?? 0)) ** 2, 0));
}

export function localRelated(id: string, state: SessionState): Related {
  const idea = state.ideas.find((i) => i.id === id);
  if (!idea) return { nearest: [], farthest: [], lensLeanings: [], questions: [] };
  const others = state.ideas.filter((i) => i.id !== id);
  const edges = (state.edges ?? []).filter((e) => e.a === id || e.b === id);
  const byId = new Map(state.ideas.map((i) => [i.id, i]));
  const fromEdges = edges
    .map((e) => ({ other: byId.get(e.a === id ? e.b : e.a), similarity: e.similarity }))
    .filter((x): x is { other: Idea; similarity: number } => Boolean(x.other))
    .sort((a, b) => b.similarity - a.similarity)
    .map((x) => ({ id: x.other.id, text: x.other.text, similarity: x.similarity }));
  const maxD = Math.max(0.001, Math.sqrt(state.axes.length * 4));
  const byDistance = others
    .map((o) => ({ id: o.id, text: o.text, similarity: 1 - distance(idea, o, state.axes) / maxD }))
    .sort((a, b) => b.similarity - a.similarity);
  return {
    nearest: (fromEdges.length ? fromEdges : byDistance).slice(0, 4),
    farthest: byDistance.slice(-2).reverse(),
    lensLeanings: state.axes.map((ax) => ({ axisId: ax.id, poleA: ax.poleA, poleB: ax.poleB, score: idea.axisScores[ax.id] ?? 0 })),
    questions: state.provocations.filter((p) => p.why.ideaIds.includes(id)).map((p) => ({ id: p.id, text: p.text })),
  };
}
