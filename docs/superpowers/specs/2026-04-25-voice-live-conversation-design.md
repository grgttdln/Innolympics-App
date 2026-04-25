# Voice Journal — Live Conversation Mode

**Status:** Draft · **Date:** 2026-04-25 · **Route:** `/journal/voice`

## Summary

Convert the voice journal from a one-way recorder into a live, bidirectional conversation with an AI reflective journaling coach. The user speaks; Gemini Live replies by voice with short follow-up questions, and a caption of the latest AI reply appears on screen. When the user taps **Stop**, the session ends and the review page shows a formatted transcript — the user's reflections grouped under each AI question — with no audio playback.

## Goals

- Make `/journal/voice` feel like a phone call with a coach, not a recorder.
- AI responds by voice and caption with reflective follow-up questions.
- Automatic turn-taking via Gemini Live's server-side VAD — no push-to-talk.
- Only produce the transcript on **Stop** (no mid-session transcript view).
- Final journal entry reads like a guided journal: AI questions as headings, user reflections as body text.

## Non-goals

- No audio playback on the review page (transcript only).
- No blob persistence to IndexedDB.
- No user-configurable AI personality.
- No mid-session transcript UI.
- No interruption handling (user talking over AI is ignored for v1).
- No explicit language selection — Gemini Live auto-detects.
- No pause button during live conversation.

## Architecture

Two new units plus changes to existing modules.

### New: `src/app/api/live-token/route.ts`

Server route that mints a short-lived ephemeral Gemini Live token. Keeps `GEMINI_API_KEY` server-side. Returns `{ token, model, config }` where `config` encodes the system prompt and modality settings. One token per session.

### New: `src/lib/use-live-conversation.ts`

Client hook that owns the live session. Responsibilities:

- Fetches ephemeral token from `/api/live-token`.
- Opens Gemini Live WebSocket via `@google/genai` client SDK using the ephemeral token.
- Captures mic audio via `getUserMedia` and streams PCM frames over the socket using an `AudioWorklet`.
- Plays AI audio replies through an `AudioContext` sink.
- Consumes Gemini Live's streamed **input transcript** (user) and **output transcript** (AI) and appends them to `turns[]`.
- Exposes:
  - `status`: `"idle" | "connecting" | "listening" | "thinking" | "speaking" | "error"`
  - `latestAiCaption`: most recent AI reply text (string)
  - `turns`: `Array<{ role: "user" | "ai"; text: string; ts: number }>`
  - `durationMs`
  - `error`: `RecorderError | "token-failed" | "socket-failed" | null`
  - `start()`, `stop()`, `cancel()`

### Changed: `src/app/journal/voice/page.tsx`

Replaces the current recording layout with a phone-call style UI (see **UI** below). Uses `useLiveConversation` instead of `useAudioRecorder`.

### Changed: `src/lib/audio-store.ts`

Repurpose to `turns-store.ts` (or keep filename, rename types). Stores `{ id, turns, durationMs, createdAt }`. Remove `blob` and `transcript` fields. Keep the IndexedDB-by-id pattern so `?id=...` handoff to the review page is unchanged.

### Changed: `src/app/journal/voice/review/page.tsx`

Loads turns from the store by id. Renders transcript directly (no `/api/transcribe` call, no `<audio>` element). Keeps Save/Discard buttons.

### Removed / not used in this flow

- `src/lib/use-audio-recorder.ts` — keep the file (it may be used by other flows later), but `/journal/voice` no longer imports it.
- `/api/transcribe` — not called by this flow anymore. Leave the route in place.

## Data flow

1. User taps **Start**.
2. `useLiveConversation.start()`:
   a. `POST /api/live-token` → ephemeral token.
   b. `getUserMedia({ audio: true })` → mic stream.
   c. Open Gemini Live WebSocket with the system prompt.
   d. Spawn `AudioWorklet` that converts mic input to 16 kHz PCM and sends frames over the socket.
   e. Status transitions: `idle → connecting → listening`.
3. User speaks. Gemini's server-side VAD detects end-of-turn.
4. Gemini replies:
   - Status → `thinking` (briefly) → `speaking`.
   - AI audio streams back → played via `AudioContext`.
   - AI output transcript streams back → written to `latestAiCaption` and pushed into `turns[]` as `{ role: "ai", text, ts }`.
   - User input transcript (finalized for the previous user turn) is pushed into `turns[]` as `{ role: "user", text, ts }`.
5. After AI finishes speaking, status returns to `listening`. Loop to step 3.
6. User taps **Stop**:
   - `useLiveConversation.stop()` closes the socket, stops the worklet, releases the mic.
   - Generate `id = crypto.randomUUID()`.
   - `putTurns({ id, turns, durationMs, createdAt })` to IndexedDB.
   - Navigate to `/journal/voice/review?id=...`.

## UI — `/journal/voice`

Phone-call style. Scoped to the existing 390×844 phone frame.

- **Top bar**: close button (existing `RecordingHeader` pattern) + small status pill reading one of: "Connecting…" / "Listening…" / "Thinking…" / "Speaking…".
- **Center**: pulsing orb visualization (~180px diameter).
  - Violet (`#8B5CF6`) with gentle pulse while `listening`.
  - Warm amber with faster pulse while `speaking`.
  - Muted neutral while `connecting` or `thinking`.
- **Below orb**: latest AI caption, max 2 lines, centered, 17px, muted color. Fades in on new AI turn, stays until the next one.
- **Bottom**: single large circular **Stop** button (red accent). No pause.
- **Bottom-left**: small timer (mm:ss), matching the existing `RecordingTimer` type.
- **Language pill**: removed.

Exit/discard uses the existing `DiscardConfirmSheet` and mounts into the `frameRef` container, as today.

Error states reuse `ErrorFallback` from the current page, extended with two new error kinds:
- `token-failed` → "Couldn't start the live session. Please try again."
- `socket-failed` → same message, with retry.

## UI — `/journal/voice/review`

- Header and back button unchanged.
- Title: "Voice journal".
- Subtitle: `{date} · {duration}` as today.
- Body: transcript rendered from `turns`. For each user turn, show the **preceding** AI question (if any) as a muted italic heading, then the user's text as the body paragraph. If there is no preceding AI turn (first user turn before any AI reply), render the user text with no heading.
- No `<audio>` element.
- Buttons: **Save entry** and **Discard**, same styling as today.
- `handleSave` remains a placeholder (out of scope).
- `handleDiscard` deletes the turns record by id and routes to `/dashboard`.

## System prompt

Initial system prompt sent to Gemini Live on session start:

> You are a warm, reflective journaling coach. The user is voice-journaling. Listen to what they share, then ask ONE short, open-ended follow-up question that helps them go deeper — how they felt, what surprised them, what they want to explore further. Keep replies to one or two sentences. Do not summarize, do not give advice, do not repeat what they said. Match the user's language (English, Tagalog, or Taglish).

## Error handling

- **`/api/live-token` returns non-OK** → `useLiveConversation` sets `error = "token-failed"`, status `error`. UI shows `ErrorFallback` with retry.
- **WebSocket drops after connection** → attempt one silent reconnect. On second failure, set `error = "socket-failed"`, keep any `turns[]` collected so far, surface an error banner with "Save what we have" (navigates to review with current turns) and "Discard" options.
- **Mic permission denied / unavailable / unsupported** → existing `RecorderError` semantics, existing `ErrorFallback` UI.
- **AI audio playback blocked by autoplay policy** → the initial **Start** tap is a user gesture, so `AudioContext.resume()` succeeds. Captions continue to work regardless, so worst case the conversation is silent-captioned.
- **No turns on stop** (user stopped before speaking) → skip navigation, toast "Nothing to save", return to dashboard.

## Security

- `GEMINI_API_KEY` stays server-side.
- `/api/live-token` mints an ephemeral token scoped to a single Live session with a short TTL (default from SDK; do not extend).
- No authentication gating is added here — matches the rest of the app's journal routes. Revisit if the Live token route becomes abused.

## Open questions

None blocking. Two items to verify during implementation:

1. The project's `GEMINI_API_KEY` has Gemini Live API access on its billing project. If not, this flow cannot ship until that's provisioned. Fail fast in `/api/live-token` if the SDK returns an access error and surface a clear dev-time log.
2. Gemini Live's input-transcript quality for Tagalog / Taglish. If poor, add a MediaRecorder archive + post-hoc `/api/transcribe` call on stop as a fallback. Not in v1.

## Testing

- Manual: full happy path in Chrome and Safari on desktop at 390×844. Verify orb state transitions, caption updates, transcript rendering on review.
- Manual: deny mic permission → error UI.
- Manual: kill network mid-session → reconnect banner, then graceful save of collected turns.
- Manual: tap Stop with zero turns → toast + back to dashboard, no orphan store records.
- No new unit tests required; the existing codebase has no test harness.
