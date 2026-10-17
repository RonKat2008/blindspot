// POST /api/extract (stretch): photo of sticky notes / whiteboard -> separate idea texts.
import { generateText, Output } from "ai";
import { z } from "zod";
import { ExtractBody, type ExtractResponse } from "@/lib/contract";
import { isDemoMode } from "@/lib/demo";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_IDEAS = 15;
const MAX_IDEA_CHARS = 280;
const MODEL = "anthropic/claude-sonnet-5-5";
const DEMO_TEXTS = [
  "Buddy system for new hires",
  "Onboarding as a team ritual",
  "Let newcomers teach us something on day one",
];

const Extracted = z.object({ ideas: z.array(z.string()) });

const INSTRUCTIONS =
  "You are transcribing a photo of a brainstorm: sticky notes, whiteboard items or handwritten lists. " +
  "Transcribe each sticky note or whiteboard item as a separate idea, verbatim or very close to it " +
  "(fix only obvious handwriting ambiguity). Never add ideas of your own, never merge or summarise, " +
  "and ignore titles, doodles and unrelated text. Keep each idea under 280 characters. " +
  "If nothing legible is present, return an empty list.";

function parseDataUrl(raw: string): { mediaType: string; data: string } | null {
  const full = raw.startsWith("data:") ? raw : `data:image/jpeg;base64,${raw}`;
  const match = /^data:(image\/[a-zA-Z+.-]+);base64,([\s\S]*)$/.exec(full);
  return match ? { mediaType: match[1], data: match[2] } : null;
}

export async function POST(request: Request): Promise<Response> {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return Response.json({ error: "Body must be JSON." }, { status: 400 });
  }
  const parsed = ExtractBody.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: "imageBase64 is required." }, { status: 400 });
  }

  if (isDemoMode()) {
    return Response.json({ texts: DEMO_TEXTS } satisfies ExtractResponse);
  }

  const image = parseDataUrl(parsed.data.imageBase64);
  if (!image) return Response.json({ error: "Unsupported image format." }, { status: 400 });

  try {
    const result = await generateText({
      model: MODEL,
      output: Output.object({ schema: Extracted }),
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: INSTRUCTIONS },
            { type: "file", mediaType: image.mediaType, data: image.data },
          ],
        },
      ],
    });
    const texts = result.output.ideas
      .map((t) => t.trim().slice(0, MAX_IDEA_CHARS))
      .filter(Boolean)
      .slice(0, MAX_IDEAS);
    return Response.json({ texts } satisfies ExtractResponse);
  } catch (err) {
    console.error("[extract] failed", err);
    return Response.json(
      { error: "Couldn't read that photo. Try again or type the ideas." },
      { status: 502 },
    );
  }
}
