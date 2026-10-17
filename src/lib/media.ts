// Media points: upload to the public `idea-media` bucket, describe images, transcribe audio.
// Product rule: the AI only describes or transcribes human-provided content. It never writes ideas.
import { generateText, transcribe } from "ai";
import { MEDIA_CAPTION_MAX } from "./contract";
import { HttpError, type Database } from "./db";
import { MAIN_MODEL } from "./ai";

export const MEDIA_BUCKET = "idea-media";
export const MEDIA_MAX_BYTES = 15 * 1024 * 1024;
export const TRANSCRIBE_MODEL = "openai/gpt-4o-mini-transcribe";
export const TRANSCRIBE_FALLBACK_MODEL = "openai/whisper-1";
const DESCRIBE_TIMEOUT_MS = 12_000;
const TRANSCRIBE_TIMEOUT_MS = 15_000;

const MIME_EXT: Readonly<Record<string, { ext: string; mediaType: "image" | "audio" }>> = {
  "image/png": { ext: "png", mediaType: "image" },
  "image/jpeg": { ext: "jpg", mediaType: "image" },
  "image/webp": { ext: "webp", mediaType: "image" },
  "image/gif": { ext: "gif", mediaType: "image" },
  "audio/webm": { ext: "webm", mediaType: "audio" },
  "audio/mp4": { ext: "m4a", mediaType: "audio" },
  "audio/mpeg": { ext: "mp3", mediaType: "audio" },
  "audio/ogg": { ext: "ogg", mediaType: "audio" },
  "audio/wav": { ext: "wav", mediaType: "audio" },
};

/** "audio/webm;codecs=opus" -> "audio/webm"; maps legacy wav aliases. */
export function baseMime(mime: string): string {
  const base = mime.split(";")[0].trim().toLowerCase();
  return base === "audio/x-wav" || base === "audio/wave" ? "audio/wav" : base;
}

export function mediaKind(mime: string) {
  return MIME_EXT[baseMime(mime)] ?? null;
}

function publicPrefix(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) throw new Error("Database configuration missing");
  return `${url.replace(/\/$/, "")}/storage/v1/object/public/${MEDIA_BUCKET}/`;
}

/** Only URLs in our own bucket are accepted (prevents SSRF and hot-linking arbitrary content). */
export function isOwnMediaUrl(url: string): boolean {
  try {
    const prefix = publicPrefix();
    return url.startsWith(prefix) && !url.slice(prefix.length).includes("..");
  } catch {
    return false;
  }
}

export async function uploadMedia(client: Database, sessionId: string, file: File) {
  const kind = mediaKind(file.type);
  if (!kind) throw new HttpError(415, "Unsupported file type. Use PNG, JPEG, WebP, GIF, or WebM/MP4/MP3/OGG/WAV audio.");
  if (file.size === 0) throw new HttpError(400, "File is empty");
  if (file.size > MEDIA_MAX_BYTES) throw new HttpError(413, "File is larger than 15 MB");
  const path = `${sessionId}/${crypto.randomUUID()}.${kind.ext}`;
  const { error } = await client.storage.from(MEDIA_BUCKET).upload(path, file, { contentType: baseMime(file.type), upsert: false });
  if (error) throw new Error(`Storage upload failed: ${error.message}`);
  return { url: client.storage.from(MEDIA_BUCKET).getPublicUrl(path).data.publicUrl, mediaType: kind.mediaType };
}

const DESCRIBE_INSTRUCTION =
  "Describe what is shown in one plain sentence (<= 20 words). Transcribe any visible text verbatim. Do not interpret, suggest, or add ideas.";

export async function describeImage(url: string): Promise<string> {
  const result = await generateText({
    model: MAIN_MODEL,
    maxRetries: 1,
    abortSignal: AbortSignal.timeout(DESCRIBE_TIMEOUT_MS),
    messages: [{ role: "user", content: [{ type: "text", text: DESCRIBE_INSTRUCTION }, { type: "file", mediaType: "image", data: new URL(url) }] }],
  });
  return clip(result.text);
}

export async function transcribeAudio(url: string): Promise<string> {
  const run = (model: string, ms: number) => transcribe({ model, audio: new URL(url), maxRetries: 0, abortSignal: AbortSignal.timeout(ms) });
  const startedAt = Date.now();
  let text: string;
  try {
    text = (await run(TRANSCRIBE_MODEL, TRANSCRIBE_TIMEOUT_MS)).text;
  } catch (error) {
    const left = TRANSCRIBE_TIMEOUT_MS - (Date.now() - startedAt);
    if (left < 2000) throw error;
    text = (await run(TRANSCRIBE_FALLBACK_MODEL, left)).text;
  }
  return clip(text);
}

export const DEMO_CAPTIONS = {
  image: "A hand-drawn whiteboard sketch with the words \"quiet study corner\" circled.",
  audio: "We keep talking about apps, but half the problem is that nobody knows where the free rooms are.",
} as const;

function clip(text: string): string {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length <= MEDIA_CAPTION_MAX ? flat : `${flat.slice(0, MEDIA_CAPTION_MAX - 1).trimEnd()}…`;
}
