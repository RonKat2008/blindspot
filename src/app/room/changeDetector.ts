// Pure, ML-free change detection for the room camera: compare tiny grayscale thumbnails.

export const THUMB_W = 64;
export const THUMB_H = 36;
/** Mean abs diff (0..255) above which the wall is "changing". */
export const CHANGE_THRESHOLD = 12;
/** Mean abs diff below which a frame counts as stable. */
export const STABLE_THRESHOLD = 4;
/** How long the wall must stay still after a change before we read it. */
export const SETTLE_MS = 2500;

export type WatchPhase = "watching" | "changing" | "settling";

/** RGBA pixels -> luma bytes. */
export function toGray(rgba: Uint8ClampedArray): Uint8Array {
  const out = new Uint8Array(rgba.length / 4);
  for (let i = 0, j = 0; i < rgba.length; i += 4, j += 1) {
    out[j] = (rgba[i] * 77 + rgba[i + 1] * 150 + rgba[i + 2] * 29) >> 8;
  }
  return out;
}

export function meanAbsDiff(a: Uint8Array, b: Uint8Array): number {
  const n = Math.min(a.length, b.length);
  if (n === 0) return 0;
  let sum = 0;
  for (let i = 0; i < n; i += 1) sum += Math.abs(a[i] - b[i]);
  return sum / n;
}

export type DetectorState = {
  phase: WatchPhase;
  /** Last frame we consider "the wall as it was". */
  stable: Uint8Array | null;
  /** Previous sampled frame (to judge stillness frame-to-frame). */
  prev: Uint8Array | null;
  /** When the current still stretch began (ms), only while settling. */
  stillSince: number | null;
};

export const initialDetector: DetectorState = { phase: "watching", stable: null, prev: null, stillSince: null };

/**
 * Advance the state machine with a new frame. Returns the next state and whether
 * the wall has settled after a change (time to scan). Never mutates the input state.
 */
export function stepDetector(
  s: DetectorState,
  frame: Uint8Array,
  now: number,
): { next: DetectorState; settled: boolean; diff: number } {
  if (!s.stable) return { next: { ...s, stable: frame, prev: frame }, settled: false, diff: 0 };

  const diff = meanAbsDiff(frame, s.stable);
  const motion = s.prev ? meanAbsDiff(frame, s.prev) : 0;

  if (s.phase === "watching") {
    if (diff > CHANGE_THRESHOLD) {
      return { next: { ...s, phase: "changing", prev: frame, stillSince: null }, settled: false, diff };
    }
    return { next: { ...s, prev: frame }, settled: false, diff };
  }

  // changing / settling: wait for frame-to-frame stillness to last SETTLE_MS.
  if (motion >= STABLE_THRESHOLD) {
    return { next: { ...s, phase: "changing", prev: frame, stillSince: null }, settled: false, diff };
  }
  const stillSince = s.stillSince ?? now;
  if (now - stillSince >= SETTLE_MS) {
    // Settled. If it drifted back to the old wall (someone walked past), no scan needed.
    const settled = diff > STABLE_THRESHOLD;
    return { next: { phase: "watching", stable: frame, prev: frame, stillSince: null }, settled, diff };
  }
  return { next: { ...s, phase: "settling", prev: frame, stillSince }, settled: false, diff };
}
