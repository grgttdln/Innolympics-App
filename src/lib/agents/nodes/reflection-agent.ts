import { REFLECTION_SYSTEM_PROMPT } from "@/lib/agents/prompts/reflection";
import { makePersonaHandler, type PersonaRunnable } from "./persona-handler";

export function makeReflectionAgent(runnable?: PersonaRunnable) {
  return makePersonaHandler({
    systemPrompt: REFLECTION_SYSTEM_PROMPT,
    temperature: 0.7,
    runnable,
  });
}
