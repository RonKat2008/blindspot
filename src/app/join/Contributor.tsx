"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { api } from "@/lib/api-client";
import { IDEA_TEXT_MAX, type Provocation } from "@/lib/contract";
import { downscaleToJpeg } from "./image";
import { SERIF } from "./theme";
import { useSessionState } from "./useSessionState";

interface ContributorProps {
  sessionId: string;
  speaker?: string;
  deviceId?: string;
}

const POLL_MS = 1500;
const VIBRATE_PATTERN = [28, 50, 28];
const SENT_BANNER_MS = 2500;

interface Chip {
  key: number;
  text: string;
}

function errMsg(e: unknown, fallback: string): string {
  return e instanceof Error && e.message ? e.message : fallback;
}

export function Contributor({ sessionId, speaker, deviceId }: ContributorProps) {
  const { state, failed } = useSessionState(sessionId, POLL_MS);
  const [chips, setChips] = useState<Chip[]>([]);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState<"reading" | "sending" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<number | null>(null);
  const seenIds = useRef<Set<string>>(new Set());
  const fileRef = useRef<HTMLInputElement>(null);
  const keyRef = useRef(0);
  const baselined = useRef(false);

  const current: Provocation | undefined = state?.provocations
    .filter((p) => p.status === "shown")
    .at(-1);

  // Vibrate when a provocation appears that wasn't there when we joined.
  useEffect(() => {
    if (!state) return;
    if (!baselined.current) {
      baselined.current = true;
      state.provocations.forEach((p) => seenIds.current.add(p.id));
      return;
    }
    if (current && !seenIds.current.has(current.id)) {
      seenIds.current.add(current.id);
      if (typeof navigator !== "undefined") navigator.vibrate?.(VIBRATE_PATTERN);
    }
  }, [state, current]);

  useEffect(() => {
    if (sent === null) return;
    const t = setTimeout(() => setSent(null), SENT_BANNER_MS);
    return () => clearTimeout(t);
  }, [sent]);

  async function onPhoto(file: File | undefined) {
    if (!file) return;
    setBusy("reading");
    setError(null);
    try {
      const imageBase64 = await downscaleToJpeg(file);
      const { texts } = await api.extract(imageBase64);
      if (texts.length === 0) {
        setError("Couldn't find any notes in that photo. Try again with more light.");
      } else {
        setChips((prev) => [...prev, ...texts.map((text) => ({ key: keyRef.current++, text }))]);
      }
    } catch (e) {
      setError(errMsg(e, "Couldn't read that photo. Try again or type your idea."));
    } finally {
      setBusy(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function send(texts: string[], source: "photo" | "typed") {
    const clean = texts.map((t) => t.trim()).filter(Boolean);
    if (clean.length === 0) return false;
    setBusy("sending");
    setError(null);
    try {
      await api.addIdeas(sessionId, { texts: clean, source, speaker, deviceId });
      setSent(clean.length);
      return true;
    } catch (e) {
      setError(errMsg(e, "Couldn't reach the map. Your idea is safe, try again."));
      return false;
    } finally {
      setBusy(null);
    }
  }

  async function submitChips() {
    if (await send(chips.map((c) => c.text), "photo")) setChips([]);
  }

  async function submitTyped(e: React.FormEvent) {
    e.preventDefault();
    if (await send([typed], "typed")) setTyped("");
  }

  const editChip = (key: number, text: string) =>
    setChips((prev) => prev.map((c) => (c.key === key ? { ...c, text } : c)));
  const removeChip = (key: number) => setChips((prev) => prev.filter((c) => c.key !== key));
  const validChips = chips.filter((c) => c.text.trim());

  return (
    <div className="flex flex-1 flex-col gap-6">
      <header>
        <p className="text-[0.7rem] uppercase tracking-[0.18em]" style={{ color: "var(--ink-faint)" }}>
          The question
        </p>
        <h1
          className="mt-2 text-[1.65rem] font-semibold leading-snug"
          style={{ fontFamily: SERIF }}
        >
          {state ? state.session.prompt : "Connecting to the board…"}
        </h1>
        {failed && (
          <p className="mt-1 text-xs" style={{ color: "var(--signal-ink)" }}>
            Lost the room for a moment. Reconnecting…
          </p>
        )}
      </header>

      <AnimatePresence>
        {current && (
          <motion.aside
            key={current.id}
            initial={{ opacity: 0, y: -16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0 }}
            className="relative -rotate-1 rounded-sm p-5 shadow-[3px_4px_0_oklch(22%_0.04_255/0.12)]"
            style={{ background: "var(--note)", color: "var(--note-ink)" }}
          >
            <p className="text-[0.7rem] uppercase tracking-[0.18em]">A question for the room</p>
            <p className="mt-2 text-[1.45rem] italic leading-snug" style={{ fontFamily: SERIF }}>
              {current.text}
            </p>
          </motion.aside>
        )}
      </AnimatePresence>

      {chips.length === 0 ? (
        <>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            id="photo-input"
            onChange={(e) => void onPhoto(e.target.files?.[0])}
          />
          <motion.button
            type="button"
            whileTap={{ scale: 0.97 }}
            disabled={busy !== null}
            onClick={() => fileRef.current?.click()}
            className="flex min-h-44 flex-col items-center justify-center gap-2 rounded-sm px-6 py-8 text-center shadow-[3px_4px_0_oklch(22%_0.02_60/0.12)] disabled:opacity-70"
            style={{ background: "var(--ink)", color: "var(--paper)" }}
          >
            <CameraIcon />
            <span className="text-xl font-medium" style={{ fontFamily: SERIF }}>
              {busy === "reading" ? "Reading your notes…" : "Photograph sticky notes"}
            </span>
            <span className="text-sm opacity-70">
              {busy === "reading" ? "One moment" : "Each note becomes its own idea"}
            </span>
          </motion.button>

          <form onSubmit={submitTyped} className="flex flex-col gap-2">
            <label htmlFor="typed-idea" className="sr-only">
              Type a sticky note
            </label>
            <div
              className="flex rotate-1 items-end gap-2 rounded-sm p-3 shadow-[2px_3px_0_oklch(22%_0.02_60/0.1)]"
              style={{ background: "var(--sticky)" }}
            >
              <textarea
                id="typed-idea"
                value={typed}
                rows={3}
                maxLength={IDEA_TEXT_MAX}
                onChange={(e) => setTyped(e.target.value)}
                placeholder="Write a sticky…"
                enterKeyHint="send"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    e.currentTarget.form?.requestSubmit();
                  }
                }}
                className="min-h-24 min-w-0 flex-1 resize-none bg-transparent px-2 py-2 text-lg outline-none placeholder:text-[oklch(45%_0.04_90)]"
              />
              <motion.button
                type="submit"
                whileTap={{ scale: 0.97 }}
                disabled={busy !== null || !typed.trim()}
                className="mb-1 min-h-12 shrink-0 rounded-sm px-5 text-base font-medium disabled:opacity-40"
                style={{ background: "var(--ink)", color: "var(--paper)" }}
              >
                Stick it
              </motion.button>
            </div>
          </form>
        </>
      ) : (
        <section aria-label="Check your ideas" className="flex flex-col gap-3">
          <h2 className="text-2xl font-semibold" style={{ fontFamily: SERIF }}>
            Do these look right?
          </h2>
          <p className="text-sm" style={{ color: "var(--ink-soft)" }}>
            Fix any word, or remove a note that isn&rsquo;t an idea.
          </p>
          <ul className="flex flex-col gap-2">
            <AnimatePresence initial={false}>
              {chips.map((chip) => (
                <motion.li
                  key={chip.key}
                  layout
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  className="flex items-start gap-2 rounded-sm p-2 shadow-[2px_3px_0_oklch(22%_0.02_60/0.1)]"
                  style={{
                    background: "var(--sticky)",
                    rotate: chip.key % 2 === 0 ? "-1.2deg" : "1.4deg",
                  }}
                >
                  <textarea
                    value={chip.text}
                    rows={2}
                    maxLength={IDEA_TEXT_MAX}
                    aria-label="Idea text"
                    onChange={(e) => editChip(chip.key, e.target.value)}
                    className="min-w-0 flex-1 resize-none bg-transparent px-2 py-1 text-base outline-none"
                  />
                  <button
                    type="button"
                    aria-label="Remove this idea"
                    onClick={() => removeChip(chip.key)}
                    className="h-11 w-11 shrink-0 text-2xl"
                    style={{ color: "var(--ink-soft)" }}
                  >
                    ×
                  </button>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
          <motion.button
            type="button"
            whileTap={{ scale: 0.97 }}
            disabled={busy !== null || validChips.length === 0}
            onClick={() => void submitChips()}
            className="mt-2 min-h-14 w-full rounded-sm px-6 py-4 text-lg font-medium disabled:opacity-40"
            style={{ background: "var(--ink)", color: "var(--paper)" }}
          >
            {busy === "sending"
              ? "Adding…"
              : `Add ${validChips.length} ${validChips.length === 1 ? "idea" : "ideas"}`}
          </motion.button>
          <button
            type="button"
            onClick={() => setChips([])}
            className="py-2 text-sm"
            style={{ color: "var(--ink-soft)" }}
          >
            Discard and retake
          </button>
        </section>
      )}

      <div aria-live="polite" className="min-h-6 text-sm">
        {error && (
          <p role="alert" style={{ color: "var(--signal-ink)" }}>
            {error}
          </p>
        )}
        {!error && sent !== null && (
          <p style={{ color: "var(--ink-soft)" }}>
            Stuck {sent} {sent === 1 ? "note" : "notes"} on the board.
          </p>
        )}
      </div>

      <footer className="mt-auto text-xs" style={{ color: "var(--ink-faint)" }}>
        {speaker ? `Adding as ${speaker}` : "Adding anonymously"}
        {state ? ` · ${state.ideas.length} ideas so far` : ""}
      </footer>
    </div>
  );
}

function CameraIcon() {
  return (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <path d="M4 8h3l1.5-2h7L17 8h3v11H4z" strokeLinejoin="round" />
      <circle cx="12" cy="13.5" r="3.5" />
    </svg>
  );
}
