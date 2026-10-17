"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Button } from "@/components/ui/button";
import { reducedTransition, spring } from "@/lib/motion";
import { describeMedia, uploadMedia, type MediaType } from "./media";

export type MediaDraft = { blob: Blob; name: string; mediaType: MediaType; at?: { x: number; y: number } };
export type PlacedMedia = { label: string; media: { mediaType: MediaType; mediaUrl: string; caption: string } | null };

type Phase = "uploading" | "describing" | "ready" | "failed";

/**
 * Human-on-the-loop: the AI only describes what's in the image or audio.
 * The person reads, edits the label, and decides to place it.
 */
export function MediaComposer({
  draft,
  sessionId,
  onPlace,
  onClose,
}: {
  draft: MediaDraft;
  sessionId: string;
  onPlace: (placed: PlacedMedia) => void;
  onClose: () => void;
}) {
  const reduce = useReducedMotion();
  const [phase, setPhase] = useState<Phase>("uploading");
  const [label, setLabel] = useState("");
  const [uploaded, setUploaded] = useState<{ url: string; caption: string } | null>(null);
  const touched = useRef(false);
  // Object URL lives as long as the composer; revoking in an effect breaks under StrictMode re-runs.
  const [preview] = useState(() => URL.createObjectURL(draft.blob));

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const { url, mediaType } = await uploadMedia(draft.blob, sessionId, draft.name);
        if (!live) return;
        setPhase("describing");
        const caption = await describeMedia(url, mediaType);
        if (!live) return;
        setUploaded({ url, caption });
        if (!touched.current) setLabel(shortLabel(caption));
        setPhase("ready");
      } catch {
        if (live) setPhase("failed");
      }
    })();
    return () => {
      live = false;
    };
  }, [draft, sessionId]);

  const working = phase === "uploading" || phase === "describing";
  const verb = draft.mediaType === "audio" ? "Transcribing" : "Describing";

  function place() {
    const text = label.trim();
    if (!text) return;
    onPlace({
      label: text,
      media: uploaded ? { mediaType: draft.mediaType, mediaUrl: uploaded.url, caption: uploaded.caption } : null,
    });
  }

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label={draft.mediaType === "audio" ? "Place a voice note" : "Place an image"}
      className="fixed inset-0 z-50 grid place-items-center bg-[oklch(22%_0.02_60/0.35)] p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
    >
      <motion.div
        className="w-full max-w-sm rounded-[6px] bg-paper-raised p-4 pb-5 shadow-[0_30px_60px_-24px_oklch(25%_0.04_60/0.6)]"
        initial={reduce ? false : { y: 16, rotate: -2, scale: 0.96 }}
        animate={{ y: 0, rotate: -0.6, scale: 1 }}
        transition={reduce ? reducedTransition : spring.gentle}
        onClick={(e) => e.stopPropagation()}
      >
        {draft.mediaType === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="" className="aspect-[4/3] w-full rounded-[3px] bg-paper-sunk object-cover" />
        ) : (
          <div className="rounded-[3px] bg-paper-sunk p-3">
            <audio controls src={preview} className="w-full" />
          </div>
        )}
        <div className="relative mt-3">
          <label htmlFor="bs-media-label" className="text-[11px] font-semibold tracking-[0.14em] text-ink-soft uppercase">
            Label — yours to edit
          </label>
          <textarea
            id="bs-media-label"
            autoFocus
            rows={2}
            maxLength={280}
            value={label}
            placeholder={working ? `${verb}…` : "What is this, in your words?"}
            onChange={(e) => {
              touched.current = true;
              setLabel(e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                place();
              }
            }}
            className="mt-1 w-full resize-none rounded-md border border-rule bg-paper px-2.5 py-2 text-sm outline-none focus-visible:border-ink"
          />
          {working ? <div aria-hidden className="bs-shimmer pointer-events-none absolute inset-x-0 bottom-1.5 h-[3.25rem] rounded-md" /> : null}
        </div>
        <p className="mt-1 min-h-4 text-xs text-ink-soft italic" aria-live="polite">
          {phase === "uploading" ? "Uploading…" : null}
          {phase === "describing" ? `${verb}… the AI only describes; it won't add ideas.` : null}
          {phase === "ready" ? "Described. Change anything that's off." : null}
          {phase === "failed" ? "Couldn't read that file. Type a label to place it as a note, or try another." : null}
        </p>
        <div className="mt-3 flex justify-end gap-2">
          <Button type="button" variant="ghost" className="h-9" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" className="h-9 px-4" disabled={!label.trim() || phase === "uploading"} onClick={place}>
            Place it ↵
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/** First sentence of the caption, so the sticky reads like a note, not a paragraph. */
function shortLabel(caption: string): string {
  const first = caption.split(/(?<=[.!?])\s|\s-\s|\n/)[0]?.trim() ?? caption;
  return first.length > 90 ? `${first.slice(0, 88).trimEnd()}…` : first;
}

/** Minimal MediaRecorder wrapper: start() then stop() → audio/webm blob. */
export function useRecorder() {
  const rec = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const [recording, setRecording] = useState(false);

  async function start(): Promise<boolean> {
    if (rec.current) return true;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, MediaRecorder.isTypeSupported("audio/webm") ? { mimeType: "audio/webm" } : undefined);
      chunks.current = [];
      mr.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
      mr.start();
      rec.current = mr;
      setRecording(true);
      return true;
    } catch {
      return false;
    }
  }

  function stop(): Promise<Blob | null> {
    const mr = rec.current;
    if (!mr) return Promise.resolve(null);
    return new Promise((resolve) => {
      mr.onstop = () => {
        mr.stream.getTracks().forEach((t) => t.stop());
        rec.current = null;
        setRecording(false);
        const blob = new Blob(chunks.current, { type: mr.mimeType || "audio/webm" });
        resolve(blob.size > 0 ? blob : null);
      };
      mr.stop();
    });
  }

  return { recording, start, stop };
}
