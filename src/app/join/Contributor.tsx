"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { api } from "@/lib/api-client";
import { IDEA_TEXT_MAX, type Provocation } from "@/lib/contract";
import { downscaleToJpeg } from "./image";
import { describeMedia, uploadMedia } from "./media";
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

type Panel = "home" | "write" | "photo" | "voice";
type PhotoStep = "choose" | "preview" | "caption";
type VoiceStep = "hold" | "transcript";

function errMsg(e: unknown, fallback: string): string {
  return e instanceof Error && e.message ? e.message : fallback;
}

function permissionMessage(e: unknown, kind: "camera" | "microphone"): string | null {
  if (!(e instanceof DOMException)) return null;
  if (e.name === "NotAllowedError" || e.name === "PermissionDeniedError") {
    return kind === "camera"
      ? "The camera is blocked. Allow it in your browser settings, or write a sticky instead."
      : "The microphone is blocked. Allow it in your browser settings, or write a sticky instead.";
  }
  if (e.name === "NotFoundError") {
    return kind === "camera"
      ? "No camera showed up. You can still write a sticky."
      : "No microphone showed up. You can still write a sticky.";
  }
  return null;
}

export function Contributor({ sessionId, speaker, deviceId }: ContributorProps) {
  const reduce = useReducedMotion();
  const tap = reduce ? undefined : { scale: 0.97 };
  const { state, failed } = useSessionState(sessionId, POLL_MS);
  const [panel, setPanel] = useState<Panel>("home");
  const [chips, setChips] = useState<Chip[]>([]);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState<"reading" | "sending" | "uploading" | "listening" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);
  const seenIds = useRef<Set<string>>(new Set());
  const fileRef = useRef<HTMLInputElement>(null);
  const keyRef = useRef(0);
  const baselined = useRef(false);

  const [photoStep, setPhotoStep] = useState<PhotoStep>("choose");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [pendingMedia, setPendingMedia] = useState<{ mediaType: string; mediaUrl: string } | null>(null);

  const [voiceStep, setVoiceStep] = useState<VoiceStep>("hold");
  const [recording, setRecording] = useState(false);
  const [level, setLevel] = useState(0);
  const [transcript, setTranscript] = useState("");
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<AudioContext | null>(null);
  const rafRef = useRef(0);
  const startedAt = useRef(0);
  const holding = useRef(false);

  const current: Provocation | undefined = state?.provocations
    .filter((p) => p.status === "shown")
    .at(-1);

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

  useEffect(() => {
    return () => {
      if (photoUrl) URL.revokeObjectURL(photoUrl);
      stopMeter();
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
    // cleanup on unmount only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function stopMeter() {
    cancelAnimationFrame(rafRef.current);
    setLevel(0);
  }

  function clearPhoto() {
    if (photoUrl) URL.revokeObjectURL(photoUrl);
    setPhotoUrl(null);
    setPhotoFile(null);
    setCaption("");
    setPendingMedia(null);
    setPhotoStep("choose");
    if (fileRef.current) fileRef.current.value = "";
  }

  function goHome() {
    setPanel("home");
    setError(null);
    setChips([]);
    clearPhoto();
    setVoiceStep("hold");
    setTranscript("");
  }

  async function onPhotoPicked(file: File | undefined) {
    if (!file) return;
    setError(null);
    if (photoUrl) URL.revokeObjectURL(photoUrl);
    setPhotoFile(file);
    setPhotoUrl(URL.createObjectURL(file));
    setPhotoStep("preview");
    setPanel("photo");
    if (fileRef.current) fileRef.current.value = "";
  }

  async function splitPhoto() {
    if (!photoFile) return;
    setBusy("reading");
    setError(null);
    try {
      const imageBase64 = await downscaleToJpeg(photoFile);
      const { texts } = await api.extract(imageBase64);
      if (texts.length === 0) {
        setError("Couldn't find any notes in that photo. Try again with more light, or add it as one photo.");
      } else {
        setChips(texts.map((text) => ({ key: keyRef.current++, text })));
      }
    } catch (e) {
      setError(permissionMessage(e, "camera") ?? errMsg(e, "Couldn't read that photo. Try again or type your idea."));
    } finally {
      setBusy(null);
    }
  }

  async function addPhotoPoint() {
    if (!photoFile) return;
    setBusy("uploading");
    setError(null);
    try {
      const jpeg = await downscaleToJpeg(photoFile);
      const blob = await (await fetch(jpeg)).blob();
      const uploaded = await uploadMedia(sessionId, blob, "whiteboard.jpg");
      setBusy("listening");
      const described = await describeMedia(uploaded.url, uploaded.mediaType);
      setPendingMedia({ mediaType: uploaded.mediaType, mediaUrl: uploaded.url });
      setCaption(described.slice(0, IDEA_TEXT_MAX));
      setPhotoStep("caption");
    } catch (e) {
      setError(errMsg(e, "Couldn't add that photo. You can still split it into ideas."));
    } finally {
      setBusy(null);
    }
  }

  async function send(texts: string[], source: "photo" | "typed" | "voice", media?: { mediaType: string; mediaUrl: string; caption: string }) {
    const clean = texts.map((t) => t.trim()).filter(Boolean);
    if (clean.length === 0) return false;
    setBusy("sending");
    setError(null);
    try {
      if (media) {
        // TODO: confirm per-item media {mediaType, mediaUrl, caption} against
        // src/lib/contract.ts and POST /api/sessions/[id]/ideas once that shape lands on main.
        const res = await fetch(`/api/sessions/${sessionId}/ideas`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            texts: clean,
            source,
            speaker,
            deviceId,
            media: clean.map((captionText, i) => (i === 0 ? { ...media, caption: captionText } : undefined)).filter(Boolean),
          }),
        });
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        if (!res.ok) throw new Error(data.error || "Couldn't reach the map.");
      } else {
        await api.addIdeas(sessionId, { texts: clean, source, speaker, deviceId });
      }
      setSent(clean.length === 1 ? "Stuck 1 note on the board." : `Stuck ${clean.length} notes on the board.`);
      return true;
    } catch (e) {
      setError(errMsg(e, "Couldn't reach the map. Your idea is safe, try again."));
      return false;
    } finally {
      setBusy(null);
    }
  }

  async function submitChips() {
    if (await send(chips.map((c) => c.text), "photo")) {
      setChips([]);
      goHome();
    }
  }

  async function submitTyped(e: React.FormEvent) {
    e.preventDefault();
    if (await send([typed], "typed")) {
      setTyped("");
      setPanel("home");
    }
  }

  async function submitCaption() {
    if (!pendingMedia) return;
    if (await send([caption], "photo", { ...pendingMedia, caption: caption.trim() })) goHome();
  }

  async function submitTranscript() {
    if (!pendingMedia) return;
    if (await send([transcript], "voice", { ...pendingMedia, caption: transcript.trim() })) goHome();
  }

  function releaseStream() {
    stopMeter();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    void audioRef.current?.close();
    audioRef.current = null;
  }

  async function startRecording(e: React.PointerEvent<HTMLButtonElement>) {
    if (recording || busy) return;
    holding.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!holding.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      streamRef.current = stream;
      const mime = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "";
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunksRef.current = [];
      rec.ondataavailable = (ev) => {
        if (ev.data.size > 0) chunksRef.current.push(ev.data);
      };
      recRef.current = rec;
      startedAt.current = Date.now();
      rec.start();
      setRecording(true);
      const ctx = new AudioContext();
      audioRef.current = ctx;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      ctx.createMediaStreamSource(stream).connect(analyser);
      const bins = new Uint8Array(analyser.fftSize);
      const tick = () => {
        analyser.getByteTimeDomainData(bins);
        let sum = 0;
        for (const n of bins) {
          const v = (n - 128) / 128;
          sum += v * v;
        }
        setLevel(Math.min(1, Math.sqrt(sum / bins.length) * 4));
        rafRef.current = requestAnimationFrame(tick);
      };
      tick();
    } catch (err) {
      releaseStream();
      setRecording(false);
      setError(permissionMessage(err, "microphone") ?? errMsg(err, "Couldn't start the microphone."));
    }
  }

  async function stopRecording() {
    holding.current = false;
    const rec = recRef.current;
    if (!rec || rec.state === "inactive") {
      setRecording(false);
      releaseStream();
      return;
    }
    const blob = await new Promise<Blob>((resolve) => {
      rec.onstop = () => resolve(new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" }));
      rec.stop();
    });
    recRef.current = null;
    setRecording(false);
    releaseStream();
    if (Date.now() - startedAt.current < 400 || blob.size < 800) {
      setError("Hold a little longer so we can hear you.");
      return;
    }
    setBusy("uploading");
    setError(null);
    try {
      const uploaded = await uploadMedia(sessionId, blob, "voice.webm");
      setBusy("listening");
      const described = await describeMedia(uploaded.url, uploaded.mediaType);
      setPendingMedia({ mediaType: uploaded.mediaType, mediaUrl: uploaded.url });
      setTranscript(described.slice(0, IDEA_TEXT_MAX));
      setVoiceStep("transcript");
    } catch (err) {
      setError(errMsg(err, "Couldn't save that recording. Hold to try again, or write it down."));
    } finally {
      setBusy(null);
    }
  }

  const editChip = (key: number, text: string) =>
    setChips((prev) => prev.map((c) => (c.key === key ? { ...c, text } : c)));
  const removeChip = (key: number) => setChips((prev) => prev.filter((c) => c.key !== key));
  const validChips = chips.filter((c) => c.text.trim());

  const progress =
    busy === "uploading" ? "Uploading…" : busy === "listening" ? "Listening back…" : busy === "reading" ? "Reading your notes…" : null;

  return (
    <div className="flex flex-1 flex-col gap-6">
      <header>
        <p className="text-[0.7rem] uppercase tracking-[0.18em]" style={{ color: "var(--ink-faint)" }}>
          The question
        </p>
        <h1 className="mt-2 text-[1.65rem] font-semibold leading-snug" style={{ fontFamily: SERIF }}>
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
            initial={reduce ? false : { opacity: 0, y: -16, scale: 0.98 }}
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

      {panel !== "home" && chips.length === 0 && (
        <button type="button" onClick={goHome} className="self-start py-1 text-sm" style={{ color: "var(--ink-soft)" }}>
          All ways to add
        </button>
      )}

      {chips.length > 0 ? (
        <ChipList
          chips={chips}
          busy={busy === "sending"}
          validCount={validChips.length}
          onEdit={editChip}
          onRemove={removeChip}
          onSubmit={() => void submitChips()}
          onDiscard={goHome}
          reduce={!!reduce}
        />
      ) : panel === "home" ? (
        <div className="grid grid-cols-1 gap-3">
          <ActionButton tap={tap} label="Write" hint="A sticky in your own words" onClick={() => setPanel("write")} icon={<PenIcon />} tone="sticky" />
          <ActionButton tap={tap} label="Photo" hint="A whiteboard or a stack of notes" onClick={() => { setPanel("photo"); setPhotoStep("choose"); }} icon={<CameraIcon />} tone="ink" />
          <ActionButton tap={tap} label="Voice" hint="Hold to talk, then check the words" onClick={() => { setPanel("voice"); setVoiceStep("hold"); }} icon={<MicIcon />} tone="paper" />
        </div>
      ) : panel === "write" ? (
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
              whileTap={tap}
              disabled={busy !== null || !typed.trim()}
              className="mb-1 min-h-12 shrink-0 rounded-sm px-5 text-base font-medium disabled:opacity-40"
              style={{ background: "var(--ink)", color: "var(--paper)" }}
            >
              Stick it
            </motion.button>
          </div>
        </form>
      ) : panel === "photo" ? (
        <section className="flex flex-col gap-3">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            id="photo-input"
            onChange={(e) => void onPhotoPicked(e.target.files?.[0])}
          />
          {photoStep === "choose" && (
            <motion.button
              type="button"
              whileTap={tap}
              disabled={busy !== null}
              onClick={() => fileRef.current?.click()}
              className="flex min-h-44 flex-col items-center justify-center gap-2 rounded-sm px-6 py-8 text-center shadow-[3px_4px_0_oklch(22%_0.02_60/0.12)] disabled:opacity-70"
              style={{ background: "var(--ink)", color: "var(--paper)" }}
            >
              <CameraIcon />
              <span className="text-xl font-medium" style={{ fontFamily: SERIF }}>
                Open the camera
              </span>
              <span className="text-sm opacity-70">Point it at the board or a sticky</span>
            </motion.button>
          )}
          {photoStep !== "choose" && photoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photoUrl} alt="What you just photographed" className="max-h-56 w-full rounded-sm object-cover" />
          )}
          {photoStep === "preview" && (
            <div className="flex flex-col gap-2">
              <motion.button
                type="button"
                whileTap={tap}
                disabled={busy !== null}
                onClick={() => void splitPhoto()}
                className="min-h-14 rounded-sm px-4 text-lg font-medium disabled:opacity-50"
                style={{ background: "var(--sticky)" }}
              >
                Split into ideas
              </motion.button>
              <motion.button
                type="button"
                whileTap={tap}
                disabled={busy !== null}
                onClick={() => void addPhotoPoint()}
                className="min-h-14 rounded-sm px-4 text-lg font-medium disabled:opacity-50"
                style={{ background: "var(--ink)", color: "var(--paper)" }}
              >
                Add as one photo point
              </motion.button>
              <button type="button" onClick={clearPhoto} className="py-2 text-sm" style={{ color: "var(--ink-soft)" }}>
                Retake
              </button>
            </div>
          )}
          {photoStep === "caption" && (
            <label className="flex flex-col gap-2">
              <span className="text-sm" style={{ color: "var(--ink-soft)" }}>
                Does this caption match the photo?
              </span>
              <textarea
                value={caption}
                rows={3}
                maxLength={IDEA_TEXT_MAX}
                onChange={(e) => setCaption(e.target.value)}
                className="min-h-24 rounded-sm p-3 text-lg outline-none"
                style={{ background: "var(--sticky)" }}
              />
              <motion.button
                type="button"
                whileTap={tap}
                disabled={busy !== null || !caption.trim()}
                onClick={() => void submitCaption()}
                className="min-h-14 rounded-sm text-lg font-medium disabled:opacity-40"
                style={{ background: "var(--ink)", color: "var(--paper)" }}
              >
                {busy === "sending" ? "Adding…" : "Stick this photo"}
              </motion.button>
            </label>
          )}
        </section>
      ) : (
        <section className="flex flex-col gap-3">
          {voiceStep === "hold" ? (
            <>
              <motion.button
                type="button"
                whileTap={tap}
                disabled={busy !== null}
                onPointerDown={(e) => void startRecording(e)}
                onPointerUp={() => void stopRecording()}
                onPointerCancel={() => void stopRecording()}
                className="flex min-h-44 flex-col items-center justify-center gap-3 rounded-sm px-6 py-8 text-center disabled:opacity-70"
                style={{ background: recording ? "var(--note)" : "var(--ink)", color: recording ? "var(--note-ink)" : "var(--paper)" }}
              >
                <MicIcon />
                <span className="text-xl font-medium" style={{ fontFamily: SERIF }}>
                  {recording ? "Listening…" : "Hold to talk"}
                </span>
                <span className="text-sm opacity-80">{recording ? "Release when you're done" : "Say one idea"}</span>
                <span className="flex h-3 w-40 items-end gap-1" aria-hidden>
                  {Array.from({ length: 12 }, (_, i) => (
                    <span
                      key={i}
                      className="w-full rounded-sm"
                      style={{
                        height: `${Math.max(4, (reduce ? 8 : level) * (8 + ((i * 17) % 24)))}px`,
                        background: "currentColor",
                        opacity: 0.35 + (i / 12) * 0.65,
                      }}
                    />
                  ))}
                </span>
              </motion.button>
              <p className="sr-only" aria-live="polite">
                {recording ? "Recording" : "Not recording"}
              </p>
            </>
          ) : (
            <label className="flex flex-col gap-2">
              <span className="text-sm" style={{ color: "var(--ink-soft)" }}>
                We heard this. Change any word before it sticks.
              </span>
              <textarea
                value={transcript}
                rows={3}
                maxLength={IDEA_TEXT_MAX}
                aria-label="Transcript"
                onChange={(e) => setTranscript(e.target.value)}
                className="min-h-24 rounded-sm p-3 text-lg outline-none"
                style={{ background: "var(--sticky)", rotate: "-1deg" }}
              />
              <motion.button
                type="button"
                whileTap={tap}
                disabled={busy !== null || !transcript.trim()}
                onClick={() => void submitTranscript()}
                className="min-h-14 rounded-sm text-lg font-medium disabled:opacity-40"
                style={{ background: "var(--ink)", color: "var(--paper)" }}
              >
                {busy === "sending" ? "Adding…" : "Stick this voice note"}
              </motion.button>
              <button
                type="button"
                onClick={() => {
                  setVoiceStep("hold");
                  setPendingMedia(null);
                }}
                className="py-2 text-sm"
                style={{ color: "var(--ink-soft)" }}
              >
                Record again
              </button>
            </label>
          )}
        </section>
      )}

      <div aria-live="polite" className="min-h-6 text-sm">
        {progress && <p style={{ color: "var(--ink-soft)" }}>{progress}</p>}
        {error && (
          <p role="alert" style={{ color: "var(--signal-ink)" }}>
            {error}
          </p>
        )}
        {!error && !progress && sent && <p style={{ color: "var(--ink-soft)" }}>{sent}</p>}
      </div>

      <footer className="mt-auto text-xs" style={{ color: "var(--ink-faint)" }}>
        {speaker ? `Adding as ${speaker}` : "Adding anonymously"}
        {state ? ` · ${state.ideas.length} ideas so far` : ""}
      </footer>
    </div>
  );
}

function ActionButton({
  label,
  hint,
  onClick,
  icon,
  tone,
  tap,
}: {
  label: string;
  hint: string;
  onClick: () => void;
  icon: React.ReactNode;
  tone: "sticky" | "ink" | "paper";
  tap?: { scale: number };
}) {
  const style =
    tone === "ink"
      ? { background: "var(--ink)", color: "var(--paper)" }
      : tone === "sticky"
        ? { background: "var(--sticky)", color: "var(--ink)" }
        : { background: "var(--paper-2, var(--paper))", color: "var(--ink)", border: "1px solid var(--ink-faint)" };
  return (
    <motion.button
      type="button"
      whileTap={tap}
      onClick={onClick}
      className="flex min-h-20 items-center gap-4 rounded-sm px-5 py-4 text-left shadow-[2px_3px_0_oklch(22%_0.02_60/0.1)]"
      style={style}
    >
      {icon}
      <span>
        <span className="block text-xl font-medium" style={{ fontFamily: SERIF }}>
          {label}
        </span>
        <span className="block text-sm opacity-70">{hint}</span>
      </span>
    </motion.button>
  );
}

function ChipList({
  chips,
  busy,
  validCount,
  onEdit,
  onRemove,
  onSubmit,
  onDiscard,
  reduce,
}: {
  chips: Chip[];
  busy: boolean;
  validCount: number;
  onEdit: (key: number, text: string) => void;
  onRemove: (key: number) => void;
  onSubmit: () => void;
  onDiscard: () => void;
  reduce: boolean;
}) {
  return (
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
              layout={!reduce}
              initial={reduce ? false : { opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="flex items-start gap-2 rounded-sm p-2 shadow-[2px_3px_0_oklch(22%_0.02_60/0.1)]"
              style={{ background: "var(--sticky)", rotate: chip.key % 2 === 0 ? "-1.2deg" : "1.4deg" }}
            >
              <textarea
                value={chip.text}
                rows={2}
                maxLength={IDEA_TEXT_MAX}
                aria-label="Idea text"
                onChange={(e) => onEdit(chip.key, e.target.value)}
                className="min-w-0 flex-1 resize-none bg-transparent px-2 py-1 text-base outline-none"
              />
              <button
                type="button"
                aria-label="Remove this idea"
                onClick={() => onRemove(chip.key)}
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
        whileTap={reduce ? undefined : { scale: 0.97 }}
        disabled={busy || validCount === 0}
        onClick={onSubmit}
        className="mt-2 min-h-14 w-full rounded-sm px-6 py-4 text-lg font-medium disabled:opacity-40"
        style={{ background: "var(--ink)", color: "var(--paper)" }}
      >
        {busy ? "Adding…" : `Add ${validCount} ${validCount === 1 ? "idea" : "ideas"}`}
      </motion.button>
      <button type="button" onClick={onDiscard} className="py-2 text-sm" style={{ color: "var(--ink-soft)" }}>
        Discard and retake
      </button>
    </section>
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

function PenIcon() {
  return (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <path d="M4 20l4.2-.8L19 8.4 15.6 5 4.8 15.8z" strokeLinejoin="round" />
    </svg>
  );
}

function MicIcon() {
  return (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M6 11a6 6 0 0 0 12 0M12 17v4" />
    </svg>
  );
}
