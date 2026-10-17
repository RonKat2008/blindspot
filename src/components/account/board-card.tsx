import Link from "next/link";
import type { BoardSummary } from "@/lib/supabase/account-types";
import { AvatarStack } from "./avatar";

const DEFAULT_DOT = "oklch(85% 0.11 95)";

function relativeTime(iso: string): string {
  const minutes = Math.round((Date.now() - Date.parse(iso)) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** A tiny sticky-dot rendering of the board's layout. */
function MiniMap({ dots, height }: { dots: BoardSummary["dots"]; height: number }) {
  return (
    <svg viewBox="0 0 100 60" preserveAspectRatio="none" className="w-full rounded-xl bg-[var(--paper-sunk)]" style={{ height }} aria-hidden>
      <defs>
        <pattern id="mm-grid" width="6" height="6" patternUnits="userSpaceOnUse">
          <circle cx="0.6" cy="0.6" r="0.35" fill="var(--rule)" />
        </pattern>
      </defs>
      <rect width="100" height="60" fill="url(#mm-grid)" />
      {dots.map((d, i) => (
        <rect key={i} x={d.x * 100 - 2.4} y={d.y * 60 - 1.8} width="4.8" height="3.6" rx="0.5" fill={d.color ?? DEFAULT_DOT} stroke="oklch(30% 0.04 60 / 0.25)" strokeWidth="0.2" />
      ))}
    </svg>
  );
}

export function BoardCard({ board, isFeatured = false }: { board: BoardSummary; isFeatured?: boolean }) {
  return (
    <Link href={`/s/${board.id}`} className="acct-card acct-board group flex h-full flex-col gap-4 p-4">
      <div className="relative">
        <MiniMap dots={board.dots} height={isFeatured ? 200 : 132} />
        {board.newSinceSeen > 0 && (
          <span className="absolute right-3 top-3 rounded-full bg-[var(--signal)] px-2.5 py-1 text-xs font-semibold text-[var(--ink)] shadow-sm">
            {board.newSinceSeen} new since you were here
          </span>
        )}
        {board.ideaCount === 0 && (
          <span className="absolute inset-0 grid place-items-center text-sm text-[var(--ink-faint)]">No stickies yet</span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-3 px-1 pb-1">
        <p className={`display leading-snug tracking-tight ${isFeatured ? "text-2xl" : "text-lg"} line-clamp-3`}>{board.prompt}</p>
        <div className="mt-auto flex items-center justify-between gap-3 text-sm text-[var(--ink-soft)]">
          <AvatarStack members={board.members} size={isFeatured ? 28 : 24} />
          <span className="tnum">
            {board.ideaCount} {board.ideaCount === 1 ? "sticky" : "stickies"} · {relativeTime(board.updatedAt)}
          </span>
        </div>
        {board.role === "owner" && <span className="sr-only">You own this board</span>}
      </div>
    </Link>
  );
}
