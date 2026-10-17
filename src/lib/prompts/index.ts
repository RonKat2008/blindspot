// OWNER: Claude prompts subagent. This stub is template-only so the backend can integrate now.
// The real implementation (LLM + Haiku judge + regex blocklist) keeps these exact exports.
import type {
  Axis,
  DetectionSignal,
  Idea,
  PromptsModule,
  ProposedAxis,
  ProvocationWhy,
} from "../contract";
import { templateProvocation } from "./templates";

export const DEFAULT_AXES: ProposedAxis[] = [
  { poleA: "incremental", poleB: "radical" },
  { poleA: "individual", poleB: "social" },
  { poleA: "digital", poleB: "physical" },
  { poleA: "short-term", poleB: "long-term" },
  { poleA: "low-cost", poleB: "high-investment" },
];

export async function proposeAxes(prompt: string): Promise<ProposedAxis[]> {
  void prompt;
  return DEFAULT_AXES;
}

export async function writeProvocation(
  signal: DetectionSignal,
  ideas: Idea[],
  axes: Axis[],
  prompt: string,
): Promise<{ text: string; why: ProvocationWhy }> {
  void prompt;
  return templateProvocation(signal, ideas, axes);
}

export const prompts: PromptsModule = { proposeAxes, writeProvocation };
