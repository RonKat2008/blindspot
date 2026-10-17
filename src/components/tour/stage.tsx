"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import type { Chapter } from "./chapters";
import { Illustration } from "./illustration";

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal-ink";

type StageProps = { chapter: Chapter; number: number; total: number; isVideo: boolean };

function TryLink({ href, label }: { href: string; label: string }) {
  const cls = cn(
    "group inline-flex items-center gap-2 rounded-full border border-ink px-5 py-2.5 text-sm font-medium transition-[background-color,color,transform] hover:bg-ink hover:text-paper-raised active:scale-[0.97]",
    FOCUS,
  );
  const body = (
    <>
      {label}
      <span aria-hidden className="transition-transform group-hover:translate-x-0.5">→</span>
    </>
  );
  if (href.startsWith("http")) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>
        {body}
      </a>
    );
  }
  return (
    <Link href={href} className={cls}>
      {body}
    </Link>
  );
}

export function ChapterStage({ chapter, number, total, isVideo }: StageProps) {
  return (
    <article className="grid min-w-0 items-center gap-8 py-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] xl:gap-12">
      <div className="min-w-0">
        <p className="tnum text-xs tracking-[0.14em] text-ink-soft uppercase">
          Chapter {String(number).padStart(2, "0")} <span className="text-ink-faint">/ {total}</span>
        </p>
        <h1
          style={{ lineHeight: 1.06 }}
          className={cn(
            "mt-3 font-display tracking-tight text-balance",
            isVideo ? "text-[clamp(2.25rem,1.3rem+2.8vw,3.9rem)]" : "text-[clamp(2rem,1.3rem+2.6vw,3.5rem)]",
          )}
        >
          {chapter.title}
        </h1>

        <dl className={cn("mt-6 space-y-5", isVideo ? "text-[clamp(1.1rem,0.9rem+0.6vw,1.45rem)]" : "text-base sm:text-lg")}>
          <div>
            <dt className="text-xs tracking-[0.14em] text-ink-soft uppercase">What it does</dt>
            <dd className="mt-1 leading-snug text-ink">{chapter.what}</dd>
          </div>
          <div className="border-l-2 border-signal pl-4">
            <dt className="flex flex-wrap items-center gap-2 text-xs tracking-[0.14em] text-signal-ink uppercase">
              Why it matters
              <span className="rounded-full bg-signal-wash px-2 py-0.5 tracking-normal normal-case">{chapter.principle}</span>
            </dt>
            <dd className="mt-1 font-display leading-snug text-ink italic">{chapter.why}</dd>
          </div>
        </dl>

        {chapter.source && (
          <p className="mt-4 text-xs text-ink-soft">
            Source:{" "}
            <a
              href={chapter.source.href}
              target="_blank"
              rel="noopener noreferrer"
              className={cn("rounded-sm underline decoration-rule underline-offset-4 hover:decoration-ink", FOCUS)}
            >
              {chapter.source.label}
            </a>
          </p>
        )}

        <div className="mt-6">
          <TryLink href={chapter.tryHref} label={`Try it: ${chapter.tryLabel}`} />
        </div>
      </div>

      <div className="mx-auto w-full max-w-[560px] min-w-0 drop-shadow-[0_12px_32px_oklch(30%_0.04_60/0.12)]">
        <Illustration name={chapter.key} />
      </div>
    </article>
  );
}

type EndProps = { isVideo: boolean; onRestart: () => void };

export function EndCard({ isVideo, onRestart }: EndProps) {
  return (
    <article className="flex min-h-[60vh] flex-col justify-center py-8">
      <p className="text-xs tracking-[0.14em] text-signal-ink uppercase">That&apos;s the tour</p>
      <h1 style={{ lineHeight: 1.04 }} className="mt-3 max-w-3xl font-display text-[clamp(2.5rem,1.5rem+4vw,4.5rem)] tracking-tight text-balance">
        Find the ideas you&apos;re <em className="text-signal-ink">not</em> having.
      </h1>
      <p className={cn("mt-5 max-w-xl text-ink-soft", isVideo ? "text-xl" : "text-lg")}>
        Blind Spot widens your thinking without giving you a single idea.
      </p>
      <div className="mt-8 flex flex-wrap items-center gap-3">
        <Link
          href="/new"
          className={cn(
            "rounded-full bg-ink px-6 py-3 text-base font-medium text-paper-raised transition-transform hover:-translate-y-px active:scale-[0.97]",
            FOCUS,
          )}
        >
          Start a whiteboard →
        </Link>
        <Link
          href="/demo"
          className={cn(
            "rounded-full border border-ink px-6 py-3 text-base transition-colors hover:bg-ink hover:text-paper-raised",
            FOCUS,
          )}
        >
          Watch the 90-second demo
        </Link>
        <button
          type="button"
          onClick={onRestart}
          className={cn("rounded-full px-4 py-3 text-sm text-ink-soft underline-offset-4 hover:text-ink hover:underline", FOCUS)}
        >
          Restart tour
        </button>
      </div>
    </article>
  );
}
