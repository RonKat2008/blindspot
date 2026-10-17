"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { api } from "@/lib/api-client";
import type { SessionState } from "@/lib/contract";
import { SERIF } from "../join/theme";
import { useSessionState } from "../join/useSessionState";
import { newNotesOnly } from "./dedupe";
import { AUTO_ACCEPT_MS, PendingTray, type PendingNote } from "./PendingTray";
import { RoomResponse } from "./RoomResponse";
import { useRoomCamera } from "./useRoomCamera";

const POLL_MS = 2000;
const MIN_SCAN_GAP_MS = 8000;
const TICK_MS = 250;
const LAND_ANIM_MS = 900;
const FLASH_MS = 4000;
export const ROOM_SPEAKER = "Room camera";

interface RoomCameraProps {
  sessionId: string;
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

export function RoomCamera({ sessionId }: RoomCameraProps) {
  const reduced = useReducedMotion();
  const { state } = useSessionState(sessionId, POLL_MS);
  const [pending, setPending] = useState<PendingNote[]>([]);
  const [scanning, setScanning] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const stateRef = useRef<SessionState | null>(null);
  const pendingRef = useRef<PendingNote[]>([]);
  const lastScanRef = useRef(0);
  const scanningRef = useRef(false);
  const scanRef = useRef<(manual: boolean) => void>(() => undefined);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);
  useEffect(() => {
    pendingRef.current = pending;
  }, [pending]);
  useEffect(() => {
    if (!flash) return;
    const id = window.setTimeout(() => setFlash(null), FLASH_MS);
    return () => window.clearTimeout(id);
  }, [flash]);

  const onSettled = useCallback(() => scanRef.current(false), []);
  const { videoRef, status, error, devices, deviceId, phase, start, captureFrame, rebaseline } = useRoomCamera(onSettled);

  const scan = useCallback(
    async (manual: boolean) => {
      if (scanningRef.current) return;
      if (Date.now() - lastScanRef.current < MIN_SCAN_GAP_MS) {
        if (manual) setFlash("Just looked — give it a few seconds");
        return;
      }
      const frame = captureFrame();
      if (!frame) return;
      lastScanRef.current = Date.now();
      scanningRef.current = true;
      setScanning(true);
      if (manual) rebaseline();
      try {
        const { texts } = await api.extract(frame);
        const existing = [
          ...(stateRef.current?.ideas.map((i) => i.text) ?? []),
          ...pendingRef.current.map((p) => p.text),
        ];
        const fresh = newNotesOnly(texts, existing);
        if (fresh.length === 0) {
          setFlash(texts.length ? "Nothing new on the wall" : "No notes in view yet");
        } else {
          const deadline = Date.now() + AUTO_ACCEPT_MS;
          setPending((prev) => [
            ...prev,
            ...fresh.map((text) => ({ id: crypto.randomUUID(), text, deadline, landing: false })),
          ]);
        }
      } catch {
        setFlash("Couldn't read the wall — will try again");
      } finally {
        scanningRef.current = false;
        setScanning(false);
      }
    },
    [captureFrame, rebaseline],
  );

  useEffect(() => {
    scanRef.current = (manual) => void scan(manual);
  }, [scan]);

  // Auto-accept: every tick, land the notes whose countdown ran out, in one request.
  useEffect(() => {
    const id = window.setInterval(() => {
      const now = Date.now();
      const due = pendingRef.current.filter((p) => !p.landing && p.deadline !== null && p.deadline <= now);
      if (due.length === 0) return;
      const ids = new Set(due.map((p) => p.id));
      setPending((prev) => prev.map((p) => (ids.has(p.id) ? { ...p, landing: true } : p)));
      pendingRef.current = pendingRef.current.map((p) => (ids.has(p.id) ? { ...p, landing: true } : p));
      api
        .addIdeas(sessionId, { texts: due.map((p) => p.text), source: "photo", speaker: ROOM_SPEAKER })
        .then(() => {
          setFlash(`Added ${plural(due.length, "note")}`);
          window.setTimeout(() => setPending((prev) => prev.filter((p) => !ids.has(p.id))), LAND_ANIM_MS);
        })
        .catch(() => {
          setFlash("Couldn't add those notes — retrying");
          const retryAt = Date.now() + AUTO_ACCEPT_MS;
          setPending((prev) => prev.map((p) => (ids.has(p.id) ? { ...p, landing: false, deadline: retryAt } : p)));
        });
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [sessionId]);

  const onEditStart = useCallback((id: string) => {
    setPending((prev) => prev.map((p) => (p.id === id && !p.landing ? { ...p, deadline: null } : p)));
  }, []);
  const onEditSave = useCallback((id: string, text: string) => {
    const clean = text.trim().slice(0, 280);
    setPending((prev) =>
      clean
        ? prev.map((p) => (p.id === id ? { ...p, text: clean, deadline: Date.now() + AUTO_ACCEPT_MS } : p))
        : prev.filter((p) => p.id !== id),
    );
  }, []);
  const onReject = useCallback((id: string) => {
    setPending((prev) => prev.filter((p) => p.id !== id || p.landing));
  }, []);

  const reviewing = pending.filter((p) => !p.landing).length;
  const pill = scanning
    ? "Looking closely…"
    : reviewing > 0
      ? `Reading ${plural(reviewing, "new note")}…`
      : (flash ?? (phase === "watching" ? "Watching the wall" : "Something changed…"));
  const pillTone = scanning || reviewing > 0 || phase !== "watching" ? "oklch(80% 0.14 75)" : "oklch(78% 0.1 170)";
  const fromRoom = state?.ideas.filter((i) => i.speaker === ROOM_SPEAKER).length ?? 0;
  const live = status === "live";

  return (
    <main className="relative grid h-dvh w-screen grid-rows-[minmax(0,55fr)_minmax(0,45fr)] overflow-hidden bg-[oklch(14%_0.02_255)] text-[oklch(97.5%_0.012_85)] md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] md:grid-rows-1">
      <section aria-label="Camera" className="relative min-h-0 overflow-hidden">
        <video ref={videoRef} muted playsInline autoPlay className="absolute inset-0 h-full w-full object-cover" />

        <AnimatePresence>
          {scanning && (
            <motion.div
              key="sweep"
              aria-hidden
              className="pointer-events-none absolute inset-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {reduced ? (
                <div className="absolute inset-0 bg-[oklch(80%_0.12_190/0.12)]" />
              ) : (
                <motion.div
                  className="absolute inset-x-0 top-0 h-full bg-[linear-gradient(to_bottom,transparent_70%,oklch(85%_0.12_190/0.35)_97%,oklch(92%_0.1_190/0.9)_100%)]"
                  initial={{ y: "-100%" }}
                  animate={{ y: "100%" }}
                  transition={{ duration: 1.6, ease: "easeInOut", repeat: Infinity }}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {live && (
          <>
            <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-3 bg-[linear-gradient(to_bottom,oklch(10%_0.02_255/0.55),transparent)] p-4">
              <p
                role="status"
                className="flex items-center gap-2 rounded-full bg-[oklch(14%_0.02_255/0.72)] px-3.5 py-1.5 text-sm backdrop-blur"
              >
                <span aria-hidden className="size-2 rounded-full" style={{ background: pillTone }} />
                {pill}
              </p>
              <div className="flex items-center gap-2">
                {devices.length > 1 && (
                  <select
                    aria-label="Camera"
                    value={deviceId ?? ""}
                    onChange={(e) => void start(e.target.value)}
                    className="max-w-[16ch] truncate rounded-full bg-[oklch(14%_0.02_255/0.72)] px-3 py-1.5 text-sm backdrop-blur"
                  >
                    {devices.map((d) => (
                      <option key={d.deviceId} value={d.deviceId}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                )}
                <button
                  type="button"
                  onClick={() => void scan(true)}
                  disabled={scanning}
                  className="rounded-full bg-[oklch(97.5%_0.012_85)] px-4 py-1.5 text-sm font-medium text-[oklch(22%_0.04_255)] transition-transform hover:-translate-y-px active:translate-y-0 disabled:opacity-50"
                >
                  Scan now
                </button>
              </div>
            </div>
            <div className="absolute inset-x-0 bottom-0 bg-[linear-gradient(to_top,oklch(10%_0.02_255/0.6),transparent)] p-4 pt-10">
              <PendingTray notes={pending} onEditStart={onEditStart} onEditSave={onEditSave} onReject={onReject} />
            </div>
          </>
        )}
      </section>

      <RoomResponse state={state} fromRoom={fromRoom} />

      {!live && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-[oklch(97.5%_0.012_85)] px-6 text-[oklch(24%_0.05_255)]">
          <div className="max-w-[34rem]">
            <p className="text-xs uppercase tracking-[0.22em] opacity-60">Room camera</p>
            <h1 className="mt-3 text-balance italic leading-[1.04]" style={{ fontFamily: SERIF, fontSize: "clamp(2.2rem, 1rem + 4vw, 4.2rem)" }}>
              Point this camera at your sticky notes
            </h1>
            <p className="mt-4 max-w-[46ch] text-base opacity-75">
              When the wall changes and settles, Blind Spot reads the new notes and puts them on the map. You get five
              seconds to fix or drop each one first.
            </p>
            {error && (
              <p role="alert" className="mt-5 rounded-sm bg-[oklch(93%_0.06_70)] px-4 py-3 text-sm text-[oklch(32%_0.08_55)]">
                {error}
              </p>
            )}
            <button
              type="button"
              onClick={() => void start()}
              disabled={status === "requesting"}
              className="mt-7 rounded-full bg-[oklch(24%_0.05_255)] px-6 py-3 text-base font-medium text-[oklch(97.5%_0.012_85)] shadow-[4px_6px_0_oklch(60%_0.1_190)] transition-transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60"
            >
              {status === "requesting" ? "Asking for the camera…" : error ? "Try again" : "Start camera"}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
