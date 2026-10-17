// FROZEN CONTRACT — shared by backend (codex), frontend (cursor) and prompts (claude).
// Change only via the orchestrator. Every route returns either the documented body
// or `{ error: string }` with a non-2xx status.

import { z } from "zod";

// ---------- Domain types ----------

export type PatternType = "gap" | "fixation" | "duplicate" | "abandoned" | "unexplored" | "bridge" | "voice" | "shortlist" | "assumption";
export const PATTERN_TYPES: readonly PatternType[] = [
  "gap",
  "fixation",
  "duplicate",
  "abandoned",
  "unexplored",
  "bridge",
  "voice",
  "shortlist",
  "assumption",
] as const;

export type IdeaSource = "typed" | "voice" | "photo";
/** What a point is made of. Text points have no media fields. */
export type MediaType = "text" | "image" | "audio" | "link";
export type ProvocationStatus = "shown" | "accepted" | "dismissed";
export type DeviceRole = "contributor" | "ambient";

export type Session = {
  id: string;
  prompt: string;
  teamName: string | null;
  createdAt: string; // ISO
};

/** A named bipolar lens. Scores near -1 lean to poleA, near +1 lean to poleB. */
export type Axis = {
  id: string;
  poleA: string; // e.g. "incremental"
  poleB: string; // e.g. "radical"
  userEdited: boolean;
  position: number; // display order, 0-based
};

export type Idea = {
  id: string;
  text: string;
  source: IdeaSource;
  kind?: "idea" | "assumption";
  shortlisted?: boolean;
  speaker?: string;
  deviceId?: string;
  /** axisId -> score in [-1, 1]. -1 = poleA end, +1 = poleB end. */
  axisScores: Record<string, number>;
  /** Optional 2D PCA overview coords, each roughly in [-1, 1]. */
  pca?: { x: number; y: number };
  board?: { x: number; y: number };
  color?: string;
  /** Absent or "text" for plain ideas. */
  mediaType?: MediaType;
  /** Public URL in the idea-media bucket (image/audio), or an https evidence link. */
  mediaUrl?: string;
  /** Image description, voice transcript, or link title and snippet. Never an idea. */
  mediaCaption?: string;
  createdAt: string; // ISO
};

export type ProvocationWhy = {
  pattern: PatternType;
  ideaIds: string[]; // ideas to highlight on the map
  axisId?: string;
  explanation: string; // one plain-language sentence, e.g. "7 of 9 ideas sit on the incremental side."
};

export type Provocation = {
  id: string;
  type: PatternType;
  /** The question shown to the user. Never contains a suggested idea. */
  text: string;
  why: ProvocationWhy;
  status: ProvocationStatus;
  createdAt: string; // ISO
};

export type Device = {
  id: string;
  sessionId: string;
  role: DeviceRole;
  capabilities: string[];
  speakerName?: string;
  lastSeen: string; // ISO
};

/** Output of the pure detection engine, input to the prompts module. */
export type DetectionSignal = {
  type: PatternType;
  strength: number; // 0..1
  speaker?: string;
  ideaIds: string[];
  axisId?: string;
  /** For gap signals: which end is empty. -1 = poleA end, +1 = poleB end. */
  side?: -1 | 1;
};

export type DiversityBreakdown = {
  spread: number; // 0..1, mean pairwise cosine distance (calibrated)
  coverage: number; // 0..1, share of axis ends with >= 2 ideas
};

export type SessionState = {
  session: Session;
  axes: Axis[];
  ideas: Idea[]; // oldest first
  provocations: Provocation[]; // oldest first; the current one is the last with status 'shown'
  diversity: number; // 0..100 integer
  diversityBreakdown: DiversityBreakdown;
  edges?: { a: string; b: string; similarity: number }[];
  clusters?: { id: string; ideaIds: string[] }[];
  islands?: string[];
};

// ---------- Route table ----------
// POST   /api/sessions                  CreateSessionBody      -> CreateSessionResponse
// GET    /api/sessions/[id]/state       -                      -> SessionState (device polling too)
// PUT    /api/sessions/[id]/axes        UpdateAxesBody         -> UpdateAxesResponse
// POST   /api/sessions/[id]/ideas       AddIdeasBody           -> AddIdeasResponse
// PATCH  /api/provocations/[id]         UpdateProvocationBody  -> OkResponse
// POST   /api/sessions/[id]/devices     RegisterDeviceBody     -> RegisterDeviceResponse  (stretch)
// POST   /api/extract                   ExtractBody            -> ExtractResponse         (stretch)
// POST   /api/reality                   RealityBody            -> RealityResponse         (stretch)

export const AXIS_COUNT_MIN = 4;
export const AXIS_COUNT_MAX = 6;
export const IDEA_TEXT_MAX = 280;
/** Detection runs after every Nth idea in a session. */
export const DETECT_EVERY_N_IDEAS = 3;

export const CreateSessionBody = z.object({
  prompt: z.string().trim().min(3).max(300),
  teamName: z.string().trim().max(60).optional(),
});
export type CreateSessionBody = z.infer<typeof CreateSessionBody>;
export type CreateSessionResponse = { sessionId: string; axes: Axis[] };

const AxisInput = z.object({
  id: z.string().optional(), // omit for a new axis
  poleA: z.string().trim().min(1).max(40),
  poleB: z.string().trim().min(1).max(40),
});
export const UpdateAxesBody = z.object({
  axes: z.array(AxisInput).min(2).max(AXIS_COUNT_MAX),
});
export type UpdateAxesBody = z.infer<typeof UpdateAxesBody>;
/** Full replacement; server re-embeds only poles that changed and rescores all ideas. */
export type UpdateAxesResponse = { axes: Axis[] };

export const BoardPosition = z.object({ x: z.number().finite(), y: z.number().finite() });
export const UpdateIdeaBody = z.object({
  board: BoardPosition.optional(),
  kind: z.enum(["idea", "assumption"]).optional(),
  shortlisted: z.boolean().optional(),
}).strict().refine(value => Object.values(value).some(v => v !== undefined), { message: "At least one update is required" });

export const MEDIA_CAPTION_MAX = 400;
export const IdeaMediaInput = z.object({
  mediaType: z.enum(["image", "audio", "link"]),
  mediaUrl: z.url().max(1000),
  caption: z.string().trim().max(MEDIA_CAPTION_MAX).optional(),
}).refine(value => value.mediaType !== "link" || (value.mediaUrl.startsWith("https://") && Boolean(value.caption)), { message: "Links need an https URL and a caption" });
export type IdeaMediaInput = z.infer<typeof IdeaMediaInput>;

export const AddIdeasBody = z.object({
  /** A text may be "" only when the matching media item is present (an unlabeled image/voice note). */
  texts: z.array(z.string().trim().max(IDEA_TEXT_MAX)).min(1).max(20),
  /** Optional, parallel to texts: null/absent entries are plain text ideas. */
  media: z.array(IdeaMediaInput.nullable()).max(20).optional(),
  source: z.enum(["typed", "voice", "photo"]).default("typed"),
  speaker: z.string().trim().max(40).optional(),
  deviceId: z.string().optional(),
  positions: z.array(BoardPosition.nullable()).max(20).optional(),
  color: z.string().trim().min(1).max(40).optional(),
}).refine(value => !value.positions || value.positions.length === value.texts.length, { message: "positions must match texts length" })
  .refine(value => !value.media || value.media.length === value.texts.length, { message: "media must match texts length" })
  .refine(value => value.texts.every((t, i) => t.length > 0 || Boolean(value.media?.[i])), { message: "Each idea needs text or media" });
export type AddIdeasBody = z.input<typeof AddIdeasBody>;
export type AddIdeasResponse = {
  ideas: Idea[]; // the newly created ideas
  /** All ideas rescored (z-normalization shifts everyone), so clients replace their list. */
  allIdeas: Idea[];
  provocation?: Provocation | null; // present when detection ran and fired
  diversity: number;
  diversityBreakdown: DiversityBreakdown;
};

export const UpdateProvocationBody = z.object({
  status: z.enum(["accepted", "dismissed"]),
});
export type UpdateProvocationBody = z.infer<typeof UpdateProvocationBody>;
export type OkResponse = { ok: true };

export const RegisterDeviceBody = z.object({
  role: z.enum(["contributor", "ambient"]),
  capabilities: z.array(z.string()).default([]),
  speakerName: z.string().trim().max(40).optional(),
});
export type RegisterDeviceBody = z.input<typeof RegisterDeviceBody>;
export type RegisterDeviceResponse = { device: Device };

export const ExtractBody = z.object({
  imageBase64: z.string().min(16), // data URL or raw base64 (jpeg/png)
});
export type ExtractBody = z.infer<typeof ExtractBody>;
export type ExtractResponse = { texts: string[] };

export const RealityBody = z.object({
  ideaIds: z.array(z.string()).min(1).max(10),
});
export type RealityBody = z.infer<typeof RealityBody>;
export type RealityResponse = { queries: string[]; resultCounts: number[] };

export type ErrorResponse = { error: string };

export const ContextBody = z.object({
  sessionId: z.uuid(),
  ideaId: z.uuid().optional(),
  query: z.string().trim().min(3).max(1000).optional(),
}).refine(value => Boolean(value.ideaId || value.query), { message: "Provide ideaId or query" });
export type ContextBody = z.infer<typeof ContextBody>;
export type ContextResult = { title: string; url: string; snippet: string; publishedDate?: string; favicon?: string };
export type ContextResponse = { query: string; results: ContextResult[] };
export type SandboxResponse = { sessionId: string };

// ---------- Media points ----------
// POST /api/media/upload    multipart {file, sessionId}  -> MediaUploadResponse
// POST /api/media/describe  MediaDescribeBody            -> MediaDescribeResponse
// GET  /api/ideas/[id]/related                           -> RelatedResponse
export type MediaUploadResponse = { url: string; mediaType: "image" | "audio" };
export const MediaDescribeBody = z.object({
  url: z.url().max(1000),
  mediaType: z.enum(["image", "audio"]),
});
export type MediaDescribeBody = z.infer<typeof MediaDescribeBody>;
export type MediaDescribeResponse = { caption: string };
export type RelatedResponse = {
  ideaId: string;
  /** Top 5 by cosine similarity. `why` (<= 10 words) is absent when the model was slow or the guard rejected it. */
  nearest: { id: string; text: string; similarity: number; why?: string }[];
  /** Bottom 2 by cosine similarity. */
  farthest: { id: string; text: string; similarity: number }[];
  /** Every lens, strongest leaning first. score in [-1, 1]; -1 = poleA, +1 = poleB. */
  lensLeanings: { axisId: string; poleA: string; poleB: string; score: number }[];
  /** Questions (provocations) that reference this idea, oldest first. */
  questions: { id: string; text: string; type: PatternType; status: ProvocationStatus }[];
};

// ---------- Prompts module interface (src/lib/prompts/index.ts implements this) ----------

export type ProposedAxis = { poleA: string; poleB: string };

export interface PromptsModule {
  /** 4–6 bipolar lenses for the brainstorm prompt. Never throws: falls back to defaults. */
  proposeAxes(prompt: string): Promise<ProposedAxis[]>;
  /**
   * One provocation question for a detection signal. GUARANTEED SAFE: the output has
   * passed the suggestion judge + regex blocklist, or it is a deterministic template
   * filled with the user's own idea text and axis names. Never throws.
   */
  writeProvocation(
    signal: DetectionSignal,
    ideas: Idea[],
    axes: Axis[],
    prompt: string,
  ): Promise<{ text: string; why: ProvocationWhy }>;
}
