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
