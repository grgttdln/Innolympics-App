# Voice Journaling Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a working voice journal flow at `/journal/voice` with real mic capture, live amplitude-driven waveform, Pause/Stop/Cancel controls, IndexedDB persistence, and Gemini-backed transcription on the review page.

**Architecture:** One recording screen and one review screen. A `useAudioRecorder` hook owns all mic/audio concerns. An `audio-store` module wraps IndexedDB. A Next.js API route proxies the transcription request to Gemini so the API key never leaves the server. UI components are pure and state-agnostic.

**Tech Stack:** Next.js 16.2 (webpack dev), React 19, TypeScript, Tailwind v4, `@base-ui/react` (already a dep) for the confirm sheet, `@google/genai` (new) for transcription, browser-native `MediaRecorder` + `AnalyserNode` + IndexedDB.

**Spec:** `docs/superpowers/specs/2026-04-25-voice-journaling-design.md`

**Note on routing:** The spec mentions `/journal` as a destination for Cancel/Discard, but that route doesn't exist in the app. This plan routes back to `/dashboard` (the actual home and where the journal picker lives) for all such flows. `BackButton` already defaults to `/dashboard` which is consistent.

**Test strategy:** The project has no test framework. The spec explicitly puts automated tests out of scope. Each task ends with a manual verification step using `npm run dev` before commit.

---

## File map

**New files:**
- `src/lib/audio-store.ts` — IndexedDB wrapper (put/get/delete/updateTranscript).
- `src/lib/use-audio-recorder.ts` — Hook: `MediaRecorder` + `AnalyserNode` + state machine.
- `src/lib/transcribe.ts` — Client helper that POSTs a blob to `/api/transcribe`.
- `src/app/api/transcribe/route.ts` — Server route: blob → Gemini → `{ transcript }`.
- `src/components/voice-recorder/recording-header.tsx` — X button + status pill.
- `src/components/voice-recorder/language-pill.tsx` — "Auto-detect · Tagalog" pill.
- `src/components/voice-recorder/recording-timer.tsx` — mm:ss display.
- `src/components/voice-recorder/recording-waveform.tsx` — 30-bar spindle visualizer.
- `src/components/voice-recorder/recording-controls.tsx` — Pause/Resume · Stop · Cancel row.
- `src/components/voice-recorder/recording-helper-text.tsx` — Bottom italic Tagalog line.
- `src/components/voice-recorder/discard-confirm-sheet.tsx` — Bottom sheet via `@base-ui/react`.
- `src/app/journal/voice/review/page.tsx` — Review screen with playback + transcript.

**Modified files:**
- `src/app/journal/voice/page.tsx` — Replace placeholder with real recording screen.
- `.env.example` — Add `GEMINI_API_KEY=` placeholder.
- `.env.local` — Add real `GEMINI_API_KEY=...` (user-supplied).
- `package.json` / `package-lock.json` — Add `@google/genai`.

---

## Task 1: Install `@google/genai` and add `GEMINI_API_KEY` to env

**Files:**
- Modify: `package.json`, `package-lock.json`
- Modify: `.env.example`
- Modify: `.env.local` (user-supplied value)

- [ ] **Step 1: Install the Gemini SDK**

Run:
```bash
npm install @google/genai
```

Expected: package added to `dependencies`, no errors.

- [ ] **Step 2: Add placeholder to `.env.example`**

Append to `/Users/georgette/Desktop/Innolympics-App/.env.example`:

```
# Gemini API key for voice-journal transcription
# Get one from https://aistudio.google.com/apikey
GEMINI_API_KEY=
```

- [ ] **Step 3: Add real key to `.env.local`**

Tell the user to add `GEMINI_API_KEY=<their-key>` to `.env.local`. Do not commit this file; it's gitignored.

- [ ] **Step 4: Verify dev server still boots**

Run: `npm run dev`
Expected: server starts on port 3000 with no errors. Kill it after it confirms.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json .env.example
git commit -m "feat(voice): add @google/genai dependency and GEMINI_API_KEY placeholder"
```

---

## Task 2: IndexedDB audio store

**Files:**
- Create: `src/lib/audio-store.ts`

- [ ] **Step 1: Create the module**

Create `/Users/georgette/Desktop/Innolympics-App/src/lib/audio-store.ts`:

```ts
const DB_NAME = "innolympics-audio";
const DB_VERSION = 1;
const STORE = "recordings";

export type AudioRecord = {
  id: string;
  blob: Blob;
  durationMs: number;
  language: string;
  createdAt: number;
  transcript?: string;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB open failed"));
  });
}

function tx<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(STORE, mode);
        const store = transaction.objectStore(STORE);
        const req = fn(store);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error ?? new Error("IndexedDB op failed"));
        transaction.oncomplete = () => db.close();
      }),
  );
}

export async function putRecording(record: AudioRecord): Promise<void> {
  await tx("readwrite", (s) => s.put(record));
}

export async function getRecording(id: string): Promise<AudioRecord | undefined> {
  const result = await tx<AudioRecord | undefined>("readonly", (s) => s.get(id) as IDBRequest<AudioRecord | undefined>);
  return result;
}

export async function deleteRecording(id: string): Promise<void> {
  await tx("readwrite", (s) => s.delete(id));
}

export async function updateTranscript(id: string, transcript: string): Promise<void> {
  const existing = await getRecording(id);
  if (!existing) return;
  await putRecording({ ...existing, transcript });
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/audio-store.ts
git commit -m "feat(voice): add IndexedDB wrapper for audio recordings"
```

---

## Task 3: `useAudioRecorder` hook

**Files:**
- Create: `src/lib/use-audio-recorder.ts`

- [ ] **Step 1: Create the hook**

Create `/Users/georgette/Desktop/Innolympics-App/src/lib/use-audio-recorder.ts`:

```ts
"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type RecorderStatus = "idle" | "recording" | "paused" | "error";
export type RecorderError = "mic-denied" | "mic-unavailable" | "unsupported" | "recorder-failure";

export type UseAudioRecorder = {
  status: RecorderStatus;
  durationMs: number;
  amplitude: number;
  error: RecorderError | null;
  start: () => Promise<void>;
  pause: () => void;
  resume: () => void;
  stop: () => Promise<Blob>;
  cancel: () => void;
};

export function useAudioRecorder(): UseAudioRecorder {
  const [status, setStatus] = useState<RecorderStatus>("idle");
  const [durationMs, setDurationMs] = useState(0);
  const [amplitude, setAmplitude] = useState(0);
  const [error, setError] = useState<RecorderError | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const rafRef = useRef<number | null>(null);
  const startedAtRef = useRef<number>(0);
  const pausedAccumRef = useRef<number>(0);
  const pausedAtRef = useRef<number | null>(null);
  const stopResolveRef = useRef<((blob: Blob) => void) | null>(null);

  const teardown = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      try {
        recorderRef.current.stop();
      } catch {}
    }
    recorderRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    analyserRef.current = null;
    chunksRef.current = [];
    stopResolveRef.current = null;
    pausedAtRef.current = null;
    pausedAccumRef.current = 0;
    startedAtRef.current = 0;
  }, []);

  useEffect(() => () => teardown(), [teardown]);

  const tick = useCallback(() => {
    const analyser = analyserRef.current;
    if (!analyser) return;
    const buf = new Uint8Array(analyser.fftSize);
    analyser.getByteTimeDomainData(buf);
    let peak = 0;
    for (let i = 0; i < buf.length; i++) {
      const v = Math.abs(buf[i] - 128) / 128;
      if (v > peak) peak = v;
    }
    setAmplitude(peak);
    setDurationMs(Date.now() - startedAtRef.current - pausedAccumRef.current);
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const start = useCallback(async () => {
    if (typeof window === "undefined") return;
    if (typeof MediaRecorder === "undefined") {
      setError("unsupported");
      setStatus("error");
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("mic-unavailable");
      setStatus("error");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const AudioCtx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      audioCtxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      source.connect(analyser);
      analyserRef.current = analyser;

      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onerror = () => {
        setStatus("error");
        setError("recorder-failure");
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        if (stopResolveRef.current) {
          stopResolveRef.current(blob);
          stopResolveRef.current = null;
        }
      };

      recorder.start(250);
      startedAtRef.current = Date.now();
      pausedAccumRef.current = 0;
      pausedAtRef.current = null;
      setDurationMs(0);
      setAmplitude(0);
      setError(null);
      setStatus("recording");
      rafRef.current = requestAnimationFrame(tick);
    } catch (err) {
      const name = (err as { name?: string })?.name;
      if (name === "NotAllowedError" || name === "SecurityError") {
        setError("mic-denied");
      } else if (name === "NotFoundError" || name === "OverconstrainedError") {
        setError("mic-unavailable");
      } else {
        setError("recorder-failure");
      }
      setStatus("error");
      teardown();
    }
  }, [tick, teardown]);

  const pause = useCallback(() => {
    const rec = recorderRef.current;
    if (!rec || rec.state !== "recording") return;
    rec.pause();
    pausedAtRef.current = Date.now();
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    setAmplitude(0);
    setStatus("paused");
  }, []);

  const resume = useCallback(() => {
    const rec = recorderRef.current;
    if (!rec || rec.state !== "paused") return;
    if (pausedAtRef.current !== null) {
      pausedAccumRef.current += Date.now() - pausedAtRef.current;
      pausedAtRef.current = null;
    }
    rec.resume();
    setStatus("recording");
    rafRef.current = requestAnimationFrame(tick);
  }, [tick]);

  const stop = useCallback((): Promise<Blob> => {
    return new Promise((resolve) => {
      const rec = recorderRef.current;
      if (!rec || rec.state === "inactive") {
        resolve(new Blob([], { type: "audio/webm" }));
        return;
      }
      stopResolveRef.current = (blob) => {
        teardown();
        resolve(blob);
      };
      if (rec.state === "paused") rec.resume();
      rec.stop();
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    });
  }, [teardown]);

  const cancel = useCallback(() => {
    teardown();
    setStatus("idle");
    setDurationMs(0);
    setAmplitude(0);
    setError(null);
  }, [teardown]);

  return { status, durationMs, amplitude, error, start, pause, resume, stop, cancel };
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/use-audio-recorder.ts
git commit -m "feat(voice): add useAudioRecorder hook with MediaRecorder + analyser"
```

---

## Task 4: Server transcription route

**Files:**
- Create: `src/app/api/transcribe/route.ts`

- [ ] **Step 1: Create the route**

Create `/Users/georgette/Desktop/Innolympics-App/src/app/api/transcribe/route.ts`:

```ts
import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODEL = "gemini-2.5-flash";
const PROMPT = "Transcribe this audio verbatim in the spoken language. Return only the transcript text, with no commentary, no timestamps, and no speaker labels.";

export async function POST(req: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GEMINI_API_KEY not configured" }, { status: 500 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid multipart body" }, { status: 400 });
  }

  const file = form.get("audio");
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: "Missing 'audio' file field" }, { status: 400 });
  }

  const mimeType = file.type || "audio/webm";
  const buf = Buffer.from(await file.arrayBuffer());
  const base64 = buf.toString("base64");

  try {
    const ai = new GoogleGenAI({ apiKey });
    const result = await ai.models.generateContent({
      model: MODEL,
      contents: [
        {
          role: "user",
          parts: [
            { text: PROMPT },
            { inlineData: { mimeType, data: base64 } },
          ],
        },
      ],
    });
    const transcript = result.text?.trim() ?? "";
    return NextResponse.json({ transcript });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Transcription failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors. If `result.text` is typed differently in the installed SDK version, adjust the accessor to match (e.g., `result.response?.text()` for older shapes). Check `node_modules/@google/genai/dist/index.d.ts` if needed.

- [ ] **Step 3: Smoke-test the route**

Run: `npm run dev`
In another terminal, create a tiny wav/webm blob (or skip to Task 13's E2E test). For now just confirm the server boots without errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/transcribe/route.ts
git commit -m "feat(voice): add /api/transcribe server route using Gemini"
```

---

## Task 5: Client transcription helper

**Files:**
- Create: `src/lib/transcribe.ts`

- [ ] **Step 1: Create the module**

Create `/Users/georgette/Desktop/Innolympics-App/src/lib/transcribe.ts`:

```ts
export async function transcribe(blob: Blob): Promise<string> {
  const form = new FormData();
  form.append("audio", blob, "recording.webm");
  const res = await fetch("/api/transcribe", { method: "POST", body: form });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `Transcription failed (${res.status})`);
  }
  const data = (await res.json()) as { transcript: string };
  return data.transcript;
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/transcribe.ts
git commit -m "feat(voice): add client transcribe() helper"
```

---

## Task 6: `RecordingHeader` component

**Files:**
- Create: `src/components/voice-recorder/recording-header.tsx`

- [ ] **Step 1: Create the component**

Create `/Users/georgette/Desktop/Innolympics-App/src/components/voice-recorder/recording-header.tsx`:

```tsx
"use client";

import { X } from "lucide-react";

type Props = {
  status: "recording" | "paused";
  onClose: () => void;
};

export function RecordingHeader({ status, onClose }: Props) {
  const isRecording = status === "recording";
  const dotColor = isRecording ? "#E5484D" : "#A0A0A0";
  const label = isRecording ? "Recording" : "Paused";

  return (
    <div className="flex h-11 items-center justify-between">
      <button
        type="button"
        aria-label="Back"
        onClick={onClose}
        className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full bg-[#F5F2ED] text-[#1A1A1A] transition-opacity hover:opacity-90 active:opacity-80"
      >
        <X className="h-5 w-5" strokeWidth={1.75} />
      </button>

      <div className="flex h-9 items-center gap-2 rounded-full bg-[#F5F2ED] px-4">
        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: dotColor }} aria-hidden />
        <span className="text-[15px] font-semibold text-[#1A1A1A]">{label}</span>
      </div>

      <div className="h-11 w-11" aria-hidden />
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/voice-recorder/recording-header.tsx
git commit -m "feat(voice): add RecordingHeader with X button and status pill"
```

---

## Task 7: `LanguagePill` component

**Files:**
- Create: `src/components/voice-recorder/language-pill.tsx`

- [ ] **Step 1: Create the component**

Create `/Users/georgette/Desktop/Innolympics-App/src/components/voice-recorder/language-pill.tsx`:

```tsx
type Props = {
  language: string;
};

export function LanguagePill({ language }: Props) {
  return (
    <div className="flex h-9 items-center gap-2 rounded-full bg-[#F5F2ED] px-4">
      <span className="h-1.5 w-1.5 rounded-full bg-[#8B5CF6]" aria-hidden />
      <span className="text-[13px] text-[#1A1A1A]">{language}</span>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/voice-recorder/language-pill.tsx
git commit -m "feat(voice): add LanguagePill"
```

---

## Task 8: `RecordingTimer` component

**Files:**
- Create: `src/components/voice-recorder/recording-timer.tsx`

- [ ] **Step 1: Create the component**

Create `/Users/georgette/Desktop/Innolympics-App/src/components/voice-recorder/recording-timer.tsx`:

```tsx
type Props = {
  durationMs: number;
};

function format(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const s = (totalSeconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export function RecordingTimer({ durationMs }: Props) {
  return (
    <div
      className="text-center text-[96px] font-medium tabular-nums text-[#1A1A1A]"
      style={{ fontFamily: "var(--font-geist-sans)", letterSpacing: "-0.04em", lineHeight: 1 }}
    >
      {format(durationMs)}
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/voice-recorder/recording-timer.tsx
git commit -m "feat(voice): add RecordingTimer"
```

---

## Task 9: `RecordingWaveform` component

**Files:**
- Create: `src/components/voice-recorder/recording-waveform.tsx`

- [ ] **Step 1: Create the component**

Create `/Users/georgette/Desktop/Innolympics-App/src/components/voice-recorder/recording-waveform.tsx`:

```tsx
const BAR_COUNT = 30;
const RESTING_PX = 12;
const MAX_PX = 96;
const CENTER = (BAR_COUNT - 1) / 2;

// Pre-baked spindle envelope + per-bar color, computed once.
const ENVELOPE: readonly number[] = Array.from({ length: BAR_COUNT }, (_, i) => {
  const dist = Math.abs(i - CENTER) / CENTER;
  const eased = 1 - dist * dist;
  return Math.max(0.15, eased);
});

const COLORS: readonly string[] = Array.from({ length: BAR_COUNT }, (_, i) => {
  const dist = Math.abs(i - CENTER) / CENTER;
  const lightness = 50 + dist * 28;
  return `hsl(265, 85%, ${lightness.toFixed(0)}%)`;
});

type Props = {
  amplitude: number;
  paused?: boolean;
};

export function RecordingWaveform({ amplitude, paused = false }: Props) {
  const effective = paused ? 0 : Math.min(1, Math.max(0, amplitude));

  return (
    <div className="flex h-32 items-center justify-center gap-1">
      {ENVELOPE.map((env, i) => {
        const height = RESTING_PX + (MAX_PX - RESTING_PX) * effective * env;
        return (
          <span
            key={i}
            className="rounded-full transition-[height] duration-75 ease-out"
            style={{
              width: 6,
              height,
              backgroundColor: COLORS[i],
            }}
            aria-hidden
          />
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/voice-recorder/recording-waveform.tsx
git commit -m "feat(voice): add 30-bar spindle waveform driven by amplitude"
```

---

## Task 10: `RecordingControls` component

**Files:**
- Create: `src/components/voice-recorder/recording-controls.tsx`

- [ ] **Step 1: Create the component**

Create `/Users/georgette/Desktop/Innolympics-App/src/components/voice-recorder/recording-controls.tsx`:

```tsx
"use client";

import { Pause, Play, Trash2 } from "lucide-react";

type Props = {
  paused: boolean;
  onPauseToggle: () => void;
  onStop: () => void;
  onCancel: () => void;
};

export function RecordingControls({ paused, onPauseToggle, onStop, onCancel }: Props) {
  return (
    <div className="flex items-center justify-center gap-8">
      <ButtonSlot label={paused ? "Resume" : "Pause"}>
        <button
          type="button"
          aria-label={paused ? "Resume" : "Pause"}
          onClick={onPauseToggle}
          className="flex h-16 w-16 cursor-pointer items-center justify-center rounded-full border border-[#EBEBEB] bg-white shadow-sm transition-transform active:scale-95"
        >
          {paused ? (
            <Play className="h-6 w-6 text-[#1A1A1A]" strokeWidth={1.75} />
          ) : (
            <Pause className="h-6 w-6 text-[#1A1A1A]" strokeWidth={1.75} />
          )}
        </button>
      </ButtonSlot>

      <ButtonSlot label="Stop">
        <button
          type="button"
          aria-label="Stop"
          onClick={onStop}
          className="flex h-[88px] w-[88px] cursor-pointer items-center justify-center rounded-full bg-[#8B5CF6] shadow-md transition-transform active:scale-95"
        >
          <span className="h-6 w-6 rounded-[4px] bg-white" aria-hidden />
        </button>
      </ButtonSlot>

      <ButtonSlot label="Cancel">
        <button
          type="button"
          aria-label="Cancel"
          onClick={onCancel}
          className="flex h-16 w-16 cursor-pointer items-center justify-center rounded-full border border-[#EBEBEB] bg-white shadow-sm transition-transform active:scale-95"
        >
          <Trash2 className="h-6 w-6 text-[#1A1A1A]" strokeWidth={1.75} />
        </button>
      </ButtonSlot>
    </div>
  );
}

function ButtonSlot({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2">
      {children}
      <span className="text-[12px] text-[#1A1A1A]">{label}</span>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/voice-recorder/recording-controls.tsx
git commit -m "feat(voice): add RecordingControls (Pause/Stop/Cancel)"
```

---

## Task 11: `RecordingHelperText` and `DiscardConfirmSheet`

**Files:**
- Create: `src/components/voice-recorder/recording-helper-text.tsx`
- Create: `src/components/voice-recorder/discard-confirm-sheet.tsx`

- [ ] **Step 1: Create the helper text component**

Create `/Users/georgette/Desktop/Innolympics-App/src/components/voice-recorder/recording-helper-text.tsx`:

```tsx
type Props = {
  paused: boolean;
};

const RECORDING_TEXT = "Magsalita ka lang, nakikinig ako.";
const PAUSED_TEXT = "Naka-pause. I-tap ang Resume para magpatuloy.";

export function RecordingHelperText({ paused }: Props) {
  return (
    <p className="text-center text-[14px] italic text-[#8A8A8A]">
      {paused ? PAUSED_TEXT : RECORDING_TEXT}
    </p>
  );
}
```

- [ ] **Step 2: Create the confirm sheet**

Create `/Users/georgette/Desktop/Innolympics-App/src/components/voice-recorder/discard-confirm-sheet.tsx`:

```tsx
"use client";

import { Dialog } from "@base-ui/react/dialog";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDiscard: () => void;
};

export function DiscardConfirmSheet({ open, onOpenChange, onDiscard }: Props) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
        <Dialog.Popup className="fixed bottom-0 left-1/2 w-[390px] -translate-x-1/2 rounded-t-3xl bg-white p-6 pb-8 shadow-2xl">
          <Dialog.Title className="text-[18px] font-semibold text-[#1A1A1A]">
            Discard recording?
          </Dialog.Title>
          <Dialog.Description className="mt-2 text-[14px] text-[#8A8A8A]">
            Your audio will be deleted and can&apos;t be recovered.
          </Dialog.Description>
          <div className="mt-6 flex flex-col gap-3">
            <button
              type="button"
              onClick={() => {
                onDiscard();
                onOpenChange(false);
              }}
              className="h-12 cursor-pointer rounded-full bg-[#E5484D] text-[15px] font-semibold text-white transition-opacity active:opacity-85"
            >
              Discard
            </button>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="h-12 cursor-pointer rounded-full bg-[#F5F2ED] text-[15px] font-semibold text-[#1A1A1A] transition-opacity active:opacity-85"
            >
              Keep recording
            </button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors. If the `Dialog` import path from `@base-ui/react/dialog` doesn't resolve, check `node_modules/@base-ui/react/dialog/` for the correct subpath (the package exposes per-component subpaths). Alternatives: `import { Dialog } from "@base-ui/react"`.

- [ ] **Step 4: Commit**

```bash
git add src/components/voice-recorder/recording-helper-text.tsx src/components/voice-recorder/discard-confirm-sheet.tsx
git commit -m "feat(voice): add helper text and discard confirm sheet"
```

---

## Task 12: Recording page (compose everything)

**Files:**
- Modify: `src/app/journal/voice/page.tsx` (replace existing content entirely)

- [ ] **Step 1: Replace the page**

Overwrite `/Users/georgette/Desktop/Innolympics-App/src/app/journal/voice/page.tsx`:

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Mic } from "lucide-react";
import { useAudioRecorder } from "@/lib/use-audio-recorder";
import { putRecording } from "@/lib/audio-store";
import { RecordingHeader } from "@/components/voice-recorder/recording-header";
import { LanguagePill } from "@/components/voice-recorder/language-pill";
import { RecordingTimer } from "@/components/voice-recorder/recording-timer";
import { RecordingWaveform } from "@/components/voice-recorder/recording-waveform";
import { RecordingControls } from "@/components/voice-recorder/recording-controls";
import { RecordingHelperText } from "@/components/voice-recorder/recording-helper-text";
import { DiscardConfirmSheet } from "@/components/voice-recorder/discard-confirm-sheet";

const LANGUAGE = "Auto-detect · Tagalog";

export default function VoiceJournalPage() {
  const router = useRouter();
  const recorder = useAudioRecorder();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    void recorder.start();
  }, [recorder]);

  useEffect(() => {
    const active = recorder.status === "recording" || recorder.status === "paused";
    if (!active) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [recorder.status]);

  const paused = recorder.status === "paused";
  const active = recorder.status === "recording" || recorder.status === "paused";

  async function handleStop() {
    const blob = await recorder.stop();
    const id = crypto.randomUUID();
    try {
      await putRecording({
        id,
        blob,
        durationMs: recorder.durationMs,
        language: LANGUAGE,
        createdAt: Date.now(),
      });
      router.push(`/journal/voice/review?id=${id}`);
    } catch {
      alert("Couldn't save the recording. Please try again.");
    }
  }

  function handleRequestExit() {
    if (active) {
      setConfirmOpen(true);
    } else {
      router.push("/dashboard");
    }
  }

  function handleConfirmDiscard() {
    recorder.cancel();
    router.push("/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-100">
      <div className="relative flex h-[844px] w-[390px] flex-col overflow-hidden bg-white">
        <div className="h-[62px] shrink-0" aria-hidden />

        {recorder.status === "error" ? (
          <ErrorFallback error={recorder.error} onRetry={() => void recorder.start()} onBack={() => router.push("/dashboard")} />
        ) : (
          <div className="flex flex-1 flex-col px-6">
            <RecordingHeader status={paused ? "paused" : "recording"} onClose={handleRequestExit} />

            <div className="mt-10 flex justify-center">
              <LanguagePill language={LANGUAGE} />
            </div>

            <div className="mt-12">
              <RecordingTimer durationMs={recorder.durationMs} />
            </div>

            <p className="mt-6 text-center text-[14px] text-[#8A8A8A]">
              {paused ? "Paused" : "Recording in progress"}
            </p>

            <div className="mt-10">
              <RecordingWaveform amplitude={recorder.amplitude} paused={paused} />
            </div>

            <div className="flex-1" />

            <div className="mb-4">
              <RecordingControls
                paused={paused}
                onPauseToggle={paused ? recorder.resume : recorder.pause}
                onStop={() => void handleStop()}
                onCancel={handleRequestExit}
              />
            </div>

            <div className="mb-6">
              <RecordingHelperText paused={paused} />
            </div>
          </div>
        )}

        <DiscardConfirmSheet
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          onDiscard={handleConfirmDiscard}
        />
      </div>
    </main>
  );
}

function ErrorFallback({
  error,
  onRetry,
  onBack,
}: {
  error: "mic-denied" | "mic-unavailable" | "unsupported" | "recorder-failure" | null;
  onRetry: () => void;
  onBack: () => void;
}) {
  const canRetry = error === "mic-denied" || error === "recorder-failure";
  const message =
    error === "mic-denied"
      ? "We need mic access to record your journal."
      : error === "mic-unavailable"
      ? "No microphone found on this device."
      : error === "unsupported"
      ? "Your browser doesn't support recording."
      : "Something went wrong. Please try again.";

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-8 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#F5F2ED]">
        <Mic className="h-7 w-7 text-[#1A1A1A]" strokeWidth={1.75} />
      </div>
      <p className="text-[15px] text-[#1A1A1A]">{message}</p>
      <div className="flex flex-col gap-3 self-stretch">
        {canRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="h-12 cursor-pointer rounded-full bg-[#8B5CF6] text-[15px] font-semibold text-white active:opacity-85"
          >
            Try again
          </button>
        )}
        <button
          type="button"
          onClick={onBack}
          className="h-12 cursor-pointer rounded-full bg-[#F5F2ED] text-[15px] font-semibold text-[#1A1A1A] active:opacity-85"
        >
          Back
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Manual verification**

Run: `npm run dev`
Open `http://localhost:3000/journal/voice`.

Verify:
1. Mic prompt appears. Allow it.
2. Pill says "Recording" with red dot; timer ticks `00:00` → `00:01` → ...
3. Speak loudly → center bars grow taller. Silence → bars settle to a thin line.
4. Tap **Pause** → pill shows "Paused", timer freezes, waveform collapses, helper text changes to Tagalog-paused line, center icon becomes a Play triangle.
5. Tap **Resume** → recording resumes, timer continues from where it left off.
6. Tap **Cancel** → confirm sheet slides up. "Keep recording" dismisses and recording continues uninterrupted. "Discard" navigates to `/dashboard`.
7. Tap **X** while recording → same confirm sheet.
8. Reload mid-recording → `beforeunload` warning appears.
9. Deny the mic prompt on a fresh page load → error fallback with "Try again" shows.

If all pass, continue.

- [ ] **Step 4: Commit**

```bash
git add src/app/journal/voice/page.tsx
git commit -m "feat(voice): wire up recording screen with live state machine"
```

---

## Task 13: Review page

**Files:**
- Create: `src/app/journal/voice/review/page.tsx`

- [ ] **Step 1: Create the page**

Create `/Users/georgette/Desktop/Innolympics-App/src/app/journal/voice/review/page.tsx`:

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BackButton } from "@/components/back-button";
import { deleteRecording, getRecording, updateTranscript, type AudioRecord } from "@/lib/audio-store";
import { transcribe } from "@/lib/transcribe";

type LoadState =
  | { kind: "loading" }
  | { kind: "not-found" }
  | { kind: "ready"; record: AudioRecord; audioUrl: string };

type TranscriptState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ready"; text: string }
  | { kind: "error"; message: string };

function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSeconds / 60);
  const s = (totalSeconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("en-US", { month: "long", day: "numeric" });
}

export default function VoiceReviewPage() {
  const router = useRouter();
  const params = useSearchParams();
  const id = params.get("id");

  const [load, setLoad] = useState<LoadState>({ kind: "loading" });
  const [transcript, setTranscript] = useState<TranscriptState>({ kind: "idle" });
  const urlRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!id) {
      setLoad({ kind: "not-found" });
      return;
    }
    (async () => {
      const record = await getRecording(id);
      if (cancelled) return;
      if (!record) {
        setLoad({ kind: "not-found" });
        return;
      }
      const audioUrl = URL.createObjectURL(record.blob);
      urlRef.current = audioUrl;
      setLoad({ kind: "ready", record, audioUrl });

      if (record.transcript) {
        setTranscript({ kind: "ready", text: record.transcript });
      } else {
        setTranscript({ kind: "loading" });
        try {
          const text = await transcribe(record.blob);
          if (cancelled) return;
          setTranscript({ kind: "ready", text });
          await updateTranscript(id, text);
        } catch (err) {
          if (cancelled) return;
          const message = err instanceof Error ? err.message : "Couldn't transcribe.";
          setTranscript({ kind: "error", message });
        }
      }
    })();
    return () => {
      cancelled = true;
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current);
        urlRef.current = null;
      }
    };
  }, [id]);

  async function handleRetry() {
    if (load.kind !== "ready" || !id) return;
    setTranscript({ kind: "loading" });
    try {
      const text = await transcribe(load.record.blob);
      setTranscript({ kind: "ready", text });
      await updateTranscript(id, text);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Couldn't transcribe.";
      setTranscript({ kind: "error", message });
    }
  }

  async function handleDiscard() {
    if (!id) return;
    await deleteRecording(id);
    router.push("/dashboard");
  }

  function handleSave() {
    // Placeholder — saving to database is out of scope for this task.
    router.push("/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-100">
      <div className="relative flex h-[844px] w-[390px] flex-col overflow-hidden bg-white">
        <div className="h-[62px] shrink-0" aria-hidden />
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-6 pb-6">
          <BackButton href="/dashboard" />

          {load.kind === "loading" && (
            <p className="mt-6 text-[15px] text-[#666666]">Loading…</p>
          )}

          {load.kind === "not-found" && (
            <div className="mt-6 flex flex-col gap-3">
              <h1 className="text-[26px] font-bold text-[#1A1A1A]" style={{ fontFamily: "var(--font-geist-sans)" }}>
                Recording not found
              </h1>
              <p className="text-[15px] text-[#666666]">
                We couldn&apos;t find that recording. It may have been deleted.
              </p>
            </div>
          )}

          {load.kind === "ready" && (
            <>
              <h1
                className="mt-2 text-[26px] font-bold tracking-[-0.3px] text-[#1A1A1A]"
                style={{ fontFamily: "var(--font-geist-sans)" }}
              >
                Voice journal
              </h1>
              <p className="text-[15px] text-[#666666]">
                {formatDate(load.record.createdAt)} · {formatDuration(load.record.durationMs)}
              </p>

              <div className="mt-4 rounded-3xl bg-[#F5F2ED] p-5">
                {transcript.kind === "loading" && (
                  <div className="flex flex-col gap-3">
                    <div className="h-3 w-3/4 animate-pulse rounded-full bg-[#E5DFD4]" aria-hidden />
                    <div className="h-3 w-5/6 animate-pulse rounded-full bg-[#E5DFD4]" aria-hidden />
                    <div className="h-3 w-2/3 animate-pulse rounded-full bg-[#E5DFD4]" aria-hidden />
                    <p className="mt-2 text-[14px] text-[#8A8A8A]">Transcribing…</p>
                  </div>
                )}
                {transcript.kind === "ready" && (
                  <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-[#1A1A1A]">
                    {transcript.text || "(No speech detected.)"}
                  </p>
                )}
                {transcript.kind === "error" && (
                  <div className="flex flex-col gap-2">
                    <p className="text-[14px] text-[#8A8A8A]">Couldn&apos;t transcribe.</p>
                    <button
                      type="button"
                      onClick={() => void handleRetry()}
                      className="self-start text-[14px] font-semibold text-[#8B5CF6]"
                    >
                      Retry
                    </button>
                  </div>
                )}
              </div>

              <audio
                controls
                src={load.audioUrl}
                className="mt-2 w-full"
                aria-label="Recording playback"
              />

              <div className="mt-auto flex flex-col gap-3 pt-6">
                <button
                  type="button"
                  onClick={handleSave}
                  className="h-12 cursor-pointer rounded-full bg-[#8B5CF6] text-[15px] font-semibold text-white transition-opacity active:opacity-85"
                >
                  Save entry
                </button>
                <button
                  type="button"
                  onClick={() => void handleDiscard()}
                  className="h-12 cursor-pointer rounded-full bg-[#F5F2ED] text-[15px] font-semibold text-[#1A1A1A] transition-opacity active:opacity-85"
                >
                  Discard
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Full end-to-end manual verification**

Run: `npm run dev`

1. `http://localhost:3000/journal/voice` → allow mic, speak a short sentence, tap **Stop**.
2. Navigates to `/journal/voice/review?id=...`.
3. Audio player shows and plays back your recording at the correct duration.
4. "Transcribing…" skeleton shows briefly, then the transcript text appears.
5. Reload the same review URL → transcript appears immediately (cached in IndexedDB), no second Gemini call.
6. Visit `/journal/voice/review?id=does-not-exist` → "Recording not found" fallback.
7. **Offline transcript retry:** open DevTools → Network → set to Offline. Do a new recording → Stop → review page shows error + Retry. Switch back to Online, tap Retry → transcript loads.
8. Tap **Discard** → IndexedDB entry for that id is deleted (check DevTools → Application → IndexedDB → `innolympics-audio` → `recordings`), routes to `/dashboard`.
9. No console errors or React warnings.

- [ ] **Step 4: Commit**

```bash
git add src/app/journal/voice/review/page.tsx
git commit -m "feat(voice): add review page with playback and Gemini transcription"
```

---

## Done

At this point:
- `/journal/voice` is a working recording screen matching the mockup.
- Stop persists to IndexedDB and routes to the review page.
- The review page plays back the audio and shows a real transcript from Gemini.
- API key lives only on the server.
- Cancel / X / discard flows all route safely back to `/dashboard`.
- Transcript is cached, so re-visiting the review page doesn't re-hit Gemini.

Subsequent work (out of scope for this plan): save-to-database, dynamic language picker, entries list, transcript editing.
