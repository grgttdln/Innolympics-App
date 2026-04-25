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
