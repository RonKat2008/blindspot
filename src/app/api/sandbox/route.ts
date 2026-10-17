import { failure } from "@/lib/db";
import { createSandbox } from "@/lib/sandbox-seed";
export const dynamic = "force-dynamic";
export const maxDuration = 15;
export async function POST(): Promise<Response> {
  try { return Response.json(await createSandbox(), { status: 201, headers: { "Cache-Control": "no-store" } }); }
  catch (error) { return failure(error); }
}
