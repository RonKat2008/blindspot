/** Client helpers for rich points. Endpoints may not be merged yet. */

export interface UploadedMedia {
  url: string;
  mediaType: string;
}

export async function uploadMedia(sessionId: string, file: Blob, filename: string): Promise<UploadedMedia> {
  const body = new FormData();
  body.append("file", file, filename);
  body.append("sessionId", sessionId);
  const res = await fetch("/api/media/upload", { method: "POST", body });
  const data = (await res.json().catch(() => ({}))) as { url?: string; mediaType?: string; error?: string };
  if (!res.ok || !data.url || !data.mediaType) {
    throw new Error(data.error || "Couldn't upload that. Try again in a moment.");
  }
  return { url: data.url, mediaType: data.mediaType };
}

export async function describeMedia(url: string, mediaType: string): Promise<string> {
  const res = await fetch("/api/media/describe", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ url, mediaType }),
  });
  const data = (await res.json().catch(() => ({}))) as { caption?: string; error?: string };
  if (!res.ok || !data.caption?.trim()) {
    throw new Error(data.error || "Couldn't make sense of that yet. You can write the words yourself.");
  }
  return data.caption.trim();
}
