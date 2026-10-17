import type { Metadata } from "next";
import { SiteFrame } from "@/components/site/site-frame";
import { InsightsView } from "./insights-view";

export const metadata: Metadata = {
  title: "Insights · Blind Spot",
  description: "How a team's thinking changes over time.",
};

export default function InsightsPage() {
  return (
    <SiteFrame>
      <InsightsView />
    </SiteFrame>
  );
}
