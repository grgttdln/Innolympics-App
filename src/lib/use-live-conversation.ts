"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { GoogleGenAI, Modality, type LiveServerMessage, type Session } from "@google/genai";
import { createPcmPlaybackQueue, type PcmPlaybackQueue } from "./pcm-playback-queue";
import type { Turn } from "./turns-store";

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
  pause: () => void;
  resume: () => void;
};

type TokenResponse = { token: string; model: string };

const CAPTION_MAX_WORDS = 14;

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
  const captionTickRef = useRef<number | null>(null);
  const userBufferRef = useRef("");
  const aiBufferRef = useRef("");
  const turnsRef = useRef<Turn[]>([]);
  const aliveRef = useRef(false);
  const pausedRef = useRef(false);

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

  const handleServerMessage = useCallback(
    (msg: LiveServerMessage) => {
      const sc = msg.serverContent;
      if (!sc) return;

      if (sc.inputTranscription?.text) {
        userBufferRef.current += sc.inputTranscription.text;
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
        flushUserTurn();
        flushAiTurn();
        const clearCaption = () => {
          setLatestAiCaption("");
          setStatus("listening");
        };
        if (playbackRef.current?.isPlaying()) {
          playbackRef.current.onIdle(clearCaption);
        } else {
          clearCaption();
        }
      }

      if (sc.interrupted) playbackRef.current?.clear();
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
    if (aliveRef.current) return;
    aliveRef.current = true;

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

      const ai = new GoogleGenAI({ apiKey: tokenRes.token });
      const session = await ai.live.connect({
        model: tokenRes.model,
        config: { responseModalities: [Modality.AUDIO] },
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
      // how much of the audio has actually played.
      captionTickRef.current = window.setInterval(() => {
        const q = playbackRef.current;
        if (!q) return;
        const full = aiBufferRef.current.trim();
        if (full.length === 0) return;
        const words = full.split(/\s+/);
        const fraction = q.playedFraction();
        const revealed = Math.max(1, Math.ceil(words.length * fraction));
        const visible = words.slice(0, revealed);
        const tail =
          visible.length > CAPTION_MAX_WORDS
            ? visible.slice(-CAPTION_MAX_WORDS)
            : visible;
        setLatestAiCaption(tail.join(" "));
      }, 90);

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

  return { status, durationMs, turns, latestAiCaption, error, start, stop, cancel, pause, resume };
}
