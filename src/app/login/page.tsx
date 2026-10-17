import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, safeNext } from "@/lib/auth";
import { db } from "@/lib/db";
import { AuthForm } from "@/components/account/auth-form";
import { PaperPage } from "@/components/account/paper";

export const metadata: Metadata = { title: "Sign in · Blind Spot" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function invitePrompt(next: string): Promise<string | null> {
  const id = next.match(/^\/invite\/([^/?#]+)/)?.[1];
  if (!id || !UUID.test(id)) return null;
  try {
    const { data } = await db().from("sessions").select("prompt").eq("id", id).maybeSingle();
    return (data?.prompt as string | undefined) ?? null;
  } catch {
    return null;
  }
}

const NOTES = [
  { text: "Free coffee for first-years", bg: "oklch(93% 0.09 95)", tilt: "-4deg", x: "4%", y: "6%" },
  { text: "Peer mentors by major", bg: "oklch(90% 0.07 160)", tilt: "3deg", x: "46%", y: "0%" },
  { text: "Text reminders before deadlines", bg: "oklch(90% 0.06 15)", tilt: "-1.5deg", x: "20%", y: "44%" },
];

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; mode?: string }> }) {
  const params = await searchParams;
  const next = safeNext(params.next);
  if (await getCurrentUser()) redirect(next);
  const prompt = await invitePrompt(next);
  const mode = params.mode === "signup" || prompt ? "signup" : "signin";

  return (
    <PaperPage>
      <main className="mx-auto grid min-h-dvh max-w-6xl items-center gap-12 px-4 py-10 sm:px-8 lg:grid-cols-[1.15fr_1fr] lg:gap-20">
        <section aria-labelledby="login-heading" className="relative">
          <Link href="/" className="display text-xl tracking-tight">Blind Spot</Link>
          <h1 id="login-heading" className="display mt-10 text-[length:var(--text-hero)] leading-[0.95] tracking-tight">
            Pick up where <em className="text-[var(--signal-ink)]">the room</em> left off.
          </h1>
          <p className="mt-6 max-w-md text-lg text-[var(--ink-soft)]">
            Brainstorms rarely happen all at once. With an account, your boards wait for you, teammates can add stickies on their own time, and you&apos;ll see exactly what changed while you were away.
          </p>
          <div aria-hidden className="relative mt-10 hidden h-56 max-w-md sm:block">
            {NOTES.map(n => (
              <div key={n.text} className="acct-sticky absolute w-44" style={{ background: n.bg, left: n.x, top: n.y, ["--tilt" as string]: n.tilt }}>
                {n.text}
              </div>
            ))}
            <p className="display absolute bottom-0 right-0 max-w-[15rem] text-right italic text-[var(--signal-ink)]">
              &ldquo;Every idea helps students who are already here. What about before they arrive?&rdquo;
            </p>
          </div>
        </section>
        <section aria-label="Sign in or create an account" className="w-full max-w-md justify-self-center lg:justify-self-end">
          <AuthForm next={next} initialMode={mode} invitePrompt={prompt} />
        </section>
      </main>
    </PaperPage>
  );
}
