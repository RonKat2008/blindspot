import type { Metadata } from "next";
import { WhyView } from "./why-view";

export const metadata: Metadata = {
  title: "How we built it · Blind Spot",
  description:
    "The human judgment calls behind Blind Spot: what the AI proposed, and what we decided.",
};

export default function WhyPage() {
  return <WhyView />;
}
