// OWNER: Claude prompts subagent. LLM + Haiku judge + regex blocklist, with template fallback.
import type {
  Axis,
  DetectionSignal,
  Idea,
  PromptsModule,
  ProposedAxis,
  ProvocationWhy,
} from "../contract";
import { DEFAULT_AXES, proposeAxesLLM } from "./axes";
import { writeProvocationGuarded } from "./provocation";
import { templateProvocation } from "./templates";

export { DEFAULT_AXES };

export async function proposeAxes(prompt: string): Promise<ProposedAxis[]> {
  try {
    return await proposeAxesLLM(prompt);
  } catch {
    return DEFAULT_AXES;
  }
}

export async function writeProvocation(
  signal: DetectionSignal,
  ideas: Idea[],
  axes: Axis[],
  prompt: string,
): Promise<{ text: string; why: ProvocationWhy }> {
  try {
    const { text, why } = await writeProvocationGuarded(signal, ideas, axes, prompt);
    return { text, why };
  } catch {
    return templateProvocation(signal, ideas, axes);
  }
}

export const prompts: PromptsModule = { proposeAxes, writeProvocation };
