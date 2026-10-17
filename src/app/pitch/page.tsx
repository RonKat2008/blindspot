import type { Metadata } from "next";
import { Deck } from "./deck";

export const metadata: Metadata = {
  title: "Pitch · Blind Spot",
  description: "Blind Spot in five slides.",
};

export default function PitchPage() {
  return <Deck />;
}
