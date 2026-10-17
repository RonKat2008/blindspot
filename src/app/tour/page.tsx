import type { Metadata } from "next";
import { CHAPTERS } from "@/components/tour/chapters";
import { LiveTour } from "@/components/tour/live/live-tour";
import { Tour } from "@/components/tour/tour";

export const metadata: Metadata = {
  title: "Blind Spot · Product tour",
  description: "A chaptered tour of every Blind Spot feature and why it matters. Add ?autoplay=1 for a timed run.",
};

type Search = { autoplay?: string | string[]; chapter?: string | string[]; live?: string | string[]; mode?: string | string[] };

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export default async function TourPage({ searchParams }: { searchParams: Promise<Search> }) {
  const query = await searchParams;
  const isGuided = first(query.mode) === "guided";
  // Recording default: ?autoplay=1 runs the live tour; ?autoplay=1&mode=guided runs the chapters.
  if (first(query.live) === "1" || (first(query.autoplay) === "1" && !isGuided)) return <LiveTour />;
  const requested = Number.parseInt(first(query.chapter) ?? "1", 10);
  // Chapters are 1-based in the URL; CHAPTERS.length + 1 is the end card.
  const index = Number.isFinite(requested) ? Math.max(0, Math.min(CHAPTERS.length, requested - 1)) : 0;
  return <Tour initialIndex={index} initialAutoplay={first(query.autoplay) === "1"} />;
}
