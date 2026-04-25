export type Intent = "crisis" | "distress" | "reflection" | "growth";

export type InputType = "voice" | "text";

export type TriggerType = "crisis_flag" | "mood_decline" | "keyword_match";

export interface ClassificationResult {
  intent: Intent;
  severity: number;
  mood_score: number;
  emotions: string[];
  crisis_keywords_detected: string[];
  needs_immediate_intervention: boolean;
}

export interface MemoryEntry {
  transcript: string;
  ai_response: string | null;
  mood_score: number;
  emotions: string[];
  created_at: string;
}

export interface JournalState {
  transcript: string;
  input_type: InputType;
  user_id: number;

  intent: Intent | null;
  severity: number;
  mood_score: number;
  emotions: string[];
  crisis_keywords_detected: string[];
  needs_immediate_intervention: boolean;

  memory_context: MemoryEntry[];

  draft_response: string;
  safety_passed: boolean;
  safety_retry_count: number;
  retry_reason: string | null;

  flagged: boolean;
  needs_escalation: boolean;
  entry_id: string | null;
}

export interface JournalApiResponse {
  intent: Intent;
  severity: number;
  mood_score: number;
  emotions: string[];
  response: string;
  flagged: boolean;
  needs_escalation: boolean;
  entry_id: string;
}

export interface EscalationEventPayload {
  trigger_type: TriggerType;
  severity: number;
  context?: Record<string, unknown>;
  entry_id?: string | null;
}
