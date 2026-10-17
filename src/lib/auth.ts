import { redirect } from "next/navigation";
import type { Me } from "./supabase/account-types";
import { isSupabaseConfigured } from "./supabase/config";
import { createClient } from "./supabase/server";

/** Pleasant marker-pen colours for people (distinct from the axis pencils). */
export const PERSON_COLORS = [
  "oklch(62% 0.15 30)",
  "oklch(60% 0.13 250)",
  "oklch(62% 0.14 150)",
  "oklch(60% 0.15 330)",
  "oklch(66% 0.14 75)",
  "oklch(58% 0.12 200)",
  "oklch(58% 0.13 290)",
] as const;

export function pickColor(seed?: string): string {
  if (!seed) return PERSON_COLORS[Math.floor(Math.random() * PERSON_COLORS.length)];
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return PERSON_COLORS[h % PERSON_COLORS.length];
}

export type AuthClient = Awaited<ReturnType<typeof createClient>>;
export type CurrentUser = Me & { client: AuthClient };

function fallbackName(email: string | null | undefined) {
  const local = (email ?? "").split("@")[0] ?? "";
  return local ? local.slice(0, 1).toUpperCase() + local.slice(1, 40) : "Someone";
}

/**
 * The signed-in user with their profile, or null for guests. Ensures a profiles row
 * exists (created from signup metadata on first call). Never throws.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const client = await createClient();
    const { data } = await client.auth.getUser();
    const user = data.user;
    if (!user) return null;
    const profile = await client.from("profiles").select("display_name, color").eq("id", user.id).maybeSingle();
    if (profile.data) {
      return { id: user.id, email: user.email ?? null, displayName: profile.data.display_name, color: profile.data.color, client };
    }
    const meta = (user.user_metadata ?? {}) as { display_name?: unknown };
    const displayName = typeof meta.display_name === "string" && meta.display_name.trim()
      ? meta.display_name.trim().slice(0, 40)
      : fallbackName(user.email);
    const color = pickColor(user.id);
    const created = await client.from("profiles").upsert({ id: user.id, display_name: displayName, color }).select("display_name, color").maybeSingle();
    if (created.error) console.error("Profile upsert failed:", created.error.message);
    return { id: user.id, email: user.email ?? null, displayName, color, client };
  } catch (error) {
    console.error("getCurrentUser failed:", error instanceof Error ? error.message : "Unknown error");
    return null;
  }
}

/** For server pages: redirect to /login?next=<path> when signed out. */
export async function requireUser(next = "/boards"): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(safeNext(next))}`);
  return user;
}

/** Only allow same-site relative redirects. */
export function safeNext(next: string | null | undefined, fallback = "/boards"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}

export function publicMe(user: CurrentUser): Me {
  return { id: user.id, email: user.email, displayName: user.displayName, color: user.color };
}
