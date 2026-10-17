"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import type { Me, MeResponse } from "@/lib/supabase/account-types";
import { Avatar } from "./avatar";

/**
 * Top-bar account control. Self-loading: fetches /api/me.
 * Signed in → avatar + name with a menu (My boards, Sign out). Guest → "Sign in".
 */
export function AccountMenu({ className }: { className?: string }) {
  const [state, setState] = useState<{ user: Me | null; isLoaded: boolean }>({ user: null, isLoaded: false });
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/me", { signal: controller.signal, cache: "no-store" })
      .then(r => (r.ok ? (r.json() as Promise<MeResponse>) : { user: null }))
      .then(body => setState({ user: body.user, isLoaded: true }))
      .catch(() => { if (!controller.signal.aborted) setState({ user: null, isLoaded: true }); });
    return () => controller.abort();
  }, []);
  if (!state.isLoaded) return <span className={className} style={{ display: "inline-block", width: 28, height: 28 }} aria-hidden />;
  return <AccountMenuView user={state.user} className={className} />;
}

/** Presentational variant for server pages that already know the user. */
export function AccountMenuView({ user, className }: { user: Me | null; className?: string }) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const onDown = (e: PointerEvent) => { if (!rootRef.current?.contains(e.target as Node)) setIsOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setIsOpen(false); };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("pointerdown", onDown); document.removeEventListener("keydown", onKey); };
  }, [isOpen]);

  if (!user) {
    return (
      <Link
        href={`/login?next=${encodeURIComponent(pathname || "/boards")}`}
        className={`inline-flex items-center rounded-full border border-[oklch(86%_0.02_80)] bg-[oklch(99%_0.006_85)] px-3.5 py-1.5 text-sm font-medium text-[oklch(22%_0.02_60)] transition-colors hover:border-[oklch(62%_0.015_60)] ${className ?? ""}`}
      >
        Sign in
      </Link>
    );
  }

  return (
    <div ref={rootRef} className={`relative ${className ?? ""}`}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(o => !o)}
        className="flex items-center gap-2 rounded-full py-1 pl-1 pr-3 text-sm font-medium text-[oklch(22%_0.02_60)] transition-colors hover:bg-[oklch(94%_0.016_85)]"
      >
        <Avatar name={user.displayName} color={user.color} size={28} />
        <span className="max-w-[10rem] truncate">{user.displayName}</span>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 z-50 mt-2 w-56 origin-top-right overflow-hidden rounded-2xl border border-[oklch(86%_0.02_80)] bg-[oklch(99%_0.006_85)] p-1.5 text-sm text-[oklch(22%_0.02_60)] shadow-[0_18px_40px_-16px_oklch(30%_0.04_60/0.35)]"
          >
            {user.email && <p className="truncate px-3 pb-2 pt-1.5 text-xs text-[oklch(62%_0.015_60)]">{user.email}</p>}
            <Link role="menuitem" href="/boards" onClick={() => setIsOpen(false)} className="block rounded-xl px-3 py-2 hover:bg-[oklch(94%_0.016_85)]">
              My boards
            </Link>
            <Link role="menuitem" href="/" onClick={() => setIsOpen(false)} className="block rounded-xl px-3 py-2 hover:bg-[oklch(94%_0.016_85)]">
              New board
            </Link>
            <form action="/auth/signout" method="post">
              <button role="menuitem" type="submit" className="block w-full rounded-xl px-3 py-2 text-left text-[oklch(45%_0.02_60)] hover:bg-[oklch(94%_0.016_85)]">
                Sign out
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
