// Pure helpers for room camera mode: which extracted sticky notes are actually new.

/** Word-set Jaccard at or above this counts as the same note. */
export const NEAR_MATCH_JACCARD = 0.7;

/** Lowercase, strip punctuation, collapse whitespace. */
export function normalizeNote(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function wordSet(normalized: string): Set<string> {
  return new Set(normalized.split(" ").filter(Boolean));
}

export function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  let inter = 0;
  for (const w of a) if (b.has(w)) inter += 1;
  return inter / (a.size + b.size - inter);
}

/** True when two notes are the same after normalization, or near-identical by word overlap. */
export function isSameNote(a: string, b: string): boolean {
  const na = normalizeNote(a);
  const nb = normalizeNote(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  return jaccard(wordSet(na), wordSet(nb)) >= NEAR_MATCH_JACCARD;
}

/**
 * Keep only extracted texts that match none of `existing` (board ideas + pending chips)
 * and none of each other. Order is preserved; the original (trimmed) text is returned.
 */
export function newNotesOnly(extracted: readonly string[], existing: readonly string[]): string[] {
  const seen: string[] = [...existing];
  const fresh: string[] = [];
  for (const raw of extracted) {
    const text = raw.trim();
    if (!normalizeNote(text)) continue;
    if (seen.some((s) => isSameNote(s, text))) continue;
    seen.push(text);
    fresh.push(text);
  }
  return fresh;
}
