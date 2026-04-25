# Voice Journaling — Design Spec

**Date:** 2026-04-25
**Route:** `/journal/voice` (recording) → `/journal/voice/review?id=<uuid>` (review + transcript)
**Scope:** Full voice-journal flow — real mic capture, live amplitude waveform, Pause/Stop/Cancel state machine, IndexedDB persistence across routes, server-side Gemini transcription on the review page.

---

## Goals

- Replace the placeholder `/journal/voice` page with a working recording screen matching the provided mockup.
- Capture real audio via `MediaRecorder`, show a live amplitude-driven waveform, and drive a state machine across `idle → recording ⇄ paused → stopped`.
- On Stop, persist the recording to IndexedDB and navigate to a review page that shows playback and a transcript produced by Gemini (`gemini-2.5-flash`).
- Keep the API key server-side behind a Next.js route.

## Non-goals

- Saving entries to the app database (the Save button is a visual placeholder in this task).
- Editing the transcript before save.
- A real language picker for the `Auto-detect · Tagalog` pill (prop-driven but UI is static).
- Text-journal flow integration or changes to the nested `/journal/voice/voice` / `/journal/voice/text` folders.
- Automated tests — no test framework is wired up in the project yet.

---

## State machine

```
idle → recording ⇄ paused
         │           │
         └──► stopped ──► navigate to /journal/voice/review?id=<uuid>
```

- **`idle`** — mounted, recorder not yet created. On mount, the page auto-requests mic and transitions to `recording`. No idle UI is rendered in the happy path (matches the mockup which only depicts the recording state).
- **`recording`** — `MediaRecorder.state === "recording"`, timer ticks, `AnalyserNode` feeds waveform amplitude. Header pill: red dot + "Recording".
- **`paused`** — `MediaRecorder.pause()` called. Timer frozen. Waveform collapses to resting bars (amplitude pinned to 0). Header pill: muted-grey dot + "Paused".
- **`stopped`** — terminal. `onstop` handler writes blob to IndexedDB with `crypto.randomUUID()`, then `router.push('/journal/voice/review?id=<uuid>')`. Page unmounts.
- **`error`** — mic denied or recorder failure. Fallback UI with Retry.

**Transitions:**
- Pause → `recording` → `paused` via `recorder.pause()`.
- Resume (same slot as Pause) → `paused` → `recording` via `recorder.resume()`.
- Stop → any → `stopped`.
- Cancel / X → any → opens `DiscardConfirmSheet`. Confirm stops the recorder, discards the blob, and routes to `/journal`. Keep dismisses the sheet without changing state.

---

## File layout

```
src/app/journal/voice/
  page.tsx                          # Recording screen — composes state machine + UI
  review/
    page.tsx                        # Review screen — reads blob, triggers transcription

src/app/api/transcribe/
  route.ts                          # POST: audio blob → { transcript } via Gemini

src/components/voice-recorder/
  recording-header.tsx              # X button + "Recording"/"Paused" pill
  language-pill.tsx                 # "Auto-detect · Tagalog" (takes `language` prop)
  recording-timer.tsx               # 00:12 monospace digits
  recording-waveform.tsx            # 30-bar amplitude visualizer
  recording-controls.tsx            # Pause/Resume · Stop · Cancel row
  recording-helper-text.tsx         # Bottom italic Tagalog line, state-aware
  discard-confirm-sheet.tsx         # Shared by Cancel and X

src/lib/
  use-audio-recorder.ts             # Hook: MediaRecorder + AnalyserNode + state
  audio-store.ts                    # IndexedDB wrapper: put / get / delete / updateTranscript
  transcribe.ts                     # Client helper: POST blob → /api/transcribe
```

**Boundaries:**
- `use-audio-recorder.ts` owns all mic/audio concerns. Consumers never touch `MediaRecorder` directly.
- `audio-store.ts` owns IndexedDB. Exposes typed put/get/delete/updateTranscript operations.
- UI components are pure functions of props — no mic/audio awareness.
- `/api/transcribe/route.ts` is the only place `GEMINI_API_KEY` is read.

---

## `useAudioRecorder` hook

**State it exposes (React state, drives re-renders):**
- `status`: `'idle' | 'recording' | 'paused' | 'error'`
- `durationMs`: number (refreshed each animation frame while recording)
- `amplitude`: number `0..1` (latest peak from `AnalyserNode.getByteTimeDomainData`)
- `error`: `null | 'mic-denied' | 'mic-unavailable' | 'unsupported' | 'recorder-failure'`

**Refs it holds (not state — avoid re-renders):**
- `mediaRecorderRef`, `streamRef`, `audioContextRef`, `analyserRef`
- `chunksRef` — `Blob[]` accumulator for `dataavailable` events
- `startTimestampRef`, `pausedAccumRef` — for clock-anchored duration across pauses
- `rafRef` — current `requestAnimationFrame` handle

**API:**
- `start()` — requests mic, creates recorder + analyser, begins RAF loop. On permission denial sets `status='error'`, `error='mic-denied'`.
- `pause()` — `recorder.pause()`, cancels RAF, freezes `amplitude` at 0.
- `resume()` — `recorder.resume()`, restarts RAF.
- `stop()` — returns `Promise<Blob>` that resolves in `onstop` with the concatenated webm blob.
- `cancel()` — stops tracks, discards chunks, resets state. Returns no blob.

**Cleanup on unmount:** stop tracks, close `AudioContext`, cancel RAF.

**Duration math:** driven by `Date.now()` deltas, not an incrementing counter, so long recordings don't drift.

---

## Data flow — recording → review

```
1. /journal/voice mounts
2. useEffect → useAudioRecorder.start()
3. Browser mic prompt → user allows
4. status = 'recording', duration ticks, amplitude drives waveform
5. User taps Stop
6. blob = await stop()
7. id = crypto.randomUUID()
8. audio-store.putRecording({
     id, blob, durationMs, language: 'Auto-detect · Tagalog',
     createdAt: Date.now()
   })
9. router.push(`/journal/voice/review?id=${id}`)
```

---

## Data flow — review page

```
1. /journal/voice/review?id=X mounts
2. record = await audio-store.getRecording(X)
   - not found → "Recording not found" fallback with back link
3. audioUrl = URL.createObjectURL(record.blob) → bind to <audio>
4. If record.transcript already exists (cached from a prior visit):
     render directly; do NOT re-hit Gemini.
   Else:
     transcriptionStatus = 'loading'
     transcript = await transcribe(record.blob)   // POST /api/transcribe
       success → audio-store.updateTranscript(X, transcript); show
       failure → transcriptionStatus = 'error'; show Retry
5. Save button → placeholder (logs and leaves record in IndexedDB).
   Discard button → audio-store.deleteRecording(X), router.push('/journal').
```

---

## `/api/transcribe/route.ts`

- **Method:** `POST`
- **Request:** `multipart/form-data` with one file field (the audio blob from `MediaRecorder` — typically webm/opus on Chromium, mp4/aac on Safari).
- **Server:** reads `GEMINI_API_KEY` from env, uses `@google/genai` SDK with model `gemini-2.5-flash`. Sends the audio as inline data with prompt:
  > "Transcribe this audio verbatim in the spoken language. Return only the transcript text, no commentary."
- **Response:**
  - Success: `{ transcript: string }`, status 200.
  - Failure: `{ error: string }`, status 4xx/5xx as appropriate.

**Why `gemini-2.5-flash`:** cheap, handles audio input natively, fast enough for ~5-minute recordings. No streaming needed — the review page tolerates a short spinner.

---

## IndexedDB (`audio-store.ts`)

- **DB name:** `innolympics-audio`, version 1
- **Object store:** `recordings`, `keyPath: 'id'`
- **Record shape:**
  ```ts
  {
    id: string;              // crypto.randomUUID()
    blob: Blob;              // MediaRecorder default (webm/opus on Chromium, mp4 on Safari)
    durationMs: number;
    language: string;        // "Auto-detect · Tagalog" for now
    createdAt: number;       // Date.now()
    transcript?: string;     // written after transcription succeeds
  }
  ```
- **Exposed functions:** `putRecording(record)`, `getRecording(id)`, `deleteRecording(id)`, `updateTranscript(id, transcript)`.

---

## Visual spec

Matches the screenshot and existing app conventions (Inter body, Geist display, `#F5F2ED` warm-grey panels, `#1A1A1A` near-black text).

### Recording screen (`/journal/voice`)

Reuses the existing shell: outer `min-h-screen` flex-center on `bg-neutral-100`, inner `390×844` white "phone" frame with `overflow-hidden`. Top padding `62px` for status-bar area.

Single flex column, `px-6`:

1. **Header row** — `h-11`, flex row, `items-center`, `justify-between`.
   - Left: `X` button, `44×44` circular, `bg-[#F5F2ED]`, lucide `X` icon 20px stroke `1.75` (matches existing `BackButton`).
   - Center: status pill.
   - Right: invisible `44×44` spacer so the pill stays centered.

2. **Status pill** — `h-9`, `rounded-full`, `bg-[#F5F2ED]`, `px-4`, flex row, gap `8px`.
   - Recording: `6px` red dot `bg-[#E5484D]` + `"Recording"`, 15px semibold `#1A1A1A`.
   - Paused: muted grey dot `bg-[#A0A0A0]` + `"Paused"`.

3. **Top spacer** — `h-10`.

4. **Language pill** — centered, same shape as status pill. Purple dot `bg-[#8B5CF6]` + `"Auto-detect · Tagalog"`, 13px `#1A1A1A`. Takes `language: string` prop so a future picker can swap the text without restructuring.

5. **Timer** — `mt-12`, centered. `text-[96px]`, font-display (Geist), weight 500, tracking `-0.04em`, `tabular-nums`, `#1A1A1A`. Format `mm:ss`.

6. **Status label** — `mt-6`, centered, 14px `#8A8A8A`. "Recording in progress" or "Paused".

7. **Waveform** — `mt-10`, `h-32`, centered container.
   - 30 bars, `width: 6px`, `rounded-full`, `gap: 4px`.
   - Resting height 12px, max height 96px.
   - Each bar `i` (0..29) has a pre-baked envelope `env[i]` shaped like a spindle (ease-in-out centered on index 14.5). Final height = `resting + (max − resting) × amplitude × env[i]`.
   - Colors: center bars `#7C3AED` (darker), fading outward to `#C4B5FD`. Pre-computed 30-entry array.
   - Paused: amplitude pinned to 0, all bars collapse to resting height.
   - Updates via `requestAnimationFrame` in the hook; component re-renders each frame.

8. **Flex spacer** pushes controls down.

9. **Controls row** — `mb-4`, flex row, centered, gap `32px`, `items-center`.
   - **Pause/Resume** — `64×64` circular, `bg-white`, `border border-[#EBEBEB]`, `drop-shadow-sm`. Lucide `Pause` when recording, `Play` when paused, 24px stroke `1.75`. Label below: 12px `#1A1A1A`, `"Pause"` / `"Resume"`.
   - **Stop** — `88×88` circular, `bg-[#8B5CF6]`, `drop-shadow-md`. White square icon `24×24` `rounded-[4px]`. Label below: `"Stop"`.
   - **Cancel** — `64×64` white circular (same as Pause). Lucide `Trash2`. Label `"Cancel"`.
   - Press state: `active:scale-95 transition-transform`.

10. **Helper text** — `mb-6`, centered, italic, 14px `#8A8A8A`.
    - Recording: *"Magsalita ka lang, nakikinig ako."*
    - Paused: *"Naka-pause. I-tap ang Resume para magpatuloy."*

### `DiscardConfirmSheet`

Bottom sheet using `@base-ui/react` Dialog (already a dep). Slides up from bottom, dims background.
- Title: `"Discard recording?"` — 18px semibold.
- Body: `"Your audio will be deleted and can't be recovered."` — 14px `#8A8A8A`.
- **Discard** — `bg-[#E5484D]`, white text, `h-12`, `rounded-full`.
- **Keep recording** — `bg-[#F5F2ED]`, `#1A1A1A`, `h-12`, `rounded-full`.

### Review screen (`/journal/voice/review?id=...`)

Same shell. Column:
1. `BackButton` at top-left (`href="/journal"`).
2. Heading `"Voice journal"` — 26px bold Geist.
3. Date/duration sub-line — 15px `#666666`, e.g., `"April 25 · 0:12"`.
4. **Transcript card** — `bg-[#F5F2ED]`, `rounded-3xl`, `p-5`, `mt-6`.
   - Loading: skeleton pulse + `"Transcribing…"`, 14px `#8A8A8A`.
   - Ready: transcript text, 15px `leading-relaxed` `#1A1A1A`.
   - Error: `"Couldn't transcribe."` + purple `"Retry"` text-button.
5. **Playback row** — `<audio controls>` styled to match (or a minimal custom player: play/pause + scrubber + elapsed/total).
6. **Save / Discard** footer — full-width pill buttons.
   - Save: `bg-[#8B5CF6]`, white, `"Save entry"`. Placeholder behavior in this task.
   - Discard: `bg-[#F5F2ED]`, `#1A1A1A`, `"Discard"`.

---

## Error handling

| Failure | Where | Behavior |
|---|---|---|
| Mic permission denied | `useAudioRecorder.start()` | `status='error'`, `error='mic-denied'`. Fallback: icon + *"We need mic access to record your journal."* + **Retry** button that re-calls `start()`. |
| No mic hardware / `getUserMedia` unsupported | Same | `error='mic-unavailable'`. Fallback without Retry. |
| `MediaRecorder` unsupported | On mount | `error='unsupported'`. Fallback: *"Your browser doesn't support recording."* |
| `recorder.onerror` mid-session | Hook | `status='error'`, existing chunks preserved. Small banner with **Stop and review** action that saves what was captured. |
| `audio-store.putRecording` fails (quota / IndexedDB unavailable) | Stop flow | Toast *"Couldn't save the recording."* Do not navigate; the in-memory blob still exists so the user can retry. |
| Review page: `id` missing or record not found | Mount | *"Recording not found."* + back link. |
| Transcription fails (network / 5xx / Gemini error) | `/api/transcribe` | Transcript card shows *"Couldn't transcribe — tap to retry."* Audio playback works; Save still works. |
| User navigates away mid-recording | X / `beforeunload` | X opens `DiscardConfirmSheet`. `beforeunload` fires while `status === 'recording' \|\| 'paused'` with *"Leave? Your recording will be discarded."* |

---

## Dependencies & environment

- **Add:** `@google/genai` (server-side only, used in `/api/transcribe/route.ts`).
- **Env var:** `GEMINI_API_KEY` — add to `.env.example` (placeholder) and `.env.local` (actual). Read only on the server.
- No new client dependencies.

---

## Manual verification checklist

1. `/journal/voice` — mic prompt appears on load. Deny → fallback UI. Retry re-requests.
2. Allow mic → timer starts at `00:00`, ticks each second; waveform reacts to voice (quiet = resting bars; loud = tall center bars).
3. Pause → timer freezes, waveform collapses, pill shows "Paused", helper text swaps. Resume returns everything.
4. Cancel → discard sheet appears. Keep dismisses and recording continues uninterrupted. Discard stops and routes to `/journal`; IndexedDB has no leftover record.
5. X while recording → same discard sheet, same outcomes.
6. Stop → navigates to `/journal/voice/review?id=<uuid>`.
7. Review page: `<audio>` plays at correct duration. Transcribing spinner briefly, then real transcript appears.
8. Disconnect network before Stop → review page shows audio + transcription error + Retry. Retry works when network returns.
9. Reload review page with same `id` → transcript loads from IndexedDB (cached); no re-hit to Gemini.
10. Reload review page with bad `id` → "Recording not found" fallback.
11. `beforeunload` prompts when closing tab mid-recording.
12. No `⋯` button in header; only X + Recording pill + spacer.
13. No console errors or warnings across the flow.
