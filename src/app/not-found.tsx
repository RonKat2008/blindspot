import Link from "next/link";
import { SiteFrame } from "@/components/site/site-frame";

export default function NotFound() {
  return (
    <SiteFrame>
      <main className="mx-auto flex max-w-xl flex-col justify-center px-4 py-24 sm:px-8">
        <p className="text-sm uppercase tracking-[0.16em] text-[var(--ink-faint)]">404</p>
        <h1 className="font-display mt-3 text-4xl tracking-tight sm:text-5xl">This page isn&apos;t on the board.</h1>
        <p className="mt-4 text-lg text-[var(--ink-soft)]">
          The link may be mistyped. Your boards are still where you left them.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/boards" className="inline-flex rounded-full bg-[var(--ink)] px-4 py-2 text-sm font-medium text-[var(--paper-raised)]">
            My boards
          </Link>
          <Link href="/" className="inline-flex rounded-full border border-[var(--rule)] px-4 py-2 text-sm font-medium">
            Home
          </Link>
        </div>
      </main>
    </SiteFrame>
  );
}
