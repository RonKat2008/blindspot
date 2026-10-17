// OWNER: codex-codex. Server-only data access with plain @supabase/supabase-js (no cookies).
// Create the client inside a function (never at module top level), using
// NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. Map snake_case rows to the
// camelCase contract types in src/lib/contract.ts. Embeddings (vector(1536)) come back as
// strings like "[0.1,0.2,...]" — parse with JSON.parse.
export {};
