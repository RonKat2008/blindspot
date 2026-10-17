import type { Metadata } from "next";
import { DemoStage } from "@/components/board/demo-stage";

export const metadata: Metadata = {
  title: "Blind Spot · 90-second tour",
  description: "A guided, offline tour of Blind Spot running on scripted data.",
};

export default async function DemoPage({ searchParams }: { searchParams: Promise<{ autoplay?: string }> }) {
  const query = await searchParams;
  return <DemoStage autoplay={query.autoplay === "1"} />;
}
