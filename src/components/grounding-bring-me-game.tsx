'use client';

import { useEffect, useRef, useState } from 'react';

type AnalyzeResponse = {
  isMatch: boolean;
  encouragement: string;
  nextPrompt: string | null;
  gameComplete: boolean;
};

const INITIAL_PROMPT = 'Show me something yellow.';
const DEBUG_LOG_PREFIX = '[bring-me-game]';

const PROMPT_FLOW = [
  'Show me something yellow.',
  'Show me something circular.',
  'Show me something soft.',
  'Show me something with straight lines.',
  'Show me something blue.',
] as const;

export function GroundingBringMeGame() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [round, setRound] = useState(1);
  const [prompt, setPrompt] = useState(INITIAL_PROMPT);
  const [usedPrompts, setUsedPrompts] = useState<string[]>([INITIAL_PROMPT]);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [feedback, setFeedback] = useState('');

  function getFallbackNextPrompt(
    currentPrompt: string,
    currentRound: number,
    seenPrompts: string[],
  ): string {
    const seen = new Set(seenPrompts.map((item) => item.toLowerCase()));

    const fromPool = PROMPT_FLOW.find(
      (item) => !seen.has(item.toLowerCase()) && item.toLowerCase() !== currentPrompt.toLowerCase(),
    );

    if (fromPool) {
      return fromPool;
    }

    const dynamicPrompts = [
      'Show me something made of wood.',
      'Show me something smooth.',
      'Show me something with a pattern.',
      'Show me something lightweight.',
      'Show me something rectangular.',
      'Show me something green.',
      'Show me something with a number on it.',
      'Show me something textured.',
    ];

    const fromDynamic = dynamicPrompts.find(
      (item) => !seen.has(item.toLowerCase()) && item.toLowerCase() !== currentPrompt.toLowerCase(),
    );

    if (fromDynamic) {
      return fromDynamic;
    }

    return `Show me item ${currentRound + 1} with a clear shape.`;
  }

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  function stopCamera() {
    if (!streamRef.current) {
      return;
    }

    for (const track of streamRef.current.getTracks()) {
      track.stop();
    }

    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraReady(false);
  }

  async function openCamera() {
    setCameraError(null);

    if (!window.isSecureContext) {
      console.error(`${DEBUG_LOG_PREFIX} insecure context - camera blocked by browser`);
      setCameraError('Camera needs HTTPS on iPhone Safari. Open the app using a secure https:// URL.');
      return;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.error(`${DEBUG_LOG_PREFIX} mediaDevices.getUserMedia unavailable`);
      setCameraError('Camera is not available in this browser context.');
      return;
    }

    try {
      console.log(`${DEBUG_LOG_PREFIX} requesting camera permission`);
      let stream: MediaStream;

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
      } catch {
        // Fallback for devices/browsers that reject stricter constraints.
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setIsCameraReady(true);
      setCameraError(null);
      console.log(`${DEBUG_LOG_PREFIX} camera ready`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown error';
      const name = error instanceof DOMException ? error.name : 'UnknownError';

      console.error(`${DEBUG_LOG_PREFIX} camera permission denied or unavailable`, {
        name,
        message,
      });

      if (name === 'NotAllowedError' || name === 'SecurityError') {
        setCameraError('Camera access was denied. In Safari, allow camera for this site and try again.');
      } else if (name === 'NotFoundError' || name === 'OverconstrainedError') {
        setCameraError('No usable camera was found on this device.');
      } else if (name === 'NotReadableError') {
        setCameraError('Camera is busy in another app. Close other apps using the camera and retry.');
      } else {
        setCameraError('Unable to open camera right now. Please try again.');
      }

      setIsCameraReady(false);
    }
  }

  async function captureAndAnalyze() {
    if (!videoRef.current || !canvasRef.current || isAnalyzing) {
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const width = video.videoWidth || 720;
    const height = video.videoHeight || 540;

    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext('2d');
    if (!context) {
      setFeedback('Could not read camera frame. Please try again.');
      return;
    }

    context.drawImage(video, 0, 0, width, height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    const imageBase64 = dataUrl.split(',')[1];

    if (!imageBase64) {
      setFeedback('Capture failed. Please try again.');
      return;
    }

    setIsAnalyzing(true);
    setFeedback('Checking...');
    console.log(`${DEBUG_LOG_PREFIX} capture submitted`, {
      round,
      prompt,
      imageSize: imageBase64.length,
    });

    try {
      const response = await fetch('/api/grounding-game', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPrompt: prompt,
          usedPrompts,
          imageBase64,
          mimeType: 'image/jpeg',
          round,
        }),
      });

      const payload = (await response.json()) as AnalyzeResponse | { error?: string };
      if (!response.ok || 'error' in payload) {
        console.error(`${DEBUG_LOG_PREFIX} analysis error`, {
          status: response.status,
          payload,
        });
        setFeedback(payload.error ?? 'Analysis failed. Please try again.');
        return;
      }

      console.log(`${DEBUG_LOG_PREFIX} analysis result`, payload);

      setFeedback(payload.encouragement);

      if (payload.isMatch) {
        const nextPrompt = payload.nextPrompt || getFallbackNextPrompt(prompt, round, usedPrompts);
        console.log(`${DEBUG_LOG_PREFIX} advancing to next item`, {
          fromRound: round,
          toRound: round + 1,
          nextPrompt,
        });
        setPrompt(nextPrompt);
        setRound((value) => value + 1);
        setUsedPrompts((value) => {
          const next = value.map((item) => item.toLowerCase());
          if (!next.includes(nextPrompt.toLowerCase())) {
            return [...value, nextPrompt];
          }
          return value;
        });
      } else {
        console.log(`${DEBUG_LOG_PREFIX} item not matched; retrying same prompt`, {
          round,
          prompt,
        });
      }
    } catch (error) {
      console.error(`${DEBUG_LOG_PREFIX} network failure`, {
        error: error instanceof Error ? error.message : 'unknown error',
      });
      setFeedback('Could not reach grounding service. Try again in a moment.');
    } finally {
      setIsAnalyzing(false);
    }
  }

  return (
    <section className="flex w-full flex-col items-center gap-4 pt-2 text-center">
      <div className="w-full px-1">
        <p className="text-[22px] font-semibold leading-tight text-[#2A2A2A]">
          {prompt}
        </p>
        <p className="pt-2 text-[13px] font-medium text-[#6A6A6A]">
          Item {round}
        </p>
      </div>

      <div className="w-full overflow-hidden rounded-3xl border border-[#D5C9E3] bg-[#1A1A1A]">
        <video
          ref={videoRef}
          className="aspect-4/3 w-full object-cover"
          playsInline
          muted
          autoPlay
        />
      </div>

      <canvas ref={canvasRef} className="hidden" aria-hidden />

      <div className="flex w-full flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={isCameraReady ? stopCamera : openCamera}
          className={`rounded-full px-4 py-2 text-[13px] font-semibold disabled:opacity-50 ${
            isCameraReady
              ? 'border border-[#C7B3DA] bg-white text-[#5B3D78]'
              : 'bg-[#5B3D78] text-white'
          }`}
        >
          {isCameraReady ? 'Stop Camera' : 'Start Camera'}
        </button>

        <button
          type="button"
          onClick={captureAndAnalyze}
          disabled={!isCameraReady || isAnalyzing}
          className="rounded-full bg-[#1A1A1A] px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-50"
        >
          {isAnalyzing ? 'Checking...' : 'Check Item'}
        </button>
      </div>

      {cameraError && !isCameraReady ? (
        <p className="text-[13px] text-[#B04545]">{cameraError}</p>
      ) : null}

      {feedback ? (
        <p className="w-full wrap-break-word whitespace-pre-wrap rounded-2xl bg-[#F2EBF8] px-4 py-3 text-[14px] leading-relaxed text-[#3E3252]">
          {feedback}
        </p>
      ) : null}
    </section>
  );
}