import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { ensureMembership } from "@/lib/supabase/members";
import { PaperPage } from "@/components/account/paper";
import { SiteFrame } from "@/components/site/site-frame";

export const metadata: Metadata = { title: "You're invited · Blind Spot" };
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function loadBoard(id: string) {
  if (!UUID.test(id)) return null;
  const client = db();
  const [session, count] = await Promise.all([
    client.from("sessions").select("id, prompt, team_name").eq("id", id).maybeSingle(),
    client.from("ideas").select("id", { count: "exact", head: true }).eq("session_id", id),
  ]);
  if (!session.data) return null;
  return { prompt: String(session.data.prompt), teamName: session.data.team_name as string | null, ideaCount: count.count ?? 0 };
}

export default async function InvitePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const board = await loadBoard(id);
  if (!board) {
    return (
      <PaperPage>
        <SiteFrame>
        <main className="mx-auto flex max-w-xl flex-col justify-center px-4 py-16">
          <h1 className="display font-display text-4xl">This board can&apos;t be found.</h1>
          <p className="mt-3 text-[var(--ink-soft)]">The link may be mistyped, or the board was removed. Ask whoever sent it for a fresh one.</p>
          <Link href="/new" className="acct-btn mt-8 self-start">Start your own board</Link>
        </main>
        </SiteFrame>
      </PaperPage>
    );
  }

  const user = await getCurrentUser();
  if (user) {
    await ensureMembership(user, id, "editor");
    redirect(`/s/${id}`);
  }

  const next = `/invite/${id}`;
  return (
    <PaperPage>
      <SiteFrame>
      <main className="mx-auto flex max-w-2xl flex-col justify-center px-4 py-16 sm:px-8">
        <p className="text-sm uppercase tracking-[0.18em] text-[var(--ink-faint)]">{board.teamName ? `${board.teamName} invited you` : "You've been invited"}</p>
        <h1 className="display font-display mt-4 text-[clamp(2rem,1.4rem+3vw,3.5rem)] leading-[1.02] tracking-tight">&ldquo;{board.prompt}&rdquo;</h1>
        <p className="mt-5 max-w-lg text-lg text-[var(--ink-soft)]">
          {board.ideaCount > 0
            ? `${board.ideaCount} ${board.ideaCount === 1 ? "sticky is" : "stickies are"} already on the board. Add yours whenever you have a moment — no need to be there at the same time.`
            : "The board is empty and waiting. Add the first sticky whenever you have a moment."}
        </p>
        <div className="mt-10 flex flex-wrap items-center gap-3">
          <Link href={`/login?mode=signup&next=${encodeURIComponent(next)}`} className="acct-btn">Join with an account</Link>
          <Link href={`/login?next=${encodeURIComponent(next)}`} className="acct-btn-ghost">I already have one</Link>
          <Link href={`/s/${id}`} className="ml-1 text-sm text-[var(--ink-soft)] underline decoration-[var(--rule)] underline-offset-4 hover:text-[var(--ink)]">or peek in as a guest</Link>
        </div>
        <p className="mt-6 text-sm text-[var(--ink-faint)]">With an account, the board shows up in your boards and tells you what changed since you last looked.</p>
      </main>
      </SiteFrame>
    </PaperPage>
  );
}
