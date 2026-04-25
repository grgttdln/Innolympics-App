"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  FunctionResponseScheduling,
  GoogleGenAI,
  Modality,
  type LiveServerMessage,
  type Session,
} from "@google/genai";
import { createPcmPlaybackQueue, type PcmPlaybackQueue } from "./pcm-playback-queue";
import type { Turn } from "./turns-store";
import { scanForCrisis } from "@/lib/safety/crisis-scanner";
import { VOICE_UNIFIED_PROMPT } from "@/lib/agents/prompts/voice-unified";
import { VOICE_TOOLS } from "@/lib/agents/voice-tools";
import { CRISIS_INTERCEPT_PH } from "@/lib/safety/crisis-templates";

export type LiveStatus =
  | "idle"
  | "connecting"
  | "listening"
  | "speaking"
  | "paused"
  | "error";

export type LiveError =
  | "token-failed"
  | "socket-failed"
  | "mic-denied"
  | "mic-unavailable"
  | "unsupported"
  | "auth-required";

export type CrisisIntercept = {
  keywords: string[];
  message: string;
  triggeredAt: number;
};

export type UseLiveConversation = {
  status: LiveStatus;
  durationMs: number;
  turns: Turn[];
  latestAiCaption: string;
  error: LiveError | null;
  crisisIntercept: CrisisIntercept | null;
  start: () => Promise<void>;
  stop: () => Promise<Turn[]>;
  cancel: () => void;
  pause: () => void;
  resume: () => void;
};

type TokenResponse = { token: string; model: string };

/** Max time we wait for a backend memory route before telling Gemini "empty". */
const TOOL_CALL_TIMEOUT_MS = 300;

/** After turnComplete, how long we give the async /api/journal POST. */
const JOURNAL_POST_TIMEOUT_MS = 15_000;

type UseLiveConversationOptions = {
  /** Integer user id from `loadUser()`. Required for memory + backend writes. */
  userId: number | null;
};

export function useLiveConversation(
  { userId }: UseLiveConversationOptions = { userId: null },
): UseLiveConversation {
  const [status, setStatus] = useState<LiveStatus>("idle");
  const [durationMs, setDurationMs] = useState(0);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [latestAiCaption, setLatestAiCaption] = useState("");
  const [error, setError] = useState<LiveError | null>(null);
  const [crisisIntercept, setCrisisIntercept] =
    useState<CrisisIntercept | null>(null);

  const sessionRef = useRef<Session | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const captureCtxRef = useRef<AudioContext | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const playbackRef = useRef<PcmPlaybackQueue | null>(null);
  const startedAtRef = useRef(0);
  const tickRef = useRef<number | null>(null);
  const captionTickRef = useRef<number | null>(null);
  const userBufferRef = useRef("");
  const aiBufferRef = useRef("");
  const turnsRef = useRef<Turn[]>([]);
  const aliveRef = useRef(false);
  const pausedRef = useRef(false);

  // Per-session safety state.
  const userIdRef = useRef<number | null>(userId);
  const elevatedCautionRef = useRef(false);
  const crisisInterceptedRef = useRef(false);
  const pendingEscalationRef = useRef<string | null>(null);

  // Keep userIdRef in sync so mid-session session changes don't break writes.
  useEffect(() => {
    userIdRef.current = userId;
  }, [userId]);

  const pushTurn = useCallback((turn: Turn) => {
    turnsRef.current = [...turnsRef.current, turn];
    setTurns(turnsRef.current);
  }, []);

  const flushUserTurn = useCallback(() => {
    const text = userBufferRef.current.trim();
    userBufferRef.current = "";
    if (text.length > 0) pushTurn({ role: "user", text, ts: Date.now() });
  }, [pushTurn]);

  const flushAiTurn = useCallback(
    (clear = true) => {
      const text = aiBufferRef.current.trim();
      if (text.length > 0) pushTurn({ role: "ai", text, ts: Date.now() });
      if (clear) aiBufferRef.current = "";
    },
    [pushTurn],
  );

  const teardown = useCallback(() => {
    aliveRef.current = false;
    pausedRef.current = false;
    if (tickRef.current !== null) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
    if (captionTickRef.current !== null) {
      clearInterval(captionTickRef.current);
      captionTickRef.current = null;
    }
    if (workletNodeRef.current) {
      workletNodeRef.current.port.onmessage = null;
      workletNodeRef.current.disconnect();
      workletNodeRef.current = null;
    }
    captureCtxRef.current?.close().catch(() => {});
    captureCtxRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    playbackRef.current?.close();
    playbackRef.current = null;
    sessionRef.current?.close();
    sessionRef.current = null;
    userBufferRef.current = "";
    aiBufferRef.current = "";
  }, []);

  useEffect(() => () => teardown(), [teardown]);

  /**
   * Fetch a single tool-call target with a hard timeout. On any failure
   * we resolve to a safe empty payload so the voice turn never stalls.
   */
  const callMemoryRoute = useCallback(
    async (
      path: "/api/memory/search" | "/api/memory/log-mood",
      body: Record<string, unknown>,
    ): Promise<Record<string, unknown>> => {
      const uid = userIdRef.current;
      if (uid === null) {
        return path.endsWith("search")
          ? { entries: [] }
          : { status: "error" };
      }
      const controller = new AbortController();
      const timer = window.setTimeout(
        () => controller.abort(),
        TOOL_CALL_TIMEOUT_MS,
      );
      try {
        const res = await fetch(path, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-user-id": String(uid),
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return (await res.json()) as Record<string, unknown>;
      } catch (err) {
        console.warn(`[live] ${path} failed or timed out`, err);
        return path.endsWith("search")
          ? { entries: [] }
          : { status: "error" };
      } finally {
        window.clearTimeout(timer);
      }
    },
    [],
  );

  const handleToolCall = useCallback(
    async (msg: LiveServerMessage) => {
      const calls = msg.toolCall?.functionCalls;
      if (!calls || calls.length === 0) return;

      const responses = await Promise.all(
        calls.map(async (fc) => {
          const args = (fc.args ?? {}) as Record<string, unknown>;
          let response: Record<string, unknown>;
          if (fc.name === "get_journal_context") {
            const query =
              typeof args.query === "string" ? args.query : "";
            response = await callMemoryRoute("/api/memory/search", {
              query,
            });
          } else if (fc.name === "log_mood_score") {
            const mood_score =
              typeof args.mood_score === "number" ? args.mood_score : 0;
            const emotions = Array.isArray(args.emotions)
              ? (args.emotions as unknown[]).filter(
                  (v): v is string => typeof v === "string",
                )
              : [];
            response = await callMemoryRoute("/api/memory/log-mood", {
              mood_score,
              emotions,
            });
          } else {
            response = { error: `unknown tool ${fc.name}` };
          }

          return {
            id: fc.id,
            name: fc.name,
            response,
            // Let the model continue speaking rather than interrupting its
            // current turn — fetching past entries shouldn't stop mid-sentence.
            scheduling: FunctionResponseScheduling.WHEN_IDLE,
          };
        }),
      );

      try {
        sessionRef.current?.sendToolResponse({ functionResponses: responses });
      } catch (err) {
        console.warn("[live] sendToolResponse failed", err);
      }
    },
    [callMemoryRoute],
  );

  /**
   * Client-side crisis interceptor. Runs on every input transcription
   * chunk; on a positive hit it stops audio playback, logs an escalation
   * event to the backend, and raises session-wide elevatedCaution so the
   * next turn gets special handling. Fail-safe: pure regex, no network
   * in the hot path.
   */
  const checkCrisisAndIntercept = useCallback((chunk: string) => {
    if (crisisInterceptedRef.current) return;
    const scan = scanForCrisis(chunk);
    if (!scan.detected) return;

    crisisInterceptedRef.current = true;
    elevatedCautionRef.current = true;

    // 1. Pause Gemini audio immediately — the user needs the hotlines,
    //    not whatever the model was saying when the trigger hit.
    playbackRef.current?.clear();

    // 2. Surface the crisis card in UI state.
    setCrisisIntercept({
      keywords: scan.keywords,
      message: CRISIS_INTERCEPT_PH,
      triggeredAt: Date.now(),
    });

    // 3. Fire-and-forget escalation log. Don't await.
    const uid = userIdRef.current;
    if (uid !== null) {
      fetch("/api/escalation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": String(uid),
        },
        body: JSON.stringify({
          trigger_type: "keyword_match",
          severity: 10,
          context: {
            source: "voice_client_scanner",
            keywords: scan.keywords,
            transcript_chunk: chunk.slice(0, 500),
          },
        }),
      }).catch((err) => console.warn("[live] escalation log failed", err));
    }
  }, []);

  /**
   * Fire-and-forget POST to /api/journal after a user turn completes.
   * Runs the full LangGraph pipeline in the background so memory,
   * mood trend, and escalation all stay in sync across modes.
   */
  const postTurnToBackend = useCallback((transcript: string) => {
    const uid = userIdRef.current;
    if (uid === null || transcript.trim().length === 0) return;

    const controller = new AbortController();
    const timer = window.setTimeout(
      () => controller.abort(),
      JOURNAL_POST_TIMEOUT_MS,
    );
    fetch("/api/journal", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": String(uid),
      },
      body: JSON.stringify({ transcript, input_type: "voice" }),
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) return;
        const data = (await res.json()) as {
          needs_escalation?: boolean;
          intent?: string;
        };
        if (data.needs_escalation) {
          pendingEscalationRef.current =
            "Your recent entries suggest a downward trend. Please gently check in with the user, and remind them that professional support is available.";
        }
      })
      .catch((err) => {
        if (err?.name !== "AbortError") {
          console.warn("[live] /api/journal async write failed", err);
        }
      })
      .finally(() => window.clearTimeout(timer));
  }, []);

  const handleServerMessage = useCallback(
    (msg: LiveServerMessage) => {
      // Handle tool calls (they're not wrapped in serverContent).
      if (msg.toolCall) {
        void handleToolCall(msg);
        return;
      }

      const sc = msg.serverContent;
      if (!sc) return;

      if (sc.inputTranscription?.text) {
        const chunk = sc.inputTranscription.text;
        userBufferRef.current += chunk;
        checkCrisisAndIntercept(chunk);
      }
      for (const part of sc.modelTurn?.parts ?? []) {
        const inline = part.inlineData;
        if (inline?.data && inline.mimeType?.startsWith("audio/pcm")) {
          const bin = atob(inline.data);
          const bytes = new Uint8Array(bin.length);
          for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
          const pcm = new Int16Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 2);
          // Reset caption at the first audio chunk of a new AI turn.
          if (aiBufferRef.current.length === 0) setLatestAiCaption("");
          playbackRef.current?.enqueue(pcm);
          setStatus("speaking");
        }
      }

      // Accumulate transcript but do NOT reveal it yet — the caption
      // ticker below reveals words progressively in sync with audio.
      if (sc.outputTranscription?.text) {
        aiBufferRef.current += sc.outputTranscription.text;
      }

      if (sc.generationComplete || sc.turnComplete) {
        // Snapshot the user transcript *before* flushUserTurn clears the
        // buffer, so we can fire the async POST against the right text.
        const userText = userBufferRef.current.trim();

        flushUserTurn();
        // Save the AI turn to history but KEEP the text buffer alive so
        // the caption ticker can keep revealing words while audio plays.
        flushAiTurn(false);

        // Fire-and-forget backend run of the LangGraph pipeline. Never
        // awaited — the voice loop must stay real-time. Skipped when
        // the client-side crisis scanner already owns the turn.
        if (userText.length > 0 && !crisisInterceptedRef.current) {
          postTurnToBackend(userText);
        }

        // If a prior turn surfaced a backend-detected escalation, hand
        // the context to the model via clientContent so the next turn
        // is informed. Cleared immediately so we don't double-deliver.
        const pending = pendingEscalationRef.current;
        if (pending) {
          pendingEscalationRef.current = null;
          try {
            sessionRef.current?.sendClientContent({
              turns: [{ role: "user", parts: [{ text: `[system] ${pending}` }] }],
              turnComplete: false,
            });
          } catch (err) {
            console.warn("[live] pending escalation inject failed", err);
          }
        }

        const finishTurn = () => {
          // Briefly show the full caption once audio finishes so the last
          // words aren't clipped, then clear.
          const full = aiBufferRef.current.trim();
          if (full.length > 0) setLatestAiCaption(full);
          aiBufferRef.current = "";
          setStatus("listening");
          window.setTimeout(() => setLatestAiCaption(""), 1200);
        };
        if (playbackRef.current?.isPlaying()) {
          playbackRef.current.onIdle(finishTurn);
        } else {
          finishTurn();
        }
      }

      if (sc.interrupted) playbackRef.current?.clear();
    },
    [
      checkCrisisAndIntercept,
      flushAiTurn,
      flushUserTurn,
      handleToolCall,
      postTurnToBackend,
    ],
  );

  const start = useCallback(async () => {
    if (typeof window === "undefined") return;
    if (!navigator.mediaDevices?.getUserMedia || typeof AudioWorkletNode === "undefined") {
      setError("unsupported");
      setStatus("error");
      return;
    }
    if (userIdRef.current === null) {
      setError("auth-required");
      setStatus("error");
      return;
    }
    if (aliveRef.current) return;
    aliveRef.current = true;

    setError(null);
    setStatus("connecting");
    turnsRef.current = [];
    setTurns([]);
    setLatestAiCaption("");
    setCrisisIntercept(null);
    crisisInterceptedRef.current = false;
    elevatedCautionRef.current = false;
    pendingEscalationRef.current = null;

    let tokenRes: TokenResponse;
    try {
      const res = await fetch("/api/live-token", { method: "POST" });
      if (!res.ok) throw new Error(`token ${res.status}`);
      tokenRes = (await res.json()) as TokenResponse;
    } catch {
      setError("token-failed");
      setStatus("error");
      aliveRef.current = false;
      return;
    }

    try {
      streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      const name = (err as { name?: string })?.name;
      setError(name === "NotAllowedError" || name === "SecurityError" ? "mic-denied" : "mic-unavailable");
      setStatus("error");
      aliveRef.current = false;
      return;
    }

    try {
      playbackRef.current = createPcmPlaybackQueue(24000);

      // Ephemeral tokens require the v1alpha API surface — see the
      // SDK's console.warn in authTokens.create. The token *is* the
      // apiKey here; it's short-lived and bound to this Live session.
      const ai = new GoogleGenAI({
        apiKey: tokenRes.token,
        httpOptions: { apiVersion: "v1alpha" },
      });
      const session = await ai.live.connect({
        model: tokenRes.model,
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: {
            parts: [{ text: VOICE_UNIFIED_PROMPT }],
          },
          tools: [{ functionDeclarations: VOICE_TOOLS }],
        },
        callbacks: {
          onopen: () => console.log("[live] socket open"),
          onmessage: handleServerMessage,
          onerror: (e) => {
            console.error("[live] socket error", e);
            if (!aliveRef.current) return;
            setError("socket-failed");
            setStatus("error");
            teardown();
          },
          onclose: (e) => {
            console.warn("[live] socket closed", { code: e?.code, reason: e?.reason });
            if (!aliveRef.current) return;
            setError("socket-failed");
            setStatus("error");
            teardown();
          },
        },
      });
      sessionRef.current = session;

      const AudioCtx =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const captureCtx = new AudioCtx();
      captureCtxRef.current = captureCtx;
      await captureCtx.audioWorklet.addModule("/audio-worklets/pcm-processor.js");

      const source = captureCtx.createMediaStreamSource(streamRef.current);
      const node = new AudioWorkletNode(captureCtx, "pcm-processor");
      workletNodeRef.current = node;
      source.connect(node);
      node.port.onmessage = (e: MessageEvent<ArrayBuffer>) => {
        if (pausedRef.current) return;
        const bytes = new Uint8Array(e.data);
        let bin = "";
        for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
        sessionRef.current?.sendRealtimeInput({
          audio: { data: btoa(bin), mimeType: "audio/pcm;rate=16000" },
        });
      };

      startedAtRef.current = Date.now();
      setDurationMs(0);
      tickRef.current = window.setInterval(
        () => setDurationMs(Date.now() - startedAtRef.current),
        1000,
      );

      // Caption-sync ticker: reveals AI transcript words in pace with
      // how much of the audio has actually played. Full transcript stays
      // visible once revealed — no trailing-window cap.
      captionTickRef.current = window.setInterval(() => {
        const q = playbackRef.current;
        if (!q) return;
        const full = aiBufferRef.current.trim();
        if (full.length === 0) return;
        const words = full.split(/\s+/);
        const fraction = q.playedFraction();
        const revealed = Math.min(
          words.length,
          Math.max(1, Math.ceil(words.length * fraction) + 2),
        );
        setLatestAiCaption(words.slice(0, revealed).join(" "));
      }, 80);

      setStatus("listening");
    } catch (err) {
      console.error("[live] connect failed:", err);
      setError("socket-failed");
      setStatus("error");
      teardown();
    }
  }, [handleServerMessage, teardown]);

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
    setCrisisIntercept(null);
    crisisInterceptedRef.current = false;
    elevatedCautionRef.current = false;
    pendingEscalationRef.current = null;
  }, [teardown]);

  const pause = useCallback(() => {
    if (!aliveRef.current) return;
    pausedRef.current = true;
    sessionRef.current?.sendRealtimeInput({ audioStreamEnd: true });
    streamRef.current?.getAudioTracks().forEach((t) => (t.enabled = false));
    playbackRef.current?.clear();
    setStatus("paused");
  }, []);

  const resume = useCallback(() => {
    if (!aliveRef.current) return;
    streamRef.current?.getAudioTracks().forEach((t) => (t.enabled = true));
    pausedRef.current = false;
    setStatus("listening");
  }, []);

  return {
    status,
    durationMs,
    turns,
    latestAiCaption,
    error,
    crisisIntercept,
    start,
    stop,
    cancel,
    pause,
    resume,
  };
}
