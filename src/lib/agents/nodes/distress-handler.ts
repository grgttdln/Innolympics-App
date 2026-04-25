import { DISTRESS_SYSTEM_PROMPT } from "@/lib/agents/prompts/distress";
import { makePersonaHandler, type PersonaRunnable } from "./persona-handler";

export function makeDistressHandler(runnable?: PersonaRunnable) {
  return makePersonaHandler({
    systemPrompt: DISTRESS_SYSTEM_PROMPT,
    temperature: 0.6,
    runnable,
  });
}
