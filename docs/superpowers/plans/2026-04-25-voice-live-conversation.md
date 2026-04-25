# Voice Journal — Live Conversation Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the one-way recorder at `/journal/voice` with a live bidirectional Gemini Live conversation that produces a coach-guided journal transcript only when the user taps Stop.

**Architecture:** Client opens a Gemini Live WebSocket using a server-minted ephemeral token, streams 16 kHz PCM mic audio in via an `AudioWorklet`, plays AI audio replies out through an `AudioContext`, and accumulates user/AI turns from Live's streamed input/output transcripts. On Stop, turns are persisted to IndexedDB and the review page renders them as AI-question headings with user reflection body text — no audio playback, no blob storage.

**Tech Stack:** Next.js 16 (webpack), React 19, `@google/genai` 1.50.1 SDK (Live API + ephemeral tokens), Tailwind v4, IndexedDB, Web Audio API (`AudioWorklet`, `AudioContext`).

**Spec:** `docs/superpowers/specs/2026-04-25-voice-live-conversation-design.md`

---

## File Structure

Files created:
- `src/app/api/live-token/route.ts` — ephemeral token minting endpoint.
- `src/lib/turns-store.ts` — IndexedDB CRUD for conversation turns.
- `src/lib/live-system-prompt.ts` — the coach system instruction constant.
- `src/lib/pcm-worklet-processor.ts` — `AudioWorklet` source that converts mic input to 16 kHz 16-bit PCM frames. Emitted verbatim to `/public/audio-worklets/pcm-processor.js` during task.
- `public/audio-worklets/pcm-processor.js` — the served worklet (plain JS, not bundled).
- `src/lib/pcm-playback-queue.ts` — enqueues incoming 24 kHz 16-bit PCM buffers from Gemini and plays them through an `AudioContext`.
- `src/lib/use-live-conversation.ts` — React hook that owns the live session lifecycle.
- `src/components/voice-recorder/live-status-pill.tsx` — status chip: Connecting / Listening / Thinking / Speaking.
- `src/components/voice-recorder/live-orb.tsx` — pulsing orb visualization keyed off status + amplitude.
- `src/components/voice-recorder/live-caption.tsx` — the latest AI caption line.
- `src/components/voice-recorder/live-stop-button.tsx` — round red stop button.

Files modified:
- `src/app/journal/voice/page.tsx` — replace the entire recording UI with the phone-call layout driven by `useLiveConversation`.
- `src/app/journal/voice/review/page.tsx` — load turns instead of a blob; render AI-question/user-reflection pairs; drop `<audio>` playback and the `/api/transcribe` call.

Files untouched but referenced:
- `src/lib/audio-store.ts` — kept on disk, no longer imported by the voice flow.
- `src/lib/use-audio-recorder.ts` — kept on disk, no longer imported by the voice flow.
- `src/app/api/transcribe/route.ts` — kept, no longer called by this flow.
- `src/components/voice-recorder/{recording-header,discard-confirm-sheet}.tsx` — reused by `page.tsx`.

---

## Task 1: Ephemeral token route

**Files:**
- Create: `src/app/api/live-token/route.ts`

- [ ] **Step 1: Create the route file**

Write `src/app/api/live-token/route.ts` with this exact content:

```typescript
import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODEL = "gemini-live-2.5-flash-preview";

export async function POST() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GEMINI_API_KEY not configured" }, { status: 500 });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const token = await ai.authTokens.create({
      config: {
        uses: 1,
        expireTime: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        newSessionExpireTime: new Date(Date.now() + 2 * 60 * 1000).toISOString(),
        liveConnectConstraints: {
          model: MODEL,
        },
      },
    });

    if (!token.name) {
      return NextResponse.json({ error: "Token minting returned no name" }, { status: 502 });
    }

    return NextResponse.json({ token: token.name, model: MODEL });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Token creation failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
```

- [ ] **Step 2: Smoke-test the endpoint**

Run: `curl -s -X POST http://localhost:3000/api/live-token | head -c 400`
Expected: JSON body containing a `token` field starting with `auth_tokens/...` and a `model` field. If you get a 500 with "GEMINI_API_KEY not configured", export the key in `.env.local` and restart `npm run dev`. If you get a 502, the API key does not have Live API access — stop and flag this to the user before proceeding.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/live-token/route.ts
git commit -m "feat(voice): add /api/live-token for Gemini Live ephemeral tokens"
```

---

## Task 2: System prompt constant

**Files:**
- Create: `src/lib/live-system-prompt.ts`

- [ ] **Step 1: Write the file**

```typescript
export const LIVE_SYSTEM_PROMPT = `You are a warm, reflective journaling coach. The user is voice-journaling. Listen to what they share, then ask ONE short, open-ended follow-up question that helps them go deeper — how they felt, what surprised them, what they want to explore further. Keep replies to one or two sentences. Do not summarize, do not give advice, do not repeat what they said. Match the user's language (English, Tagalog, or Taglish).`;
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/live-system-prompt.ts
git commit -m "feat(voice): add live coach system prompt constant"
```

---

## Task 3: PCM capture AudioWorklet

The worklet is served as static JS from `public/` because Next's webpack pipeline does not bundle `audioWorklet.addModule()` targets. It is plain, un-typed JS by necessity (worklet global scope has no DOM, no module resolution).

**Files:**
- Create: `public/audio-worklets/pcm-processor.js`

- [ ] **Step 1: Ensure the directory exists**

Run: `mkdir -p public/audio-worklets`

- [ ] **Step 2: Write the worklet**

Write `public/audio-worklets/pcm-processor.js` with this exact content:

```javascript
// Captures mono mic audio and downsamples to 16 kHz 16-bit PCM frames.
// Emits each frame as a transferable ArrayBuffer via port.postMessage.
// Gemini Live expects mimeType "audio/pcm;rate=16000".

class PcmProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this._buffer = [];
    this._targetRate = 16000;
    this._ratio = sampleRate / this._targetRate;
    this._frameTargetSamples = Math.floor(this._targetRate * 0.08); // ~80ms frames
    this._accum = 0;
  }

  process(inputs) {
    const input = inputs[0];
    if (!input || input.length === 0) return true;
    const channel = input[0];
    if (!channel) return true;

    for (let i = 0; i < channel.length; i++) {
      this._accum += 1;
      if (this._accum >= this._ratio) {
        this._accum -= this._ratio;
        const sample = Math.max(-1, Math.min(1, channel[i]));
        this._buffer.push(sample < 0 ? sample * 0x8000 : sample * 0x7fff);
      }
    }

    while (this._buffer.length >= this._frameTargetSamples) {
      const frame = this._buffer.splice(0, this._frameTargetSamples);
      const out = new Int16Array(frame.length);
      for (let i = 0; i < frame.length; i++) out[i] = frame[i] | 0;
      this.port.postMessage(out.buffer, [out.buffer]);
    }

    return true;
  }
}

registerProcessor("pcm-processor", PcmProcessor);
```

- [ ] **Step 3: Verify the file is served**

Run: `curl -sI http://localhost:3000/audio-worklets/pcm-processor.js | head -5`
Expected: `HTTP/1.1 200 OK` (or `HTTP/2 200`) and a `content-type` of `application/javascript` or `text/javascript`.

- [ ] **Step 4: Commit**

```bash
git add public/audio-worklets/pcm-processor.js
git commit -m "feat(voice): add 16kHz PCM capture worklet"
```

---

## Task 4: PCM playback queue

Gemini Live streams AI audio as 24 kHz 16-bit PCM chunks. The queue schedules them back-to-back on an `AudioContext` so playback sounds continuous.

**Files:**
- Create: `src/lib/pcm-playback-queue.ts`

- [ ] **Step 1: Write the module**

```typescript
export type PcmPlaybackQueue = {
  enqueue: (pcm: Int16Array) => void;
  clear: () => void;
  close: () => void;
  isPlaying: () => boolean;
  onIdle: (cb: () => void) => void;
};

export function createPcmPlaybackQueue(sampleRate = 24000): PcmPlaybackQueue {
  const AudioCtx =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new AudioCtx({ sampleRate });
  let nextStartAt = 0;
  let activeSources: AudioBufferSourceNode[] = [];
  let idleCb: (() => void) | null = null;

  function scheduleIdleCheck() {
    const now = ctx.currentTime;
    if (nextStartAt <= now && idleCb) {
      idleCb();
    }
  }

  return {
    enqueue(pcm) {
      if (pcm.length === 0) return;
      const buffer = ctx.createBuffer(1, pcm.length, sampleRate);
      const ch = buffer.getChannelData(0);
      for (let i = 0; i < pcm.length; i++) ch[i] = pcm[i] / 0x8000;

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);

      const now = ctx.currentTime;
      const startAt = Math.max(nextStartAt, now);
      source.start(startAt);
      nextStartAt = startAt + buffer.duration;
      activeSources.push(source);
      source.onended = () => {
        activeSources = activeSources.filter((s) => s !== source);
        scheduleIdleCheck();
      };
    },
    clear() {
      activeSources.forEach((s) => {
        try {
          s.stop();
        } catch {}
      });
      activeSources = [];
      nextStartAt = ctx.currentTime;
    },
    close() {
      activeSources.forEach((s) => {
        try {
          s.stop();
        } catch {}
      });
      activeSources = [];
      ctx.close().catch(() => {});
    },
    isPlaying() {
      return ctx.currentTime < nextStartAt;
    },
    onIdle(cb) {
      idleCb = cb;
    },
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/pcm-playback-queue.ts
git commit -m "feat(voice): add PCM playback queue for Gemini Live audio"
```

---

## Task 5: Turns store

IndexedDB module mirroring the shape of `audio-store.ts`. Separate DB name so the old recordings store is undisturbed.

**Files:**
- Create: `src/lib/turns-store.ts`

- [ ] **Step 1: Write the file**

```typescript
const DB_NAME = "innolympics-turns";
const DB_VERSION = 1;
const STORE = "sessions";

export type Turn = {
  role: "user" | "ai";
  text: string;
  ts: number;
};

export type TurnsRecord = {
  id: string;
  turns: Turn[];
  durationMs: number;
  createdAt: number;
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

function tx<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
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

export async function putTurns(record: TurnsRecord): Promise<void> {
  await tx("readwrite", (s) => s.put(record));
}

export async function getTurns(id: string): Promise<TurnsRecord | undefined> {
  return tx<TurnsRecord | undefined>("readonly", (s) =>
    s.get(id) as IDBRequest<TurnsRecord | undefined>,
  );
}

export async function deleteTurns(id: string): Promise<void> {
  await tx("readwrite", (s) => s.delete(id));
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/turns-store.ts
git commit -m "feat(voice): add IndexedDB store for conversation turns"
```

---

## Task 6: `useLiveConversation` hook

This is the heart of the feature. It owns: the ephemeral token fetch, the `GoogleGenAI.live.connect()` session, the mic → worklet → socket pipeline, the AI audio → playback queue pipeline, and the turns accumulator.

**Files:**
- Create: `src/lib/use-live-conversation.ts`

- [ ] **Step 1: Write the hook**

```typescript
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { GoogleGenAI, Modality, type LiveServerMessage, type Session } from "@google/genai";
import { LIVE_SYSTEM_PROMPT } from "./live-system-prompt";
import { createPcmPlaybackQueue, type PcmPlaybackQueue } from "./pcm-playback-queue";
import type { Turn } from "./turns-store";

export type LiveStatus =
  | "idle"
  | "connecting"
  | "listening"
  | "thinking"
  | "speaking"
  | "error";

export type LiveError =
  | "token-failed"
  | "socket-failed"
  | "mic-denied"
  | "mic-unavailable"
  | "unsupported";

export type UseLiveConversation = {
  status: LiveStatus;
  durationMs: number;
  turns: Turn[];
  latestAiCaption: string;
  error: LiveError | null;
  start: () => Promise<void>;
  stop: () => Promise<Turn[]>;
  cancel: () => void;
};

type TokenResponse = { token: string; model: string };

function base64ToInt16(base64: string): Int16Array {
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Int16Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 2);
}

function int16ToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

export function useLiveConversation(): UseLiveConversation {
  const [status, setStatus] = useState<LiveStatus>("idle");
  const [durationMs, setDurationMs] = useState(0);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [latestAiCaption, setLatestAiCaption] = useState("");
  const [error, setError] = useState<LiveError | null>(null);

  const sessionRef = useRef<Session | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const captureCtxRef = useRef<AudioContext | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const playbackRef = useRef<PcmPlaybackQueue | null>(null);
  const startedAtRef = useRef(0);
  const tickRef = useRef<number | null>(null);
  const userBufferRef = useRef("");
  const aiBufferRef = useRef("");
  const turnsRef = useRef<Turn[]>([]);

  const pushTurn = useCallback((turn: Turn) => {
    turnsRef.current = [...turnsRef.current, turn];
    setTurns(turnsRef.current);
  }, []);

  const flushUserTurn = useCallback(() => {
    const text = userBufferRef.current.trim();
    userBufferRef.current = "";
    if (text.length > 0) pushTurn({ role: "user", text, ts: Date.now() });
  }, [pushTurn]);

  const flushAiTurn = useCallback(() => {
    const text = aiBufferRef.current.trim();
    aiBufferRef.current = "";
    if (text.length > 0) pushTurn({ role: "ai", text, ts: Date.now() });
  }, [pushTurn]);

  const teardown = useCallback(() => {
    if (tickRef.current !== null) {
      cancelAnimationFrame(tickRef.current);
      tickRef.current = null;
    }
    if (workletNodeRef.current) {
      workletNodeRef.current.port.onmessage = null;
      try {
        workletNodeRef.current.disconnect();
      } catch {}
      workletNodeRef.current = null;
    }
    if (captureCtxRef.current) {
      captureCtxRef.current.close().catch(() => {});
      captureCtxRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (playbackRef.current) {
      playbackRef.current.close();
      playbackRef.current = null;
    }
    if (sessionRef.current) {
      try {
        sessionRef.current.close();
      } catch {}
      sessionRef.current = null;
    }
    userBufferRef.current = "";
    aiBufferRef.current = "";
  }, []);

  useEffect(() => () => teardown(), [teardown]);

  const tick = useCallback(() => {
    setDurationMs(Date.now() - startedAtRef.current);
    tickRef.current = requestAnimationFrame(tick);
  }, []);

  const handleServerMessage = useCallback(
    (msg: LiveServerMessage) => {
      const sc = msg.serverContent;
      if (!sc) return;

      if (sc.inputTranscription?.text) {
        userBufferRef.current += sc.inputTranscription.text;
      }
      if (sc.outputTranscription?.text) {
        aiBufferRef.current += sc.outputTranscription.text;
        setLatestAiCaption(aiBufferRef.current.trim());
      }

      const modelParts = sc.modelTurn?.parts ?? [];
      for (const part of modelParts) {
        const inline = part.inlineData;
        if (inline?.data && inline.mimeType?.startsWith("audio/pcm")) {
          const pcm = base64ToInt16(inline.data);
          playbackRef.current?.enqueue(pcm);
          setStatus("speaking");
        }
      }

      if (sc.generationComplete || sc.turnComplete) {
        flushUserTurn();
        flushAiTurn();
        if (!playbackRef.current?.isPlaying()) {
          setStatus("listening");
        } else {
          playbackRef.current.onIdle(() => setStatus("listening"));
        }
      }

      if (sc.interrupted) {
        playbackRef.current?.clear();
      }
    },
    [flushAiTurn, flushUserTurn],
  );

  const start = useCallback(async () => {
    if (typeof window === "undefined") return;
    if (!navigator.mediaDevices?.getUserMedia || typeof AudioWorkletNode === "undefined") {
      setError("unsupported");
      setStatus("error");
      return;
    }

    setError(null);
    setStatus("connecting");
    turnsRef.current = [];
    setTurns([]);
    setLatestAiCaption("");

    let tokenRes: TokenResponse;
    try {
      const res = await fetch("/api/live-token", { method: "POST" });
      if (!res.ok) throw new Error(`token ${res.status}`);
      tokenRes = (await res.json()) as TokenResponse;
    } catch {
      setError("token-failed");
      setStatus("error");
      return;
    }

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
    } catch (err) {
      const name = (err as { name?: string })?.name;
      setError(
        name === "NotAllowedError" || name === "SecurityError"
          ? "mic-denied"
          : "mic-unavailable",
      );
      setStatus("error");
      return;
    }

    try {
      playbackRef.current = createPcmPlaybackQueue(24000);

      const ai = new GoogleGenAI({ apiKey: tokenRes.token, apiVersion: "v1alpha" });
      const session = await ai.live.connect({
        model: tokenRes.model,
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: { parts: [{ text: LIVE_SYSTEM_PROMPT }] },
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        },
        callbacks: {
          onopen: () => {},
          onmessage: handleServerMessage,
          onerror: () => {
            setError("socket-failed");
            setStatus("error");
          },
          onclose: () => {},
        },
      });
      sessionRef.current = session;

      const AudioCtx =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const captureCtx = new AudioCtx();
      captureCtxRef.current = captureCtx;
      await captureCtx.audioWorklet.addModule("/audio-worklets/pcm-processor.js");
      const source = captureCtx.createMediaStreamSource(stream);
      const node = new AudioWorkletNode(captureCtx, "pcm-processor");
      workletNodeRef.current = node;
      source.connect(node);
      node.port.onmessage = (e: MessageEvent<ArrayBuffer>) => {
        const data = int16ToBase64(e.data);
        sessionRef.current?.sendRealtimeInput({
          audio: { data, mimeType: "audio/pcm;rate=16000" },
        });
      };

      startedAtRef.current = Date.now();
      setDurationMs(0);
      tickRef.current = requestAnimationFrame(tick);
      setStatus("listening");
    } catch (err) {
      const message = err instanceof Error ? err.message : "socket failed";
      console.error("live-conversation connect failed:", message);
      setError("socket-failed");
      setStatus("error");
      teardown();
    }
  }, [handleServerMessage, teardown, tick]);

  const stop = useCallback(async (): Promise<Turn[]> => {
    flushUserTurn();
    flushAiTurn();
    const finalTurns = turnsRef.current;
    teardown();
    setStatus("idle");
    return finalTurns;
  }, [flushAiTurn, flushUserTurn, teardown]);

  const cancel = useCallback(() => {
    teardown();
    setStatus("idle");
    setDurationMs(0);
    setTurns([]);
    turnsRef.current = [];
    setLatestAiCaption("");
    setError(null);
  }, [teardown]);

  return { status, durationMs, turns, latestAiCaption, error, start, stop, cancel };
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors in `src/lib/use-live-conversation.ts`. If the compiler complains that `Modality` or `LiveServerMessage` is not exported, re-check the import line — both are re-exported from the top-level `@google/genai` entry per the installed SDK's `dist/genai.d.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/use-live-conversation.ts
git commit -m "feat(voice): add useLiveConversation hook (Gemini Live session owner)"
```

---

## Task 7: Live status pill component

**Files:**
- Create: `src/components/voice-recorder/live-status-pill.tsx`

- [ ] **Step 1: Write the component**

```typescript
"use client";

import type { LiveStatus } from "@/lib/use-live-conversation";

const LABELS: Record<LiveStatus, string> = {
  idle: "Ready",
  connecting: "Connecting…",
  listening: "Listening…",
  thinking: "Thinking…",
  speaking: "Speaking…",
  error: "Error",
};

export function LiveStatusPill({ status }: { status: LiveStatus }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full bg-[#F5F2ED] px-3 py-1">
      <span
        className="inline-block h-2 w-2 rounded-full bg-[#8B5CF6]"
        aria-hidden
      />
      <span className="text-[13px] font-medium text-[#1A1A1A]">
        {LABELS[status]}
      </span>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/voice-recorder/live-status-pill.tsx
git commit -m "feat(voice): add live status pill component"
```

---

## Task 8: Live orb component

**Files:**
- Create: `src/components/voice-recorder/live-orb.tsx`

- [ ] **Step 1: Write the component**

```typescript
"use client";

import { cn } from "@/lib/utils";
import type { LiveStatus } from "@/lib/use-live-conversation";

export function LiveOrb({ status }: { status: LiveStatus }) {
  const speaking = status === "speaking";
  const listening = status === "listening";
  const thinking = status === "thinking" || status === "connecting";

  const color = speaking
    ? "bg-[#F5A623]"
    : listening
    ? "bg-[#8B5CF6]"
    : "bg-[#CFC9BE]";

  const pulse = speaking
    ? "animate-[live-orb-fast_0.9s_ease-in-out_infinite]"
    : listening
    ? "animate-[live-orb-slow_2.2s_ease-in-out_infinite]"
    : thinking
    ? "animate-pulse"
    : "";

  return (
    <div className="relative flex h-[220px] w-[220px] items-center justify-center">
      <style>{`
        @keyframes live-orb-slow {
          0%, 100% { transform: scale(1); opacity: 0.85; }
          50% { transform: scale(1.06); opacity: 1; }
        }
        @keyframes live-orb-fast {
          0%, 100% { transform: scale(1); opacity: 0.9; }
          50% { transform: scale(1.12); opacity: 1; }
        }
      `}</style>
      <div
        className={cn(
          "h-[180px] w-[180px] rounded-full blur-[1px] shadow-[0_0_60px_rgba(139,92,246,0.35)]",
          color,
          pulse,
        )}
        aria-hidden
      />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/voice-recorder/live-orb.tsx
git commit -m "feat(voice): add live orb visualization"
```

---

## Task 9: Live caption component

**Files:**
- Create: `src/components/voice-recorder/live-caption.tsx`

- [ ] **Step 1: Write the component**

```typescript
"use client";

export function LiveCaption({ text }: { text: string }) {
  return (
    <p
      className="mx-auto max-w-[320px] min-h-[48px] text-center text-[17px] leading-[24px] text-[#1A1A1A]"
      aria-live="polite"
    >
      {text}
    </p>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/voice-recorder/live-caption.tsx
git commit -m "feat(voice): add live caption component"
```

---

## Task 10: Live stop button

**Files:**
- Create: `src/components/voice-recorder/live-stop-button.tsx`

- [ ] **Step 1: Write the component**

```typescript
"use client";

import { Square } from "lucide-react";

export function LiveStopButton({
  onClick,
  disabled,
}: {
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label="Stop conversation"
      className="flex h-[72px] w-[72px] cursor-pointer items-center justify-center rounded-full bg-[#E25B5B] shadow-[0_8px_24px_rgba(226,91,91,0.35)] transition-opacity active:opacity-85 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <Square className="h-7 w-7 fill-white text-white" strokeWidth={0} />
    </button>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/voice-recorder/live-stop-button.tsx
git commit -m "feat(voice): add live stop button"
```

---

## Task 11: Voice page — replace UI with phone-call layout

**Files:**
- Modify: `src/app/journal/voice/page.tsx` (full rewrite)

- [ ] **Step 1: Rewrite the file**

Replace the entire contents of `src/app/journal/voice/page.tsx` with:

```typescript
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Mic } from "lucide-react";
import { useLiveConversation, type LiveError } from "@/lib/use-live-conversation";
import { putTurns } from "@/lib/turns-store";
import { RecordingHeader } from "@/components/voice-recorder/recording-header";
import { DiscardConfirmSheet } from "@/components/voice-recorder/discard-confirm-sheet";
import { LiveStatusPill } from "@/components/voice-recorder/live-status-pill";
import { LiveOrb } from "@/components/voice-recorder/live-orb";
import { LiveCaption } from "@/components/voice-recorder/live-caption";
import { LiveStopButton } from "@/components/voice-recorder/live-stop-button";

function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = (total % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export default function VoiceJournalPage() {
  const router = useRouter();
  const live = useLiveConversation();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const frameRef = useRef<HTMLDivElement>(null);

  const active = live.status !== "idle" && live.status !== "error";

  useEffect(() => {
    if (!active) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [active]);

  const controlsStatus = live.status === "paused" ? "paused" : active ? "recording" : "idle";

  async function handleStop() {
    setSaving(true);
    const turns = await live.stop();
    if (turns.length === 0) {
      router.push("/dashboard");
      return;
    }
    const id = crypto.randomUUID();
    try {
      await putTurns({
        id,
        turns,
        durationMs: live.durationMs,
        createdAt: Date.now(),
      });
      router.push(`/journal/voice/review?id=${id}`);
    } catch {
      alert("Couldn't save the conversation. Please try again.");
      setSaving(false);
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
    live.cancel();
    router.push("/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-100">
      <div
        ref={frameRef}
        className="relative flex h-[844px] w-[390px] flex-col overflow-hidden bg-white"
      >
        <div className="h-[62px] shrink-0" aria-hidden />

        {live.status === "error" ? (
          <ErrorFallback
            error={live.error}
            onRetry={() => void live.start()}
            onBack={() => router.push("/dashboard")}
          />
        ) : (
          <div className="flex flex-1 flex-col px-6">
            <RecordingHeader status={controlsStatus as "idle" | "recording" | "paused"} onClose={handleRequestExit} />

            <div className="mt-8 flex justify-center">
              <LiveStatusPill status={live.status} />
            </div>

            <div className="mt-10 flex justify-center">
              <LiveOrb status={live.status} />
            </div>

            <div className="mt-6">
              <LiveCaption text={live.latestAiCaption} />
            </div>

            <div className="flex-1" />

            <div className="mb-2 flex items-center justify-between">
              <span className="text-[13px] text-[#8A8A8A]">
                {formatDuration(live.durationMs)}
              </span>
              <span className="text-[13px] text-[#8A8A8A]">
                {live.turns.length} turn{live.turns.length === 1 ? "" : "s"}
              </span>
            </div>

            <div className="mb-8 flex justify-center">
              {live.status === "idle" ? (
                <button
                  type="button"
                  onClick={() => void live.start()}
                  className="flex h-[72px] w-[72px] cursor-pointer items-center justify-center rounded-full bg-[#8B5CF6] shadow-[0_8px_24px_rgba(139,92,246,0.35)] transition-opacity active:opacity-85"
                  aria-label="Start conversation"
                >
                  <Mic className="h-7 w-7 text-white" strokeWidth={2} />
                </button>
              ) : (
                <LiveStopButton onClick={() => void handleStop()} disabled={saving} />
              )}
            </div>
          </div>
        )}

        <DiscardConfirmSheet
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          onDiscard={handleConfirmDiscard}
          container={frameRef}
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
  error: LiveError | null;
  onRetry: () => void;
  onBack: () => void;
}) {
  const canRetry =
    error === "mic-denied" ||
    error === "token-failed" ||
    error === "socket-failed";
  const message =
    error === "mic-denied"
      ? "We need mic access to start the conversation."
      : error === "mic-unavailable"
      ? "No microphone found on this device."
      : error === "unsupported"
      ? "Your browser doesn't support live audio."
      : error === "token-failed"
      ? "Couldn't start the live session. Please try again."
      : error === "socket-failed"
      ? "The live session disconnected. Please try again."
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
Expected: no errors. If `RecordingHeader` requires specific props, consult `src/components/voice-recorder/recording-header.tsx` and adjust.

- [ ] **Step 3: Commit**

```bash
git add src/app/journal/voice/page.tsx
git commit -m "feat(voice): replace recorder UI with live conversation layout"
```

---

## Task 12: Review page — render turns, drop audio

**Files:**
- Modify: `src/app/journal/voice/review/page.tsx` (full rewrite)

- [ ] **Step 1: Rewrite the file**

Replace the entire contents of `src/app/journal/voice/review/page.tsx` with:

```typescript
"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BackButton } from "@/components/back-button";
import { deleteTurns, getTurns, type TurnsRecord } from "@/lib/turns-store";

type LoadState =
  | { kind: "loading" }
  | { kind: "not-found" }
  | { kind: "ready"; record: TurnsRecord };

function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = (total % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("en-US", { month: "long", day: "numeric" });
}

function VoiceReviewPageInner() {
  const router = useRouter();
  const params = useSearchParams();
  const id = params.get("id");
  const [load, setLoad] = useState<LoadState>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    if (!id) {
      setLoad({ kind: "not-found" });
      return;
    }
    (async () => {
      const record = await getTurns(id);
      if (cancelled) return;
      setLoad(record ? { kind: "ready", record } : { kind: "not-found" });
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function handleDiscard() {
    if (!id) return;
    await deleteTurns(id);
    router.push("/dashboard");
  }

  function handleSave() {
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
              <h1
                className="text-[26px] font-bold text-[#1A1A1A]"
                style={{ fontFamily: "var(--font-geist-sans)" }}
              >
                Conversation not found
              </h1>
              <p className="text-[15px] text-[#666666]">
                We couldn&apos;t find that conversation. It may have been deleted.
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

              <div className="mt-4 flex flex-col gap-5 rounded-3xl bg-[#F5F2ED] p-5">
                {renderGroupedTurns(load.record.turns)}
              </div>

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

function renderGroupedTurns(turns: TurnsRecord["turns"]) {
  // Group into: [optional ai heading] + [user body]. Consecutive same-role turns are merged.
  type Group = { heading: string | null; body: string };
  const groups: Group[] = [];
  let pendingHeading: string | null = null;
  let currentBody: string | null = null;

  for (const t of turns) {
    if (t.role === "ai") {
      if (currentBody !== null) {
        groups.push({ heading: pendingHeading, body: currentBody });
        currentBody = null;
      }
      pendingHeading = pendingHeading ? `${pendingHeading} ${t.text}` : t.text;
    } else {
      currentBody = currentBody ? `${currentBody} ${t.text}` : t.text;
      if (pendingHeading !== null && currentBody !== null) {
        // heading will be attached on flush
      }
    }
  }
  if (currentBody !== null) {
    groups.push({ heading: pendingHeading, body: currentBody });
  } else if (pendingHeading !== null) {
    groups.push({ heading: null, body: pendingHeading });
  }

  if (groups.length === 0) {
    return <p className="text-[14px] text-[#8A8A8A]">(No conversation recorded.)</p>;
  }

  return groups.map((g, i) => (
    <div key={i} className="flex flex-col gap-2">
      {g.heading && (
        <p className="text-[14px] italic leading-snug text-[#8A8A8A]">{g.heading}</p>
      )}
      <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-[#1A1A1A]">
        {g.body}
      </p>
    </div>
  ));
}

export default function VoiceReviewPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-neutral-100">
          <div className="h-[844px] w-[390px] bg-white" />
        </main>
      }
    >
      <VoiceReviewPageInner />
    </Suspense>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors. If `BackButton` has a different prop shape, consult `src/components/back-button.tsx` and match.

- [ ] **Step 3: Commit**

```bash
git add src/app/journal/voice/review/page.tsx
git commit -m "feat(voice): render conversation turns on review page"
```

---

## Task 13: Manual verification

- [ ] **Step 1: Lint and build**

Run: `npm run lint` — expected: no errors (warnings OK).
Run: `npx tsc --noEmit` — expected: no errors.

- [ ] **Step 2: Start dev server and load the page**

Run: `npm run dev` (in background or another terminal).
Open: `http://localhost:3000/journal/voice` in Chrome.
Expected:
- Page loads. Big violet mic button bottom-center.
- Status pill shows "Ready".

- [ ] **Step 3: Start a session**

Tap the mic button. Grant mic permission when prompted.
Expected: status transitions to "Connecting…" then "Listening…". Orb pulses violet.

- [ ] **Step 4: Have a short conversation**

Say: "I had a rough morning — my meeting went sideways."
Expected within ~3s:
- Status transitions to "Speaking…". Orb pulses amber.
- AI voice plays through speakers.
- AI caption appears below the orb (a short reflective question).
- Status returns to "Listening…" when AI finishes speaking.

- [ ] **Step 5: Reply and stop**

Say something in reply. Wait for the AI to reply again. Then tap the red stop button.
Expected: navigates to `/journal/voice/review?id=...` and shows the transcript with AI questions as italic headings and your replies as body paragraphs.

- [ ] **Step 6: Discard and verify cleanup**

Tap "Discard". Navigate back to `/journal/voice/review?id=<same-id>` by pasting the URL.
Expected: "Conversation not found" message.

- [ ] **Step 7: Test error path — deny mic**

In a new incognito window, go to `/journal/voice`, tap start, deny mic permission.
Expected: error state with "We need mic access to start the conversation." and a "Try again" button.

- [ ] **Step 8: Commit verification notes if any fixes were needed**

If any of the above steps failed and required a fix, commit the fix with a clear message. If everything passed, no commit needed for this task.

---

## Post-implementation checklist

- [ ] `npm run lint` clean.
- [ ] `npx tsc --noEmit` clean.
- [ ] Manual happy path works in Chrome.
- [ ] Error paths (mic denied, token failure) show the correct UI.
- [ ] Review page renders turns with no `<audio>` element present.
- [ ] No import of `use-audio-recorder`, `audio-store`, or `/api/transcribe` remains in `src/app/journal/voice/**`.
