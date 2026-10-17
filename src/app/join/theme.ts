import type { CSSProperties } from "react";

/** Field-notebook tokens (docs/DESIGN.md §1) scoped to the device pages. */
export const notebookVars = {
  "--paper": "oklch(97.5% 0.012 85)",
  "--paper-raised": "oklch(99% 0.006 85)",
  "--paper-sunk": "oklch(94% 0.016 85)",
  "--rule": "oklch(86% 0.02 80)",
  "--ink": "oklch(22% 0.02 60)",
  "--ink-soft": "oklch(45% 0.02 60)",
  "--ink-faint": "oklch(62% 0.015 60)",
  "--signal": "oklch(72% 0.17 62)",
  "--signal-ink": "oklch(45% 0.13 55)",
  "--signal-wash": "oklch(94% 0.05 75)",
  "--calm": "oklch(70% 0.09 190)",
  "--sticky": "oklch(91% 0.11 98)",
  "--sticky-edge": "oklch(78% 0.1 90)",
  "--note": "oklch(90% 0.045 250)",
  "--note-ink": "oklch(32% 0.08 255)",
  "--dot": "oklch(78% 0.025 80 / 0.85)",
} as CSSProperties;

/** Warm paper with a quiet dot grid, scoped so the rest of the app stays as-is. */
export const boardSurface: CSSProperties = {
  backgroundColor: "var(--paper)",
  backgroundImage: "radial-gradient(circle, var(--dot) 1.15px, transparent 1.2px)",
  backgroundSize: "18px 18px",
};

export const SERIF = "var(--font-fraunces, 'Iowan Old Style', 'Palatino Linotype', Georgia, serif)";
