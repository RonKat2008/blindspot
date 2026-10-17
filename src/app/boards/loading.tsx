import { SiteFrame } from "@/components/site/site-frame";

export default function BoardsLoading() {
  return (
    <SiteFrame>
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-8" aria-busy="true" aria-live="polite">
        <div className="h-12 w-64 rounded-sm bg-[var(--paper-sunk)]" />
        <ul className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <li
              key={i}
              className="bs-shimmer h-52 rounded-sm shadow-[var(--shadow-card)]"
              style={{ backgroundColor: "oklch(93% 0.06 90)", animationDelay: `${i * 120}ms` }}
            />
          ))}
        </ul>
      </div>
    </SiteFrame>
  );
}
