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

  const [started, setStarted] = useState(false);
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

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

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

      const payload = (await response.json()) as Partial<AnalyzeResponse> & { error?: string };
      if (!response.ok || payload.error) {
        console.error(`${DEBUG_LOG_PREFIX} analysis error`, {
          status: response.status,
          payload,
        });
        setFeedback(payload.error ?? 'Analysis failed. Please try again.');
        return;
      }

      console.log(`${DEBUG_LOG_PREFIX} analysis result`, payload);

      setFeedback(payload.encouragement ?? '');

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

  const totalPrompts = 5;

  if (!started) {
    return (
      <section
        aria-label="Visual grounding introduction"
        className="flex w-full flex-1 flex-col items-center justify-center gap-6 pt-1"
      >
        <div className="flex flex-col items-center gap-2 text-center">
          <span className="text-[10px] font-semibold uppercase tracking-[2.4px] text-[#A881C2]">
            Visual grounding
          </span>
          <span className="text-[22px] font-semibold leading-none tracking-tight text-[#2A2A2A]">
            Ready?
          </span>
        </div>

        <div className="flex flex-col items-center gap-2 text-center">
          <p className="max-w-[280px] text-[16px] font-semibold leading-snug text-[#2A2A2A]">
            Refocus through your camera.
          </p>
          <p className="max-w-[260px] text-[13px] leading-relaxed text-[#6E6878]">
            We&apos;ll ask for five everyday things. Point, hold steady, and tap Check.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setStarted(true);
            void openCamera();
          }}
          className="mt-2 flex items-center justify-center gap-2 rounded-[18px] bg-[#5B3D78] px-8 py-[14px] text-[15px] font-semibold text-white shadow-[0_14px_32px_-14px_rgba(91,61,120,0.6)] transition-all duration-200 active:translate-y-[1px] active:scale-[0.985]"
        >
          <svg width={14} height={14} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M8 5.14v13.72a1 1 0 0 0 1.54.84l10.5-6.86a1 1 0 0 0 0-1.68L9.54 4.3A1 1 0 0 0 8 5.14Z" />
          </svg>
          Begin game
        </button>
      </section>
    );
  }

  return (
    <section className="flex w-full flex-col gap-5 pt-1">
      <div className="flex flex-col items-start gap-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-[2.4px] text-[#A881C2]">
          Item {round} of {totalPrompts}
        </span>
        <p className="text-[20px] font-semibold leading-tight tracking-tight text-[#2A2A2A]">
          {prompt}
        </p>
        <p className="text-[12px] leading-relaxed text-[#8A8274]">
          Point. Hold steady. Tap Check.
        </p>
      </div>

      <div className="relative w-full">
        <div className="rounded-[28px] bg-gradient-to-br from-white to-[#F5EEE4] p-2 shadow-[0_1px_2px_rgba(91,61,120,0.06),0_18px_40px_-20px_rgba(91,61,120,0.25)]">
          <div className="overflow-hidden rounded-[22px] border border-[#F1E4D0] bg-[#FAF4EA]">
            <video
              ref={videoRef}
              className="aspect-4/3 w-full object-cover"
              playsInline
              muted
              autoPlay
            />
          </div>
        </div>
      </div>

      <canvas ref={canvasRef} className="hidden" aria-hidden />

      <button
        type="button"
        onClick={captureAndAnalyze}
        disabled={!isCameraReady || isAnalyzing}
        className="w-full rounded-[18px] bg-[#5B3D78] py-4 text-[15px] font-semibold text-white shadow-[0_10px_28px_-12px_rgba(91,61,120,0.6)] transition-all duration-200 active:translate-y-[1px] active:scale-[0.985] disabled:opacity-50 disabled:shadow-none"
      >
        {isAnalyzing ? 'Checking…' : 'Check item'}
      </button>

      {cameraError && !isCameraReady ? (
        <p className="w-full rounded-2xl border border-[#F1D3D3] bg-white px-4 py-3 text-[13px] leading-relaxed text-[#B04545]">
          {cameraError}
        </p>
      ) : null}

      {feedback ? (
        <p className="w-full wrap-break-word whitespace-pre-wrap rounded-2xl border border-[#E9DAF2] bg-white px-4 py-3 text-[14px] leading-relaxed text-[#3E3252]">
          {feedback}
        </p>
      ) : null}
    </section>
  );
}