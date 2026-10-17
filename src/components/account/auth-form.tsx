"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { createClient } from "@/lib/supabase/client";

type Mode = "signin" | "signup";
type Props = { next: string; initialMode?: Mode; invitePrompt?: string | null };

const MIN_PASSWORD = 6;

export function AuthForm({ next, initialMode = "signin", invitePrompt }: Props) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (mode === "signup" && !name.trim()) return setError("What should your teammates call you?");
    if (password.length < MIN_PASSWORD) return setError(`Passwords need at least ${MIN_PASSWORD} characters.`);
    setIsBusy(true);
    try {
      const supabase = createClient();
      if (mode === "signin") {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (signInError) throw signInError;
        window.location.assign(next);
        return;
      }
      const displayName = name.trim().slice(0, 40);
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { display_name: displayName },
          emailRedirectTo: `${window.location.origin}/auth/confirm?next=${encodeURIComponent(next)}`,
        },
      });
      if (signUpError) throw signUpError;
      if (!data.session) {
        setSentTo(email.trim());
        return;
      }
      // Profile row is created server-side on first request (from display_name metadata).
      window.location.assign(next);
    } catch (err) {
      setError(friendly(err));
    } finally {
      setIsBusy(false);
    }
  }

  if (sentTo) {
    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="acct-card p-8">
        <p className="display text-3xl leading-tight">Check your email.</p>
        <p className="mt-3 text-[var(--ink-soft)]">
          We sent a confirmation link to <strong className="text-[var(--ink)]">{sentTo}</strong>. Open it on this device and you&apos;ll land right back here, signed in.
        </p>
        <button type="button" className="acct-btn-ghost mt-6" onClick={() => { setSentTo(null); setMode("signin"); }}>
          Already confirmed? Sign in
        </button>
      </motion.div>
    );
  }

  const isSignup = mode === "signup";
  return (
    <div className="acct-card p-6 sm:p-8">
      {invitePrompt && (
        <p className="mb-5 rounded-xl bg-[var(--signal-wash)] px-4 py-3 text-sm text-[var(--signal-ink)]">
          You&apos;re invited to <span className="display italic">&ldquo;{invitePrompt}&rdquo;</span>
        </p>
      )}
      <div role="tablist" aria-label="Account" className="mb-6 flex gap-1 rounded-full border border-[var(--rule)] bg-[var(--paper)] p-1 text-sm">
        {(["signin", "signup"] as const).map(m => (
          <button
            key={m}
            role="tab"
            type="button"
            aria-selected={mode === m}
            onClick={() => { setMode(m); setError(null); }}
            className="relative flex-1 rounded-full px-4 py-2 font-medium transition-colors"
            style={{ color: mode === m ? "var(--paper)" : "var(--ink-soft)" }}
          >
            {mode === m && <motion.span layoutId="acct-tab" className="absolute inset-0 rounded-full bg-[var(--ink)]" transition={{ type: "spring", stiffness: 500, damping: 40 }} />}
            <span className="relative">{m === "signin" ? "Sign in" : "Create account"}</span>
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <AnimatePresence initial={false}>
          {isSignup && (
            <motion.label key="name" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="flex flex-col gap-1.5 overflow-hidden">
              <span className="text-sm font-medium">Your name</span>
              <input className="acct-input" value={name} onChange={e => setName(e.target.value)} placeholder="Maya" autoComplete="name" maxLength={40} />
              <span className="text-xs text-[var(--ink-faint)]">Shown on your stickies so the team knows who wrote what.</span>
            </motion.label>
          )}
        </AnimatePresence>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Email</span>
          <input className="acct-input" type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@team.com" autoComplete="email" />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Password</span>
          <input className="acct-input" type="password" required minLength={MIN_PASSWORD} value={password} onChange={e => setPassword(e.target.value)} placeholder={isSignup ? "At least 6 characters" : "••••••••"} autoComplete={isSignup ? "new-password" : "current-password"} />
        </label>
        {error && <p role="alert" className="text-sm text-[var(--signal-ink)]">{error}</p>}
        <button type="submit" className="acct-btn mt-2" disabled={isBusy}>
          {isBusy ? (isSignup ? "Making your account…" : "Signing in…") : isSignup ? "Create account" : "Sign in"}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-[var(--ink-soft)]">
        Just trying it out? <Link href="/" className="font-medium text-[var(--ink)] underline decoration-[var(--signal)] decoration-2 underline-offset-4">Continue as a guest</Link>
      </p>
    </div>
  );
}

function friendly(err: unknown): string {
  const message = err instanceof Error ? err.message : "";
  if (/invalid login/i.test(message)) return "That email and password don't match. Try again?";
  if (/already registered|already exists/i.test(message)) return "There's already an account with that email. Sign in instead.";
  if (/email not confirmed/i.test(message)) return "Confirm your email first — check your inbox for the link.";
  if (/rate limit/i.test(message)) return "Too many tries. Give it a minute and try again.";
  return message || "Couldn't reach the server. Try again.";
}
