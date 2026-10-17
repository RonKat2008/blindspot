import Link from "next/link";
import { cn } from "@/lib/utils";

/** Small pill linking to the guided /demo tour. Mount on the landing page. */
export function TourLink({ className }: { className?: string }) {
  return (
    <Link
      href="/demo"
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-sm text-foreground shadow-sm transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        className,
      )}
    >
      <span aria-hidden="true" className="size-1.5 rounded-full bg-[oklch(0.72_0.17_62)]" />
      Take the 90-second tour
      <span aria-hidden="true">→</span>
    </Link>
  );
}
