import { embed as sdkEmbed, embedMany as sdkEmbedMany } from "ai";

export const EMBEDDING_MODEL = "openai/text-embedding-3-small";
export const EMBEDDING_DIMS = 1536;
export const MAIN_MODEL = "anthropic/claude-sonnet-5-5";
export const JUDGE_MODEL = "anthropic/claude-haiku-5-5";

export async function embed(text: string): Promise<number[]> {
  return (await sdkEmbed({ model: EMBEDDING_MODEL, value: text, maxRetries: 1, abortSignal: AbortSignal.timeout(30_000) })).embedding;
}

export async function embedMany(texts: string[]): Promise<number[][]> {
  if (!texts.length) return [];
  return (await sdkEmbedMany({ model: EMBEDDING_MODEL, values: texts, maxRetries: 1, abortSignal: AbortSignal.timeout(30_000) })).embeddings;
}
