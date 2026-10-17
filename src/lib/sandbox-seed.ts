import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { embedMany } from "ai";
import { EMBEDDING_MODEL } from "./ai";
import type { IdeaMediaInput, SandboxResponse } from "./contract";
import { check, db, type Database } from "./db";
import { getCurrentUser } from "./auth";
import { ensureMembership } from "./supabase/members";
import { cachedContext, demoContextResults } from "./exa";
import { scoreIdeas, type AxisWithEmbeddings } from "./engine/score";

const PROMPT = "How might we make a new hire's first week great?";
const TEXTS = [
  "Shorter signup form", "Welcome email with three tips", "Progress checklist in the app",
  "Skip button on the tutorial", "Short help videos", "Pre-filled sample project",
  "Lunch with the team on day one", "A shared doc of everyone's favorite tools",
  "Ask new hires what confused them on Friday",
];
// Fixed human-written lenses and semantic pole descriptions. No generation or description calls.
const LENSES = [
  ["incremental", "radical", "a small, safe tweak that improves how things already work", "a bold, unconventional idea that throws out the current approach and reinvents it"],
  ["individual", "social", "something a person does alone, on their own, at their own pace", "something people do together with others, a team or community"],
  ["digital", "physical", "something that happens on a screen, in software or online", "something that happens in person, in a physical place or with physical things"],
  ["short-term", "long-term", "something that pays off right away, in the first minutes or days", "something that builds value slowly over months or years"],
  ["low-cost", "high-investment", "a cheap, lightweight idea that needs almost no money or effort", "an ambitious idea that needs significant money, time or people"],
];
const IMAGES = [
  { name: "sticky-wall", caption: "Sticky notes on a glass wall: SHORTER SIGNUP, WELCOME EMAIL, SKIP TUTORIAL, HELP VIDEOS" },
  { name: "whiteboard-sketch", caption: "Whiteboard sketch of the onboarding flow: sign up → welcome → first project" },
  { name: "phone-checklist", caption: "Phone showing an onboarding checklist with a progress bar" },
];

// Share uploads across concurrent sandbox requests on this instance; reset failures for retry.
let uploaded: Promise<IdeaMediaInput[]> | undefined;
function sandboxImages(client: Database): Promise<IdeaMediaInput[]> {
  if (!uploaded) uploaded = Promise.all(IMAGES.map(async image => {
    const bucket = client.storage.from("idea-media"), objectPath = `sandbox/${image.name}.jpeg`;
    const url = bucket.getPublicUrl(objectPath).data.publicUrl;
    const existing = await fetch(url, { method: "HEAD", signal: AbortSignal.timeout(3000), cache: "no-store" });
    if (!existing.ok) {
      const bytes = await readFile(path.join(process.cwd(), "public", "tour", `${image.name}.jpeg`));
      const result = await bucket.upload(objectPath, bytes, { contentType: "image/jpeg", upsert: true });
      check(result.error);
    }
    return { mediaType: "image" as const, mediaUrl: url, caption: image.caption };
  })).catch(error => { uploaded = undefined; throw error; });
  return uploaded;
}

/** Real DB board; minimal session/axis insertion mirrors the regular route without its LLM calls. */
export async function createSandbox(): Promise<SandboxResponse> {
  const client = db();
  const [images, evidence, user] = await Promise.all([
    sandboxImages(client),
    cachedContext("new hire onboarding buddy program research").catch(() => demoContextResults()),
    getCurrentUser(),
  ]);
  const link = evidence[0] ?? demoContextResults()[0];
  const linkCaption = `${link.title}. ${link.snippet}`.slice(0, 400);
  const media: (IdeaMediaInput | null)[] = [...TEXTS.map(() => null), ...images, { mediaType: "link", mediaUrl: link.url, caption: linkCaption }];
  const texts = [...TEXTS, ...images.map(image => image.caption!), linkCaption];
  // One embedding request covers every pole and point. Embeddings are the only model operation.
  const poleTexts = LENSES.flatMap(lens => lens.slice(2));
  const { embeddings } = await embedMany({ model: EMBEDDING_MODEL, values: [...poleTexts, ...texts], maxRetries: 0, abortSignal: AbortSignal.timeout(8000) });
  const sessionId = crypto.randomUUID();
  const axes: AxisWithEmbeddings[] = LENSES.map((lens, position) => ({
    id: crypto.randomUUID(), poleA: lens[0], poleB: lens[1], position, userEdited: false,
    poleAEmbedding: embeddings[position * 2], poleBEmbedding: embeddings[position * 2 + 1],
  }));
  const vectors = embeddings.slice(poleTexts.length), scores = scoreIdeas(vectors, axes);
  const session = await client.from("sessions").insert({ id: sessionId, prompt: PROMPT, is_sandbox: true, ...(user ? { owner_id: user.id } : {}) });
  check(session.error);
  try {
    const storedAxes = await client.from("axes").insert(axes.map(axis => ({
      id: axis.id, session_id: sessionId, pole_a: axis.poleA, pole_b: axis.poleB,
      pole_a_embedding: JSON.stringify(axis.poleAEmbedding), pole_b_embedding: JSON.stringify(axis.poleBEmbedding), position: axis.position, user_edited: false,
    })));
    check(storedAxes.error);
    const now = Date.now();
    // One bulk ideas insertion. No detection, image description, or generated questions.
    const ideas = await client.from("ideas").insert(texts.map((text, i) => ({
      id: crypto.randomUUID(), session_id: sessionId, text: text.slice(0, 280), source: "typed",
      embedding: JSON.stringify(vectors[i]), axis_scores: scores[i],
      media_type: media[i]?.mediaType ?? "text", media_url: media[i]?.mediaUrl ?? null, media_caption: media[i]?.caption ?? null,
      board_x: (i % 4) * 260 - 390, board_y: Math.floor(i / 4) * 210 - 210,
      created_at: new Date(now + i).toISOString(), ...(user ? { author_id: user.id } : {}),
    })));
    check(ideas.error);
    if (user) await ensureMembership(user, sessionId, "owner");
    return { sessionId };
  } catch (error) {
    await client.from("sessions").delete().eq("id", sessionId);
    throw error;
  }
}
