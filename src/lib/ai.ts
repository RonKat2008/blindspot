// OWNER: codex-codex. Server-only AI helpers via the Vercel AI Gateway (VERCEL_OIDC_TOKEN).
//   embed / embedMany from "ai" with model "openai/text-embedding-3-small" (1536 dims).
//   Structured output: generateText({ model: "anthropic/claude-sonnet-5-5", output: Output.object({ schema }), prompt }) → result.output
export const EMBEDDING_MODEL = "openai/text-embedding-3-small";
export const EMBEDDING_DIMS = 1536;
export const MAIN_MODEL = "anthropic/claude-sonnet-5-5";
export const JUDGE_MODEL = "anthropic/claude-haiku-5-5";
