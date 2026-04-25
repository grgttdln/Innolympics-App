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
