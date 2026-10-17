import Link from "next/link";
import { LogoMark } from "./logo";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-[var(--rule)]">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-[var(--ink-soft)] sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <p className="font-display flex items-center gap-2 text-[var(--ink)]">
          <LogoMark className="size-4" />
          Blind Spot
        </p>
        <p>It asks. You write the ideas.</p>
        <nav aria-label="Footer" className="flex gap-4">
          <Link href="/demo" className="hover:text-[var(--ink)]">Tour</Link>
          <Link href="/insights" className="hover:text-[var(--ink)]">Team view</Link>
          <Link href="/pitch" className="hover:text-[var(--ink)]">Pitch</Link>
        </nav>
      </div>
    </footer>
  );
}
