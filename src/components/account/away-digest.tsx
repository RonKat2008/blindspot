"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { AwayResponse } from "@/lib/supabase/account-types";

type Props = {
  sessionId: string;
  /** Called with the new idea ids when the viewer clicks "Show me". */
  onHighlight?: (ideaIds: string[]) => void;
  className?: string;
};

type Digest = { summary: string; ideaIds: string[]; colors: string[] };

function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}

/** "Maya added 4 stickies, Leo added 1, and 1 new question". */
export function summarize(away: AwayResponse): Digest | null {
  if (away.ideas.length === 0 && away.provocations.length === 0) return null;
  const byAuthor = new Map<string, { count: number; color?: string }>();
  away.ideas.forEach(i => {
    const entry = byAuthor.get(i.authorName) ?? { count: 0, color: i.authorColor };
    byAuthor.set(i.authorName, { ...entry, count: entry.count + 1 });
  });
  const people = [...byAuthor.entries()].sort((a, b) => b[1].count - a[1].count);
  const shown = people.slice(0, 2).map(([name, { count }], idx) => `${name} added ${idx === 0 ? plural(count, "sticky", "stickies") : count}`);
  if (people.length > 2) {
    const rest = people.slice(2).reduce((n, [, v]) => n + v.count, 0);
    shown.push(`${plural(people.length - 2, "other", "others")} added ${rest}`);
  }
  if (away.provocations.length > 0) shown.push(plural(away.provocations.length, "new question", "new questions"));
  const summary = shown.length > 1 ? `${shown.slice(0, -1).join(", ")} and ${shown.at(-1)}` : shown[0];
  return { summary, ideaIds: away.ideas.map(i => i.id), colors: people.map(([, v]) => v.color ?? "var(--ink-soft)") };
}

function markSeen(sessionId: string, useBeacon = false) {
  const url = `/api/sessions/${sessionId}/seen`;
  if (useBeacon && typeof navigator.sendBeacon === "function") {
    navigator.sendBeacon(url);
    return;
  }
  fetch(url, { method: "POST", keepalive: true }).catch(() => undefined);
}

/**
 * Async catch-up strip. Signed-in viewers see what others added since their last visit;
 * guests and first-time visitors see nothing. Marks the board seen on load and on leave.
 */
export function AwayDigest({ sessionId, onHighlight, className }: Props) {
  const [digest, setDigest] = useState<Digest | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    let isSignedIn = false;
    fetch(`/api/sessions/${sessionId}/away`, { signal: controller.signal, cache: "no-store" })
      .then(async r => {
        if (!r.ok) return; // 401 for guests: stay silent
        isSignedIn = true;
        setDigest(summarize((await r.json()) as AwayResponse));
        markSeen(sessionId);
      })
      .catch(() => undefined);
    const onHide = () => { if (isSignedIn && document.visibilityState === "hidden") markSeen(sessionId, true); };
    document.addEventListener("visibilitychange", onHide);
    return () => {
      controller.abort();
      document.removeEventListener("visibilitychange", onHide);
      if (isSignedIn) markSeen(sessionId, true);
    };
  }, [sessionId]);

  const isVisible = Boolean(digest) && !isDismissed;
  return (
    <AnimatePresence>
      {isVisible && digest && (
        <motion.aside
          role="status"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ type: "spring", stiffness: 380, damping: 32 }}
          className={`flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-[oklch(86%_0.02_80)] bg-[oklch(94%_0.05_75)] px-4 py-2.5 text-sm text-[oklch(22%_0.02_60)] shadow-[0_12px_28px_-16px_oklch(30%_0.04_60/0.4)] ${className ?? ""}`}
        >
          <span className="flex -space-x-1" aria-hidden>
            {digest.colors.slice(0, 3).map((c, i) => <span key={i} className="h-3 w-3 rounded-full ring-2 ring-[oklch(94%_0.05_75)]" style={{ background: c }} />)}
          </span>
          <p className="min-w-0 flex-1">
            <span className="font-[family-name:var(--font-fraunces,Georgia)] italic text-[oklch(45%_0.13_55)]">While you were away: </span>
            {digest.summary}.
          </p>
          <span className="flex items-center gap-1">
            {onHighlight && digest.ideaIds.length > 0 && (
              <button type="button" onClick={() => { onHighlight(digest.ideaIds); setIsDismissed(true); }} className="rounded-full bg-[oklch(22%_0.02_60)] px-3 py-1 font-medium text-[oklch(97.5%_0.012_85)] transition-transform hover:-translate-y-px active:scale-95">
                Show me
              </button>
            )}
            <button type="button" onClick={() => setIsDismissed(true)} aria-label="Dismiss" className="rounded-full px-2 py-1 text-[oklch(45%_0.02_60)] hover:bg-[oklch(90%_0.05_75)]">
              ✕
            </button>
          </span>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
