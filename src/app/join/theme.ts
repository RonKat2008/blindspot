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
} as CSSProperties;

export const SERIF = "var(--font-fraunces, 'Iowan Old Style', 'Palatino Linotype', Georgia, serif)";
