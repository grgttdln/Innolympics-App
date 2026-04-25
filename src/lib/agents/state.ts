import { Annotation } from "@langchain/langgraph";
import type { Intent, InputType, MemoryEntry } from "@/lib/types";

/**
 * LangGraph `Annotation` channel set that mirrors the `JournalState`
 * interface in `src/lib/types.ts`. Each channel defines a reducer and
 * default; LangGraph merges per-node return values via these reducers.
 *
 * For simple scalar fields we use the default "last write wins" pattern:
 * `reducer: (_, next) => next`.
 */
export const GraphStateAnnotation = Annotation.Root({
  transcript: Annotation<string>({
    reducer: (_, next) => next,
    default: () => "",
  }),
  input_type: Annotation<InputType>({
    reducer: (_, next) => next,
    default: () => "text",
  }),
  user_id: Annotation<number>({
    reducer: (_, next) => next,
    default: () => 0,
  }),

  intent: Annotation<Intent | null>({
    reducer: (_, next) => next,
    default: () => null,
  }),
  severity: Annotation<number>({
    reducer: (_, next) => next,
    default: () => 0,
  }),
  mood_score: Annotation<number>({
    reducer: (_, next) => next,
    default: () => 0,
  }),
  emotions: Annotation<string[]>({
    reducer: (_, next) => next,
    default: () => [],
  }),
  crisis_keywords_detected: Annotation<string[]>({
    reducer: (_, next) => next,
    default: () => [],
  }),
  needs_immediate_intervention: Annotation<boolean>({
    reducer: (_, next) => next,
    default: () => false,
  }),

  memory_context: Annotation<MemoryEntry[]>({
    reducer: (_, next) => next,
    default: () => [],
  }),

  draft_response: Annotation<string>({
    reducer: (_, next) => next,
    default: () => "",
  }),
  safety_passed: Annotation<boolean>({
    reducer: (_, next) => next,
    default: () => false,
  }),
  safety_retry_count: Annotation<number>({
    reducer: (_, next) => next,
    default: () => 0,
  }),
  retry_reason: Annotation<string | null>({
    reducer: (_, next) => next,
    default: () => null,
  }),

  flagged: Annotation<boolean>({
    reducer: (_, next) => next,
    default: () => false,
  }),
  needs_escalation: Annotation<boolean>({
    reducer: (_, next) => next,
    default: () => false,
  }),
  entry_id: Annotation<string | null>({
    reducer: (_, next) => next,
    default: () => null,
  }),
});

export type GraphState = typeof GraphStateAnnotation.State;
export type GraphStateUpdate = typeof GraphStateAnnotation.Update;
