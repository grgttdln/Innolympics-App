# LangGraph Journaling Pipeline — Design Spec

**Status:** Draft · **Date:** 2026-04-26 · **Target branch:** `feat/ai-functionality`

## Context

The repo ships two journaling surfaces today — a text freeform editor with idle-triggered follow-up suggestions, and a voice mode that talks to Gemini Live directly. Both are thin: text saves nothing to the server, voice has no `systemInstruction` or `tools` configured, crisis safety is a single safety-filter flag, and nothing persists to a database.

This spec lifts both surfaces to the architecture described in `solution-design-document.md` — a LangGraph-orchestrated backend that classifies every entry into `crisis | distress | reflection | growth`, routes to a specialized handler, evaluates the draft through a safety gate with retries, persists to Neon Postgres with pgvector RAG, and detects longitudinal mood decline. Voice gains function-call-driven memory access, client-side crisis interception with PH hotlines, and fire-and-forget backend writes on every turn.

Work ships in three phases, each independently mergeable. The text and voice paths converge at a single backend endpoint so the pipeline, schema, and memory system are shared.

## Decisions locked during brainstorming

| Decision | Value |
|---|---|
| Scope | Full doc, implemented in 3 sequential phases |
| Spec shape | One design spec, three implementation plans |
| Auth | Keep existing `x-user-id` header + integer user IDs |
| Embedding model | `text-embedding-004` @ 768 dimensions |
| LLM models | `gemini-3.1-flash-lite-preview` for all LangGraph nodes; `gemini-3.1-flash-live-preview` for voice |
| Voice transport | Keep client-side `@google/genai` SDK with ephemeral tokens (no server WebSocket proxy) |
| LangGraph | Full `@langchain/langgraph` StateGraph + `@langchain/google-genai` |
| LangGraph checkpointer | None — in-memory state, add later if needed |
| Safety gate retries | 2 (matches doc); safe generic fallback on 3rd fail |
| Hotlines | PH only (NCMH 1553, Hopeline PH 0917-558-4673, In Touch 0917-572-4673) |
| Text UX | LangGraph runs on save; existing `/api/journal/suggest` unchanged for idle suggestions |
| Voice storage | IndexedDB kept as client cache; DB write added on `turnComplete` |
| Post-processing | `update_memory` + `check_escalation` run synchronously inside the graph |
| Voice `userId` | Passed as explicit argument to `useLiveConversation` |

## Architecture

Text and voice converge at `POST /api/journal`. Text awaits it; voice fires-and-forgets. Voice's sub-50ms function calls (`get_journal_context`, `log_mood_score`) bypass the graph and hit memory routes directly. Client-side crisis scanning runs independently of the graph.

```
CLIENT                                 SERVER
─────                                  ──────
/journal/text/freeform ── save ──┐
                                  ├─ POST /api/journal
/journal/voice/ ─ turnComplete ──┘         │
(async fire-forget)                        ▼
                                   LangGraph StateGraph
                                   ┌──────────────────┐
                                   │  classify_input  │
                                   └────────┬─────────┘
                            crisis?         │
                           ┌────────────────┼────────────────┐
                           ▼                                 ▼
                ┌───────────────────┐             ┌──────────────────┐
                │  crisis_handler   │             │  memory_context  │
                │  (static, logs    │             │  (pgvector RAG)  │
                │   escalation)     │             └────────┬─────────┘
                └────────┬──────────┘                      │
                         │                    intent ∈ {distress,
                         │                   reflection, growth}
                         │                                 │
                         │                                 ▼
                         │                    ┌────────────────────────┐
                         │                    │  <intent>_handler LLM  │
                         │                    └────────────┬───────────┘
                         │                                 ▼
                         │                    ┌────────────────────────┐
                         │                    │  safety_gate (≤2 retry)│
                         │                    └────────────┬───────────┘
                         │          safety_passed?         │
                         │                ┌────────────────┤
                         │                ▼                │(false → back to handler
                         │        ┌──────────────┐         │ with retry_reason)
                         └───────►│ compose_reply│◄────────┘
                                  └──────┬───────┘
                                         ▼
                                  ┌─────────────┐
                                  │update_memory│  (embed + INSERT)
                                  └──────┬──────┘
                                         ▼
                                  ┌────────────────┐
                                  │check_escalation│  (last-5 mood query)
                                  └──────┬─────────┘
                                         ▼
                                       response

Function-call fast paths (voice only, bypass graph):
  /api/memory/search    — pgvector query,  <50ms
  /api/memory/log-mood  — single INSERT,   <50ms
  /api/escalation       — crisis event log, fire-forget
  /api/live-token       — existing; fix to mint real ephemeral token
```

**Fail-safe direction.** Keyword match always overrides LLM classification in the crisis direction (keyword says crisis, LLM says reflection → we treat it as crisis). Never the reverse. Crisis handler bypasses the safety gate because its template is static and already safe.

## Data model

Three migrations, additive only. Existing `users` and `posts` tables untouched.

```sql
-- Migration 0003: pgvector + journal tables
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  transcript TEXT NOT NULL,
  ai_response TEXT,
  intent TEXT NOT NULL CHECK (intent IN ('crisis','distress','reflection','growth')),
  severity INTEGER NOT NULL CHECK (severity BETWEEN 0 AND 10),
  mood_score REAL NOT NULL CHECK (mood_score BETWEEN -1.0 AND 1.0),
  emotions TEXT[] NOT NULL DEFAULT '{}',
  flagged BOOLEAN NOT NULL DEFAULT FALSE,
  embedding vector(768),
  input_type TEXT NOT NULL CHECK (input_type IN ('voice','text')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_entries_user_created ON journal_entries(user_id, created_at DESC);
CREATE INDEX idx_entries_embedding
  ON journal_entries USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

CREATE TABLE escalation_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('crisis_flag','mood_decline','keyword_match')),
  severity INTEGER NOT NULL,
  entry_id UUID REFERENCES journal_entries(id) ON DELETE SET NULL,
  context JSONB NOT NULL DEFAULT '{}',
  resolved BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_escalation_user_created ON escalation_events(user_id, created_at DESC);
```

Deviations from the doc:
- `user_id INTEGER REFERENCES users(id)` (matches existing schema + adds FK integrity).
- `mood_score REAL` (Drizzle `real()` maps cleanly; -1.0 to 1.0 fits single-precision).
- `escalation_events.entry_id` links escalation rows back to the triggering entry — makes later admin tooling trivial.

Drizzle schema in `src/lib/db/schema.ts` adds `journalEntries` and `escalationEvents` tables, plus a `customVector(768)` helper (pgvector isn't built into drizzle-orm).

## Agent pipeline — nodes and prompts

Directory layout:

```
src/lib/agents/
  graph.ts               # StateGraph + edges
  state.ts               # JournalState Annotation
  nodes/
    classify-input.ts    # LLM (temp 0) + keyword pre-scan merge
    crisis-handler.ts    # Static template, writes escalation_events
    distress-handler.ts  # LLM (temp 0.6), grounding-first
    reflection-agent.ts  # LLM (temp 0.7), Socratic + memory
    growth-tracker.ts    # LLM (temp 0.7), pattern reinforcement
    safety-gate.ts       # LLM (temp 0), ≤2 retries, fallback
    compose-reply.ts     # Pure
    update-memory.ts     # embed + INSERT (awaited)
    check-escalation.ts  # Last-5-moods query, flag + log if declining
  prompts/
    classify.ts
    distress.ts
    reflection.ts
    growth.ts
    safety.ts
    voice-unified.ts     # Phase 3 — single prompt for Gemini Live
```

### `classify_input` — the highest-stakes node

Runs first. Two-layer design where the keyword scan is a one-way override toward crisis.

```ts
async function classifyInput(state: JournalState): Promise<Partial<JournalState>> {
  const scan = scanForCrisis(state.transcript);

  const llmResult = await llm.withStructuredOutput(ClassifySchema).invoke([
    { role: 'system', content: CLASSIFY_PROMPT },
    { role: 'user', content: state.transcript },
  ]);

  const intent = scan.detected ? 'crisis' : llmResult.intent;
  const severity = scan.detected
    ? Math.max(8, llmResult.severity)
    : llmResult.severity;

  return {
    intent,
    severity,
    mood_score: llmResult.mood_score,
    emotions: llmResult.emotions,
    crisis_keywords_detected: scan.keywords,
    needs_immediate_intervention: scan.detected,
  };
}
```

Classifier prompt (core):

```
You are a classifier for a mental health journaling app. Read the user's
journal entry and output structured JSON with these fields:

- intent: "crisis" | "distress" | "reflection" | "growth"
- severity: integer 0-10
- mood_score: number from -1.0 (extremely negative) to 1.0 (extremely positive)
- emotions: 1-3 dominant emotions as lowercase strings

CRITICAL RULES:
1. If there is ANY mention of self-harm, suicide, wanting to die, or harming
   others — however indirect — classify as "crisis" with severity >= 8.
2. When ambiguous between crisis and distress, choose crisis.
3. When ambiguous about severity, round UP.
4. Do not infer beyond what is written. Do not diagnose.
```

### `crisis_handler` — zero LLM, PH hotlines

Static template. Writes to `escalation_events` with `trigger_type='crisis_flag'` before returning; write is awaited so the log is durable before response.

```
I hear you, and I'm worried about your safety right now. You don't have to
go through this alone. Please reach out:

• NCMH Crisis Hotline: 1553 (toll-free nationwide)
• Hopeline PH: 0917-558-4673
• In Touch Crisis Line: 0917-572-4673

These lines are staffed by people trained to help. If you are in immediate
danger, please call 911 or go to the nearest emergency room.

I'm going to stay quiet for now — the people at those numbers can help you
in a way I cannot. Please reach out to one of them.
```

Crisis handler also skips the safety gate (its template is already safe) and skips `memory_context` (RAG results must not influence the template).

### `distress_handler`, `reflection_agent`, `growth_tracker`

Identical shape: take `{transcript, memory_context[], severity, emotions, retry_reason?}` → `{draft_response}`. Prompts differ:

- **Distress** (temp 0.6): lead with 4-4-4-4 box breathing script OR 5-4-3-2-1 grounding before any journaling transition. Never diagnose. Reference `memory_context` only if it helps reassure.
- **Reflection** (temp 0.7): guided journaling — open-ended prompts, Socratic follow-ups, emotional labeling, validation. Naturally weave in `memory_context` ("last week you mentioned…").
- **Growth** (temp 0.7): pattern reinforcement, celebration, forward-looking prompts. Pull positive trends from `memory_context`.

All three prompts end with the same hard constraints block:
```
NEVER: diagnose conditions, prescribe medication, recommend specific
therapeutic protocols without qualification, minimize distress, argue
with the user's feelings.
ALWAYS: defer to professionals for clinical matters.
```

### `safety_gate` — evaluator with retries

```ts
async function safetyGate(state: JournalState): Promise<Partial<JournalState>> {
  if (state.intent === 'crisis') return { safety_passed: true };

  const verdict = await llm.withStructuredOutput(SafetySchema).invoke([
    { role: 'system', content: SAFETY_PROMPT },
    { role: 'user', content: renderSafetyInput(state) },
  ]);

  if (verdict.pass) return { safety_passed: true };

  if (state.safety_retry_count < 2) {
    return {
      safety_passed: false,
      safety_retry_count: state.safety_retry_count + 1,
      retry_reason: verdict.reason,
    };
  }

  return { safety_passed: true, draft_response: SAFE_FALLBACK_TEXT };
}
```

Safety prompt checks: no diagnosis, no harmful advice, no minimizing, appropriate tone for severity, crisis protocol compliance (if severity ≥ 8, no therapeutic engagement).

Conditional edge: `safety_passed=false` routes back to the same handler with `retry_reason` injected into its prompt.

### Edges

```ts
graph.addEdge(START, 'classify_input');

// First fork: crisis skips both memory and safety gate
graph.addConditionalEdges('classify_input', (s) =>
  s.intent === 'crisis' ? 'crisis_handler' : 'memory_context'
);

// Second fork: route to the persona handler after memory is loaded
graph.addConditionalEdges('memory_context', (s) => `${s.intent}_handler`, {
  distress_handler: 'distress_handler',
  reflection_agent: 'reflection_agent',
  growth_tracker:   'growth_tracker',
});

graph.addEdge('distress_handler', 'safety_gate');
graph.addEdge('reflection_agent', 'safety_gate');
graph.addEdge('growth_tracker',   'safety_gate');

// Safety gate either approves or kicks back to the same handler
graph.addConditionalEdges('safety_gate', (s) =>
  s.safety_passed ? 'compose_reply' : `${s.intent}_handler`
);

graph.addEdge('crisis_handler',  'compose_reply');
graph.addEdge('compose_reply',   'update_memory');
graph.addEdge('update_memory',   'check_escalation');
graph.addEdge('check_escalation', END);
```

`classify_input` and `memory_context` fork via `addConditionalEdges`. There is no separate `route_handler` node — the router is the conditional edge function itself.

### Latency budget (text mode)

| Step | Time |
|---|---|
| classify_input | ~400ms |
| memory_context | ~100ms |
| handler | ~800ms |
| safety_gate | ~400ms |
| update_memory | ~300ms |
| check_escalation | ~50ms |
| **Happy path** | **~2.0s** |
| **Worst case (2 retries)** | **~4.5s** |

## Voice alignment (Phase 3)

Four concrete changes to `src/lib/use-live-conversation.ts`:

**1. Configure the Live session** — pass `systemInstruction` (unified prompt with all four persona rules + PH crisis protocol + box breathing script + instructions to call `get_journal_context` at session start) and `tools` (`get_journal_context`, `log_mood_score` declarations) into `ai.live.connect()`.

**2. Route function calls** — on `toolCall` messages, run the handlers and respond in ≤50ms typical:
- `get_journal_context({ query })` → `POST /api/memory/search` → return entries
- `log_mood_score({ mood_score, emotions })` → `POST /api/memory/log-mood` → return `{status:'logged'}`

Neither handler does any LLM work. Both are single DB operations. Each fetch is wrapped in `AbortController` with a 300ms timeout; on timeout or error, respond to Gemini with a safe empty payload (`{entries: []}` or `{status:'ok'}`) so the turn never stalls. The 300ms ceiling is chosen over 50ms so we don't spuriously abort cold starts — 50ms is the target, 300ms is the bail-out.

**3. Client-side crisis scanner** — on each `inputTranscription` chunk, run `scanForCrisis` (pure, <10ms). On match:
- Clear playback queue immediately
- Show `SupportCard` with PH hotlines
- `POST /api/escalation` with `trigger_type='keyword_match'` (fire-forget)
- Set `elevatedCaution=true` on session ref

This runs **independently of the backend graph**. Even with no network, the user sees hotlines.

**4. Async backend write on `turnComplete`** — fire-and-forget `POST /api/journal` with `{transcript, input_type:'voice', user_id}`. No await. If the response later arrives with `needs_escalation=true`, stash it and prepend context to Gemini on the next user turn via `sendClientContent`. IndexedDB writes continue unchanged (client cache for instant review page load).

Gemini Live constraint handling:
- 10-min session limit → `SessionResumptionConfig` enabled; UI warns at 8:00
- No mid-session instruction updates → single unified prompt, no persona swaps
- Sync function calls → all handlers <50ms, no LLM inside
- No proactive audio on 3.1 → initial `sendClientContent` text to kickstart greeting (already in repo)
- Ephemeral tokens → fix `/api/live-token` to mint real tokens via `ai.authTokens.create()` (currently returns raw API key)

## Shared modules (Phase 1)

```
src/lib/safety/
  crisis-scanner.ts      # pure scanForCrisis(text), <10ms
  crisis-keywords.ts     # single source of truth for keyword list
  ph-hotlines.ts         # hotline constants
  crisis-templates.ts    # CRISIS_INTERCEPT_PH, CRISIS_HANDLER_PH, SAFE_FALLBACK_TEXT

src/lib/memory/
  embed.ts               # embedText(text) → number[768] via text-embedding-004
  rag.ts                 # searchMemory(userId, queryEmbedding, limit=5)
  mood.ts                # getRecentMoodScores, logMood

src/lib/db/
  schema.ts              # extended with journalEntries, escalationEvents
  vector.ts              # customVector(768) helper

src/lib/types.ts         # Intent, InputType, ClassificationResult, JournalState,
                         # MemoryEntry, JournalApiResponse, EscalationEvent
```

`scanForCrisis` must be importable by React components — pure regex, no async, no node-only deps. Keyword list is the doc's list, stored in `crisis-keywords.ts` so client and server import the exact same strings.

## API routes

| Route | Who calls it | Latency budget | Blocking |
|---|---|---|---|
| `POST /api/journal` | Text (on save, awaited) / Voice (on turnComplete, fire-forget) | 2-3s typical | Runs the graph |
| `POST /api/memory/search` | Voice function call `get_journal_context` | <50ms | Single pgvector query |
| `POST /api/memory/log-mood` | Voice function call `log_mood_score` | <50ms | Single INSERT |
| `POST /api/escalation` | Voice crisis scanner, text graph | <100ms | Single INSERT |
| `GET /api/live-token` | Voice client on mount | existing | Mints ephemeral token (fix from debug path) |

All routes validate via existing `x-user-id` header pattern (see `src/app/api/journal/suggest/route.ts:14-27` for the canonical shape).

## Error handling contract

**Graph-level failures:** caught at `/api/journal` boundary. If `scanForCrisis` flags the transcript, log escalation + return crisis template even on graph crash. Otherwise return safe generic, don't persist broken state.

**Function call failures (voice):** `/api/memory/search` timeout/failure → client sends `{entries: []}` back to Gemini. Gemini degrades to "I don't have context from past sessions right now."

**Crisis scanner exception (defensive):** default to `detected=true`. Fail-safe over fail-open.

## Phases and deliverables

### Phase 1: Shared plumbing

**Deliverables:**
- Install deps: `@langchain/langgraph`, `@langchain/google-genai`, `@langchain/core`
- Drizzle migration `0003_journaling.sql` (pgvector + both tables)
- Drizzle schema additions (`journalEntries`, `escalationEvents`, `customVector`)
- `src/lib/safety/` — scanner, keywords, hotlines, templates
- `src/lib/memory/` — embed, rag, mood
- `src/lib/types.ts` — all shared types
- Vitest setup + tests for `scanForCrisis` (20+ cases including Tagalog equivalents, typo variants, euphemisms)

**User-visible behavior:** none. Foundation only.

### Phase 2: Text pipeline

**Deliverables:**
- `src/lib/agents/` full tree (graph, state, 9 nodes, 5 prompts)
- `POST /api/journal` — runs the graph, returns `JournalApiResponse`
- `POST /api/memory/search`, `POST /api/memory/log-mood`, `POST /api/escalation`
- Wire `src/app/journal/text/freeform/page.tsx` to call `/api/journal` on save
- Keep `src/app/api/journal/suggest/route.ts` unchanged — still handles idle follow-ups
- Integration tests covering the 4 intent paths + safety gate retry + fallback

**User-visible behavior:** text saves now produce classified, safety-gated, memory-aware responses. DB accumulates entries.

### Phase 3: Voice alignment

**Deliverables:**
- `src/lib/agents/prompts/voice-unified.ts` — single comprehensive system prompt
- `src/lib/use-live-conversation.ts` — add `userId` arg, pass `systemInstruction`/`tools`, function call router, client crisis scanner, async `/api/journal` POST on `turnComplete`
- `src/app/journal/voice/page.tsx` — pass `userId` from `loadUser()`
- Fix `src/app/api/live-token/route.ts` — mint real ephemeral tokens via `ai.authTokens.create()`
- Reuse existing `SupportCard` as crisis interception UI
- IndexedDB writes continue unchanged (local cache)

**User-visible behavior:** voice mode has persistent memory across sessions, responds in-character for all four emotional states, intercepts crisis keywords <1s even when offline.

## Critical files

Existing files that will be modified:
- `src/lib/db/schema.ts` — add `journalEntries`, `escalationEvents`
- `src/app/journal/text/freeform/page.tsx` — add save handler calling `/api/journal`
- `src/app/journal/voice/page.tsx` — pass `userId` into hook
- `src/lib/use-live-conversation.ts` — configure Live session, route function calls, add crisis scanner, async POST
- `src/app/api/live-token/route.ts` — real ephemeral token minting
- `package.json` — new deps
- `drizzle.config.ts` — no change expected; migration goes under `drizzle/`

Existing files left untouched:
- `src/app/api/journal/suggest/route.ts` — continues to handle idle follow-ups
- `src/lib/gemini.ts` — used by suggest route
- `src/components/follow-up-card.tsx` and `SupportCard` — reused in voice crisis UI
- `src/lib/turns-store.ts` — IndexedDB cache stays

## Testing / verification

**Phase 1:**
- `npm run db:migrate` runs clean; `SELECT extname FROM pg_extension` shows `vector`
- `scanForCrisis('i want to kill myself')` → `{detected:true, keywords:['kill myself']}`
- `embedText('hello')` returns a 768-element `number[]`
- Vitest: 20+ crisis scanner cases pass including Tagalog + typos

**Phase 2 (end-to-end, local):**
```
curl -X POST http://localhost:3000/api/journal \
  -H 'content-type: application/json' -H 'x-user-id: 1' \
  -d '{"transcript":"I feel sad today","input_type":"text","user_id":1}'
```
- Returns `intent:"reflection"`, severity 3-5, empathetic `response`
- `SELECT * FROM journal_entries` now has 1 row with a 768-dim embedding
- Repeat with `"I want to end it all"` → `intent:"crisis"`, response contains "1553", `SELECT * FROM escalation_events` has 1 row with `trigger_type='crisis_flag'`
- Insert 5 synthetic declining-mood rows; next call returns `needs_escalation:true`, new `escalation_events` row with `trigger_type='mood_decline'`
- Red-team: force the handler to suggest medication via prompt injection → safety gate rejects, retries, eventually returns fallback on 3rd fail

**Phase 3 (browser):**
- Open voice mode, speak: "Tell me about last week." Gemini calls `get_journal_context`, response references stored entries
- Speak a crisis phrase → audio stops <1s, `SupportCard` with PH hotlines shows, `POST /api/escalation` recorded in DB with `trigger_type='keyword_match'`
- Let session complete one full turn → `SELECT * FROM journal_entries WHERE input_type='voice'` has a new row within ~3s of `turnComplete`
- DevTools Network tab: no `GOOGLE_API_KEY` visible anywhere; only ephemeral token

## Risk register (implementation-specific)

| Risk | Mitigation |
|---|---|
| `ivfflat` index on empty table performs poorly for first ~100 rows | Accept sequential scan until data accumulates; revisit index params post-MVP |
| Neon HTTP driver doesn't support pgvector `::vector` cast directly | Use `sql` template with explicit cast; verify with integration test in Phase 1 |
| LangGraph serializes state between nodes — large `memory_context` could bloat payload | Truncate retrieved entries to top-5 with <500 char excerpts |
| Gemini structured output not honored under load | All LLM calls use `withStructuredOutput` with Zod schema; on parse failure, return safe default |
| Ephemeral token minting for Gemini Live differs between SDK versions | Pin `@google/genai` version; document exact `ai.authTokens.create()` call in Phase 3 plan |
| Voice function call exceeds 50ms under cold start | Keep handlers as single-statement SQL; prewarm Neon HTTP connection on `/api/live-token` call |
| PH hotline numbers change | All hotlines in `src/lib/safety/ph-hotlines.ts` as a single constant — single edit point |

## Out of scope

- Migrating auth to Clerk/NextAuth/signed sessions (explicit deferral)
- Migrating voice to server-side WebSocket proxy (kept as client SDK)
- LangGraph `PostgresSaver` checkpointing (add later if resumability becomes a need)
- Mood dashboard / chart UI (doc Section 12 future enhancement)
- Locale-aware hotlines (PH only)
- Multi-language voice support
- Offline journaling (IndexedDB buffer + sync)
- Therapist admin dashboard
- Session export to PDF
