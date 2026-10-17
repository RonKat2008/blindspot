import { MediaDescribeBody } from "@/lib/contract";
import { body, failure, HttpError } from "@/lib/db";
import { isDemoMode } from "@/lib/demo";
import { DEMO_CAPTIONS, describeImage, isOwnMediaUrl, transcribeAudio } from "@/lib/media";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(request: Request): Promise<Response> {
  try {
    const input = await body(request, MediaDescribeBody);
    if (!isOwnMediaUrl(input.url)) throw new HttpError(400, "url must be an uploaded idea-media file");
    if (isDemoMode()) return Response.json({ caption: DEMO_CAPTIONS[input.mediaType] });
    try {
      const caption = input.mediaType === "image" ? await describeImage(input.url) : await transcribeAudio(input.url);
      return Response.json({ caption });
    } catch (error) {
      console.error("Media describe failed:", error instanceof Error ? error.message : "Unknown error");
      throw new HttpError(502, input.mediaType === "image" ? "Could not describe this image. Add a label instead." : "Could not transcribe this recording. Add a label instead.");
    }
  } catch (error) { return failure(error); }
}
