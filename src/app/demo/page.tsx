import type { Metadata } from "next";
import { DemoTour } from "@/components/demo/demo-tour";

export const metadata: Metadata = {
  title: "Blind Spot · 90-second tour",
  description: "A guided, offline tour of Blind Spot running on scripted data.",
};

export default async function DemoPage({ searchParams }: { searchParams: Promise<{ autoplay?: string }> }) {
  const query = await searchParams;
  return <DemoTour autoplay={query.autoplay === "1"} />;
}
