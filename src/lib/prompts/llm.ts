// Shared LLM plumbing: model ids, per-call timeout, structured-output helper.
import { generateText, Output } from "ai";
import type { z } from "zod";

export const GENERATION_MODEL = "anthropic/claude-sonnet-5-5";
export const JUDGE_MODEL = "anthropic/claude-haiku-5-5";
export const LLM_TIMEOUT_MS = 6000;

/** One structured LLM call with a hard timeout. Throws on timeout / provider / schema error. */
export async function generateObject<T>(opts: {
  model: string;
  schema: z.ZodType<T>;
  system: string;
  prompt: string;
  timeoutMs?: number;
}): Promise<T> {
  const result = await generateText({
    model: opts.model,
    system: opts.system,
    prompt: opts.prompt,
    output: Output.object({ schema: opts.schema }),
    abortSignal: AbortSignal.timeout(opts.timeoutMs ?? LLM_TIMEOUT_MS),
  });
  return result.output as T;
}
