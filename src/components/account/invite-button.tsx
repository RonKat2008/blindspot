"use client";

import { useState } from "react";

/** Copies `<origin>/invite/<sessionId>` to the clipboard. Styled to sit in the board top bar. */
export function InviteButton({ sessionId, className }: { sessionId: string; className?: string }) {
  const [label, setLabel] = useState<"Invite" | "Link copied" | "Copy failed">("Invite");
  async function handleClick() {
    const url = `${window.location.origin}/invite/${sessionId}`;
    try {
      if (navigator.share && window.matchMedia("(pointer: coarse)").matches) {
        await navigator.share({ title: "Join my Blind Spot board", url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setLabel("Link copied");
    } catch {
      setLabel("Copy failed");
    }
    setTimeout(() => setLabel("Invite"), 2000);
  }
  return (
    <button
      type="button"
      onClick={handleClick}
      aria-live="polite"
      className={`inline-flex items-center gap-1.5 rounded-full border border-[oklch(86%_0.02_80)] bg-[oklch(99%_0.006_85)] px-3.5 py-1.5 text-sm font-medium text-[oklch(22%_0.02_60)] transition-colors hover:border-[oklch(62%_0.015_60)] ${className ?? ""}`}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M19 8v6M22 11h-6" />
      </svg>
      {label}
    </button>
  );
}
