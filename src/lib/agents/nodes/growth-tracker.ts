import { GROWTH_SYSTEM_PROMPT } from "@/lib/agents/prompts/growth";
import { makePersonaHandler, type PersonaRunnable } from "./persona-handler";

export function makeGrowthTracker(runnable?: PersonaRunnable) {
  return makePersonaHandler({
    systemPrompt: GROWTH_SYSTEM_PROMPT,
    temperature: 0.7,
    runnable,
  });
}
