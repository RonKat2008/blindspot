import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { listBoards } from "@/lib/supabase/boards";
import type { BoardSummary } from "@/lib/supabase/account-types";
import { PaperPage } from "@/components/account/paper";
import { BoardCard } from "@/components/account/board-card";
import { SiteFrame } from "@/components/site/site-frame";

export const metadata: Metadata = { title: "My boards · Blind Spot" };
export const dynamic = "force-dynamic";

export default async function BoardsPage() {
  const user = await requireUser("/boards");
  let boards: BoardSummary[] = [];
  let failed = false;
  try {
    boards = await listBoards(user);
  } catch (error) {
    console.error("listBoards failed:", error instanceof Error ? error.message : "Unknown error");
    failed = true;
  }
  const waiting = boards.reduce((n, b) => n + b.newSinceSeen, 0);
  const firstName = user.displayName.split(/\s+/)[0];

  return (
    <PaperPage>
      <SiteFrame>
      <main className="mx-auto max-w-6xl px-4 pb-16 pt-12 sm:px-8">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <h1 className="display font-display text-[clamp(2.25rem,1.6rem+2.5vw,3.5rem)] leading-none tracking-tight">Your boards, {firstName}.</h1>
            <p className="mt-3 text-[var(--ink-soft)]">
              {waiting > 0
                ? <><strong className="text-[var(--signal-ink)]">{waiting} new {waiting === 1 ? "sticky" : "stickies"}</strong> from your team since you last looked.</>
                : boards.length > 0 ? "You're all caught up." : "Nothing here yet."}
            </p>
          </div>
          <Link href="/new" className="acct-btn">New board</Link>
        </div>

        {failed && <p role="alert" className="mt-10 text-[var(--signal-ink)]">Couldn&apos;t load your boards. Refresh to try again.</p>}

        {!failed && boards.length === 0 && <EmptyState />}

        {boards.length > 0 && (
          <ul className="mt-12 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {boards.map((board, i) => (
              <li key={board.id} className={i === 0 ? "sm:col-span-2 lg:col-span-2" : undefined}>
                <BoardCard board={board} isFeatured={i === 0} />
              </li>
            ))}
          </ul>
        )}
      </main>
      </SiteFrame>
    </PaperPage>
  );
}

function EmptyState() {
  const steps = [
    { n: "1", title: "Start a board", body: "Ask the question you're brainstorming. Blind Spot proposes a few lenses to map ideas on.", bg: "oklch(93% 0.09 95)", tilt: "-2deg" },
    { n: "2", title: "Invite your team", body: "Share the invite link. People add stickies whenever they have a moment — no need to meet.", bg: "oklch(90% 0.07 160)", tilt: "1.5deg" },
    { n: "3", title: "Come back later", body: "Every board you touch lands here, with a count of what's new since you last looked.", bg: "oklch(90% 0.06 15)", tilt: "-1deg" },
  ];
  return (
    <section aria-label="How boards work" className="mt-14">
      <ol className="grid gap-8 sm:grid-cols-3">
        {steps.map(s => (
          <li key={s.n} className="acct-sticky" style={{ background: s.bg, ["--tilt" as string]: s.tilt }}>
            <span className="display text-3xl text-[var(--ink-soft)]">{s.n}</span>
            <p className="mt-2 font-semibold">{s.title}</p>
            <p className="mt-1 text-sm text-[var(--ink-soft)]">{s.body}</p>
          </li>
        ))}
      </ol>
      <p className="display font-display mt-12 text-2xl italic text-[var(--signal-ink)]">Your first board is one click away.</p>
      <Link href="/new" className="acct-btn mt-6">New board</Link>
    </section>
  );
}
