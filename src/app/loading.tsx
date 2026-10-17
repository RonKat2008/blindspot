export default function Loading() {
  return (
    <div className="grid min-h-dvh place-items-center px-4" aria-busy="true" aria-live="polite">
      <div
        className="bs-shimmer w-56 rotate-[-2deg] rounded-sm px-5 py-6 shadow-[var(--shadow-card)]"
        style={{ backgroundColor: "oklch(93% 0.09 95)" }}
      >
        <p className="font-display text-lg text-[var(--ink-soft)]">Gathering the board…</p>
      </div>
    </div>
  );
}
