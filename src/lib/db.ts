import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Axis, Idea, Provocation, Session, SessionState } from "./contract";
import { diversity } from "./engine/diversity";
import { graph } from "./engine/graph";
import { pca2 } from "./engine/project";
import type { AxisWithEmbeddings } from "./engine/score";

export function db() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Database configuration missing");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
export type Database = ReturnType<typeof db>;
export type StoredIdea = Idea & { embedding: number[] };
export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export function check(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}
export function validId(id: string) {
  if (!z.uuid().safeParse(id).success) throw new HttpError(400, "Invalid identifier");
  return id;
}
export async function body<T>(request: Request, schema: z.ZodType<T>): Promise<T> {
  let value: unknown;
  try { value = await request.json(); } catch { throw new HttpError(400, "Invalid JSON body"); }
  const parsed = schema.safeParse(value);
  if (!parsed.success) throw new HttpError(400, parsed.error.issues.map(i => i.message).join("; "));
  return parsed.data;
}
export function failure(error: unknown): Response {
  if (error instanceof HttpError) return Response.json({ error: error.message }, { status: error.status });
  console.error("Backend request failed:", error instanceof Error ? error.message : "Unknown error");
  return Response.json({ error: "Unable to complete request. Please try again." }, { status: 500 });
}

type Row = Record<string, unknown>;
function vector(value: unknown): number[] { return typeof value === "string" ? JSON.parse(value) : value as number[]; }
export function mapAxis(row: Row): AxisWithEmbeddings {
  return { id: String(row.id), poleA: String(row.pole_a), poleB: String(row.pole_b), userEdited: Boolean(row.user_edited), position: Number(row.position), poleAEmbedding: vector(row.pole_a_embedding), poleBEmbedding: vector(row.pole_b_embedding) };
}
export function publicAxis(axis: AxisWithEmbeddings): Axis {
  return { id: axis.id, poleA: axis.poleA, poleB: axis.poleB, userEdited: axis.userEdited, position: axis.position };
}
export function mapIdea(row: Row): StoredIdea {
  return { id: String(row.id), text: String(row.text), source: row.source as Idea["source"], ...(row.speaker ? { speaker: String(row.speaker) } : {}), ...(row.device_id ? { deviceId: String(row.device_id) } : {}), axisScores: (row.axis_scores ?? {}) as Record<string, number>, createdAt: String(row.created_at), embedding: vector(row.embedding), ...(typeof row.board_x === "number" && typeof row.board_y === "number" ? { board: { x: row.board_x, y: row.board_y } } : {}), ...(typeof row.color === "string" ? { color: row.color } : {}), ...(row.kind === "assumption" || row.kind === "idea" ? { kind: row.kind } : {}), ...(typeof row.shortlisted === "boolean" ? { shortlisted: row.shortlisted } : {}), ...mapMedia(row) };
}
function mapMedia(row: Row): Pick<Idea, "mediaType" | "mediaUrl" | "mediaCaption"> {
  const type = row.media_type === "image" || row.media_type === "audio" || row.media_type === "link" ? row.media_type : null;
  if (!type || typeof row.media_url !== "string") return { mediaType: "text" };
  return { mediaType: type, mediaUrl: row.media_url, ...(typeof row.media_caption === "string" && row.media_caption ? { mediaCaption: row.media_caption } : {}) };
}
export function publicIdeas(ideas: StoredIdea[]): Idea[] {
  const coords = pca2(ideas.map(i => i.embedding));
  return ideas.map((idea, i) => ({ id: idea.id, text: idea.text, source: idea.source, speaker: idea.speaker, deviceId: idea.deviceId, axisScores: idea.axisScores, createdAt: idea.createdAt, board: idea.board, color: idea.color, kind: idea.kind, shortlisted: idea.shortlisted, mediaType: idea.mediaType, mediaUrl: idea.mediaUrl, mediaCaption: idea.mediaCaption, pca: coords[i] }));
}
export function mapProvocation(row: Row): Provocation {
  return { id: String(row.id), type: row.type as Provocation["type"], text: String(row.text), status: row.status as Provocation["status"], createdAt: String(row.created_at), why: { pattern: row.type as Provocation["type"], ideaIds: (row.idea_ids ?? []) as string[], ...(row.axis_id ? { axisId: String(row.axis_id) } : {}), explanation: String(row.why) } };
}
export async function loadSession(client: Database, id: string) {
  validId(id);
  const results = await Promise.all([
    client.from("sessions").select("*").eq("id", id).maybeSingle(),
    client.from("axes").select("*").eq("session_id", id).order("position"),
    client.from("ideas").select("*").eq("session_id", id).is("deleted_at", null).order("created_at").order("id"),
    client.from("provocations").select("*").eq("session_id", id).order("created_at").order("id"),
  ]);
  results.forEach(r => check(r.error));
  const row = results[0].data;
  if (!row) throw new HttpError(404, "Session not found");
  const session: Session = { id: row.id, prompt: row.prompt, teamName: row.team_name, createdAt: row.created_at };
  return { session, axes: (results[1].data ?? []).map(mapAxis), ideas: (results[2].data ?? []).map(mapIdea), provocations: (results[3].data ?? []).map(mapProvocation) };
}
export function metrics(ideas: StoredIdea[], axes: Axis[]) {
  const result = diversity(ideas.map(i => i.embedding), ideas.map(i => i.axisScores), axes.map(a => a.id));
  return { diversity: result.diversity, diversityBreakdown: result.breakdown };
}
export async function getState(client: Database, id: string): Promise<SessionState> {
  const data = await loadSession(client, id);
  return { session: data.session, axes: data.axes.map(publicAxis), ideas: publicIdeas(data.ideas), provocations: data.provocations, ...metrics(data.ideas, data.axes), ...graph(data.ideas) };
}
export async function saveScores(client: Database, ideas: StoredIdea[]) {
  // Only update score columns: never overwrite a concurrent contributor's text or metadata.
  const results = await Promise.all(ideas.map(i => client.from("ideas").update({ axis_scores: i.axisScores }).eq("id", i.id)));
  results.forEach(r => check(r.error));
}
