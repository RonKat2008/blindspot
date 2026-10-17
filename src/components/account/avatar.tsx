import type { Member } from "@/lib/supabase/account-types";

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

export function Avatar({ name, color, size = 26 }: { name: string; color: string; size?: number }) {
  return (
    <span className="acct-avatar" style={{ width: size, height: size, background: color, fontSize: size * 0.4 }} title={name} aria-label={name}>
      {initials(name)}
    </span>
  );
}

/** Overlapping avatar stack; shows +N past `max`. */
export function AvatarStack({ members, max = 4, size = 26 }: { members: Pick<Member, "id" | "displayName" | "color">[]; max?: number; size?: number }) {
  const shown = members.slice(0, max);
  const extra = members.length - shown.length;
  return (
    <span className="flex items-center" aria-label={`${members.length} ${members.length === 1 ? "person" : "people"}`}>
      {shown.map((m, i) => (
        <span key={m.id} style={{ marginLeft: i === 0 ? 0 : -size * 0.3 }}>
          <Avatar name={m.displayName} color={m.color} size={size} />
        </span>
      ))}
      {extra > 0 && (
        <span className="acct-avatar" style={{ width: size, height: size, marginLeft: -size * 0.3, background: "var(--ink-soft)", fontSize: size * 0.38 }}>
          +{extra}
        </span>
      )}
    </span>
  );
}
