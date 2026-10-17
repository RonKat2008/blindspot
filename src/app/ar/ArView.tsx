"use client";

import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Idea, SessionState } from "@/lib/contract";
import { api } from "@/lib/api-client";
import type { ArScene } from "./scene";

const POLL_MS = 2000;

type Phase = "intro" | "running";

type OrientationPermissionFn = () => Promise<"granted" | "denied">;

/** iOS 13+ gates motion behind a user-gesture permission prompt. Must be called inside the tap. */
function requestMotionPermission(): Promise<boolean> {
  const DOE = typeof window !== "undefined" ? window.DeviceOrientationEvent : undefined;
  if (!DOE) return Promise.resolve(false);
  const req = (DOE as unknown as { requestPermission?: OrientationPermissionFn }).requestPermission;
  if (typeof req !== "function") return Promise.resolve(true);
  return req.call(DOE).then(
    (r) => r === "granted",
    () => false,
  );
}

function requestCamera(): Promise<MediaStream | null> {
  if (!navigator.mediaDevices?.getUserMedia) return Promise.resolve(null);
  return navigator.mediaDevices
    .getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false })
    .catch(() => null);
}

export function ArView({ sessionId }: { sessionId: string }) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [state, setState] = useState<SessionState | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notes, setNotes] = useState<string[]>([]);
  const [selected, setSelected] = useState<Idea | null>(null);
  const [hasCamera, setHasCamera] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const sceneRef = useRef<ArScene | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const stateRef = useRef<SessionState | null>(null);
  const motionGrantedRef = useRef(false);

  // Poll the board state every 2s while the tab is visible.
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const load = async () => {
      if (document.hidden) return;
      try {
        const s = await api.getState(sessionId);
        if (cancelled) return;
        stateRef.current = s;
        setState(s);
        setLoadError(null);
        sceneRef.current?.update(s);
      } catch (e) {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : "Couldn't load this board.");
      }
    };
    const loop = async () => {
      await load();
      if (!cancelled) timer = setTimeout(loop, POLL_MS);
    };
    void loop();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [sessionId]);

  // Build the three.js scene once running.
  useEffect(() => {
    if (phase !== "running") return;
    let disposed = false;
    const onVisibility = () => sceneRef.current?.setPaused(document.hidden);
    void import("./scene").then(({ createArScene }) => {
      if (disposed || !canvasRef.current) return;
      const scene = createArScene(canvasRef.current, {
        onPick: (id) => setSelected(stateRef.current?.ideas.find((i) => i.id === id) ?? null),
      });
      sceneRef.current = scene;
      if (stateRef.current) scene.update(stateRef.current);
      if (motionGrantedRef.current) scene.enableOrientation();
      document.addEventListener("visibilitychange", onVisibility);
      // If no motion data arrives (desktop, denied), tell the user they can drag instead.
      setTimeout(() => {
        if (!disposed && !scene.hasOrientation()) {
          setNotes((n) => (n.some((x) => x.startsWith("Drag")) ? n : [...n, "Drag to look around."]));
        }
      }, 1500);
    });
    return () => {
      disposed = true;
      document.removeEventListener("visibilitychange", onVisibility);
      sceneRef.current?.dispose();
      sceneRef.current = null;
    };
  }, [phase]);

  // Stop the camera on unmount.
  useEffect(
    () => () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    },
    [],
  );

  const start = useCallback(() => {
    // Both prompts must start synchronously inside the tap (iOS).
    const motionP = requestMotionPermission();
    const cameraP = requestCamera();
    setPhase("running");
    void motionP.then((granted) => {
      motionGrantedRef.current = granted;
      if (granted) sceneRef.current?.enableOrientation();
      else setNotes((n) => [...n, "Motion access is off — no problem, drag to look around."]);
    });
    void cameraP.then((stream) => {
      if (!stream) {
        setNotes((n) => [...n, "Camera is off, so you'll see a dark room instead. Your ideas are all still here."]);
        return;
      }
      streamRef.current = stream;
      setHasCamera(true);
      const v = videoRef.current;
      if (v) {
        v.srcObject = stream;
        void v.play().catch(() => undefined);
      }
    });
  }, []);

  const ideaCount = state?.ideas.length ?? 0;

  if (phase === "intro") {
    return (
      <main className="relative flex min-h-dvh flex-col justify-between overflow-hidden bg-[#0b1020] px-6 pb-10 pt-14 text-white">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 top-24 h-72 w-72 rounded-full bg-amber-400/20 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -left-20 bottom-40 h-64 w-64 rounded-full bg-sky-400/20 blur-3xl"
        />
        <div className="relative">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-300/90">Blind Spot · AR</p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight">See your ideas around you</h1>
          <p className="mt-4 max-w-sm text-base leading-relaxed text-white/70">
            Every idea floats where its lenses put it. Turn around to find the clusters — and the amber ring where
            nobody has been yet.
          </p>
          {state && (
            <p className="mt-6 text-sm text-white/60">
              “{state.session.prompt}” · {ideaCount} idea{ideaCount === 1 ? "" : "s"}
            </p>
          )}
          {loadError && <p className="mt-6 text-sm text-rose-300">{loadError}</p>}
        </div>
        <div className="relative">
          <button
            type="button"
            onClick={start}
            className="w-full rounded-2xl bg-amber-300 px-6 py-4 text-lg font-semibold text-[#0b1020] shadow-[0_10px_40px_-10px_rgba(252,211,77,0.7)] transition active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-200"
          >
            Start AR view
          </button>
          <p className="mt-3 text-center text-xs text-white/50">
            We&apos;ll ask for your camera and motion. Nothing is recorded or uploaded.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="fixed inset-0 overflow-hidden bg-[radial-gradient(ellipse_at_center,#1b2240_0%,#05070f_75%)] text-white">
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${hasCamera ? "opacity-100" : "opacity-0"}`}
      />
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-black/35" />
      <canvas
        ref={canvasRef}
        data-testid="ar-canvas"
        data-points={ideaCount}
        className="absolute inset-0 h-full w-full touch-none"
      />

      <header className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-4">
        <div className="pointer-events-auto rounded-full bg-black/45 px-3 py-1.5 text-xs backdrop-blur">
          {Math.min(ideaCount, 60)} idea{ideaCount === 1 ? "" : "s"} around you
        </div>
        <Link
          href={`/s/${sessionId}`}
          className="pointer-events-auto rounded-full bg-black/45 px-3 py-1.5 text-xs backdrop-blur hover:bg-black/60"
        >
          Exit
        </Link>
      </header>

      {notes.length > 0 && (
        <div className="pointer-events-none absolute inset-x-4 top-14 space-y-2">
          {notes.map((n) => (
            <p key={n} className="rounded-xl bg-black/50 px-3 py-2 text-xs text-white/85 backdrop-blur">
              {n}
            </p>
          ))}
        </div>
      )}

      <AnimatePresence>
        {selected && (
          <motion.section
            key={selected.id}
            role="dialog"
            aria-label="Idea"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="absolute inset-x-0 bottom-0 max-h-[60dvh] overflow-y-auto rounded-t-3xl bg-[#f7f3ea] p-5 pb-8 text-[#0b1020] shadow-2xl"
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-black/20" />
            <div className="flex items-start gap-3">
              <span
                aria-hidden
                className="mt-1.5 h-3 w-3 shrink-0 rounded-full"
                style={{ background: selected.color ?? "#7dd3fc" }}
              />
              <div className="min-w-0 flex-1">
                {selected.speaker && <p className="text-xs font-medium text-black/50">{selected.speaker}</p>}
                <p className="text-lg leading-snug">{selected.text || selected.mediaCaption || "Untitled point"}</p>
                {selected.mediaType === "image" && selected.mediaUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={selected.mediaUrl} alt={selected.mediaCaption ?? ""} className="mt-3 max-h-48 rounded-xl object-cover" />
                )}
                {selected.mediaType === "audio" && selected.mediaUrl && (
                  <audio controls src={selected.mediaUrl} className="mt-3 w-full" />
                )}
                {selected.mediaCaption && selected.text && (
                  <p className="mt-2 text-sm text-black/60">{selected.mediaCaption}</p>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="mt-5 w-full rounded-xl bg-[#0b1020] py-3 text-sm font-semibold text-white"
            >
              Back to the room
            </button>
          </motion.section>
        )}
      </AnimatePresence>
    </main>
  );
}
