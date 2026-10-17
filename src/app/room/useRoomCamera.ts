"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  THUMB_H,
  THUMB_W,
  initialDetector,
  stepDetector,
  toGray,
  type DetectorState,
  type WatchPhase,
} from "./changeDetector";

const SAMPLE_MS = 700;
const CAPTURE_MAX_PX = 1280;
const JPEG_QUALITY = 0.8;

export type CameraStatus = "idle" | "requesting" | "live" | "error";

export interface CameraDevice {
  deviceId: string;
  label: string;
}

function friendlyCameraError(err: unknown): string {
  const name = err instanceof DOMException ? err.name : "";
  if (name === "NotAllowedError" || name === "SecurityError")
    return "The browser didn't let us use the camera. Allow camera access from the address bar, then try again.";
  if (name === "NotFoundError" || name === "OverconstrainedError")
    return "We couldn't find a camera on this device. Plug one in, or try another device.";
  if (name === "NotReadableError")
    return "Another app seems to be using the camera. Close it, then try again.";
  return "The camera didn't start. Give it another try.";
}

/**
 * Camera + ML-free change detection. Calls `onSettled` when the wall changed and then
 * held still long enough to be worth reading.
 */
export function useRoomCamera(onSettled: () => void) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<DetectorState>(initialDetector);
  const thumbRef = useRef<HTMLCanvasElement | null>(null);
  const onSettledRef = useRef(onSettled);
  const [status, setStatus] = useState<CameraStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [devices, setDevices] = useState<CameraDevice[]>([]);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [phase, setPhase] = useState<WatchPhase>("watching");

  useEffect(() => {
    onSettledRef.current = onSettled;
  }, [onSettled]);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const start = useCallback(
    async (preferredId?: string) => {
      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        setStatus("error");
        setError("This browser can't reach a camera here. Open the page over https or on localhost.");
        return;
      }
      setStatus("requesting");
      setError(null);
      stop();
      try {
        const video: MediaTrackConstraints = preferredId
          ? { deviceId: { exact: preferredId }, width: { ideal: 1280 }, height: { ideal: 720 } }
          : { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } };
        const stream = await navigator.mediaDevices.getUserMedia({ video, audio: false });
        streamRef.current = stream;
        detectorRef.current = initialDetector;
        setPhase("watching");
        const el = videoRef.current;
        if (el) {
          el.srcObject = stream;
          await el.play().catch(() => undefined);
        }
        const active = stream.getVideoTracks()[0]?.getSettings().deviceId ?? preferredId ?? null;
        setDeviceId(active);
        const all = await navigator.mediaDevices.enumerateDevices();
        setDevices(
          all
            .filter((d) => d.kind === "videoinput")
            .map((d, i) => ({ deviceId: d.deviceId, label: d.label || `Camera ${i + 1}` })),
        );
        setStatus("live");
      } catch (err) {
        setStatus("error");
        setError(friendlyCameraError(err));
      }
    },
    [stop],
  );

  // Attach the stream if the <video> mounts after start() resolved.
  useEffect(() => {
    const el = videoRef.current;
    if (status === "live" && el && streamRef.current && el.srcObject !== streamRef.current) {
      el.srcObject = streamRef.current;
      void el.play().catch(() => undefined);
    }
  }, [status]);

  useEffect(() => stop, [stop]);

  // Sampling loop: 64x36 grayscale thumbnail every SAMPLE_MS.
  useEffect(() => {
    if (status !== "live") return;
    if (!thumbRef.current) {
      const c = document.createElement("canvas");
      c.width = THUMB_W;
      c.height = THUMB_H;
      thumbRef.current = c;
    }
    const ctx = thumbRef.current.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;
    const id = window.setInterval(() => {
      const el = videoRef.current;
      if (!el || el.readyState < 2) return;
      ctx.drawImage(el, 0, 0, THUMB_W, THUMB_H);
      const gray = toGray(ctx.getImageData(0, 0, THUMB_W, THUMB_H).data);
      const { next, settled } = stepDetector(detectorRef.current, gray, performance.now());
      detectorRef.current = next;
      setPhase(next.phase);
      if (settled) onSettledRef.current();
    }, SAMPLE_MS);
    return () => window.clearInterval(id);
  }, [status]);

  /** Full frame, downscaled to <= 1280px, as a JPEG data URL. */
  const captureFrame = useCallback((): string | null => {
    const el = videoRef.current;
    if (!el || el.readyState < 2 || !el.videoWidth) return null;
    const scale = Math.min(1, CAPTURE_MAX_PX / Math.max(el.videoWidth, el.videoHeight));
    const c = document.createElement("canvas");
    c.width = Math.round(el.videoWidth * scale);
    c.height = Math.round(el.videoHeight * scale);
    const ctx = c.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(el, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", JPEG_QUALITY);
  }, []);

  /** After a manual scan, treat the current wall as the new baseline. */
  const rebaseline = useCallback(() => {
    detectorRef.current = initialDetector;
    setPhase("watching");
  }, []);

  return { videoRef, status, error, devices, deviceId, phase, start, captureFrame, rebaseline };
}
