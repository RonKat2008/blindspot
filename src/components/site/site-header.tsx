"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AccountMenu } from "@/components/account/account-menu";
import { LogoMark } from "./logo";

const LINKS = [
  { href: "/boards", label: "Boards" },
  { href: "/demo", label: "Tour" },
  { href: "/insights", label: "Team view" },
] as const;

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--rule)] bg-[color-mix(in_oklch,var(--paper)_88%,transparent)] backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 sm:px-8">
        <Link href="/" className="font-display flex items-center gap-2 text-lg tracking-tight text-[var(--ink)]">
          <LogoMark className="size-6" />
          Blind Spot
        </Link>
        <nav aria-label="Site" className="ml-6 hidden items-center gap-1 md:flex">
          {LINKS.map((link) => {
            const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`rounded-full px-3 py-1.5 text-sm ${active ? "bg-[var(--paper-sunk)] font-medium text-[var(--ink)]" : "text-[var(--ink-soft)] hover:text-[var(--ink)]"}`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <AccountMenu />
          <Link
            href="/new"
            className="inline-flex items-center rounded-full bg-[var(--ink)] px-3.5 py-1.5 text-sm font-medium text-[var(--paper-raised)] hover:opacity-90"
          >
            New board
          </Link>
          <button
            type="button"
            className="inline-flex size-9 items-center justify-center rounded-full border border-[var(--rule)] md:hidden"
            aria-expanded={open}
            aria-controls="site-menu"
            onClick={() => setOpen((v) => !v)}
          >
            <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
            <span aria-hidden className="flex w-4 flex-col gap-1">
              <span className="h-px bg-[var(--ink)]" />
              <span className="h-px bg-[var(--ink)]" />
              <span className="h-px bg-[var(--ink)]" />
            </span>
          </button>
        </div>
      </div>
      {open && (
        <nav id="site-menu" aria-label="Site" className="border-t border-[var(--rule)] px-4 py-3 md:hidden">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="block rounded-xl px-3 py-2.5 text-sm text-[var(--ink)] hover:bg-[var(--paper-sunk)]"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
