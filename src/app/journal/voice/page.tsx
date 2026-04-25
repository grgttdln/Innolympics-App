"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Mic } from "lucide-react";
import { useLiveConversation, type LiveError } from "@/lib/use-live-conversation";
import { putTurns } from "@/lib/turns-store";
import { RecordingHeader } from "@/components/voice-recorder/recording-header";
import { DiscardConfirmSheet } from "@/components/voice-recorder/discard-confirm-sheet";
import { LiveOrb } from "@/components/voice-recorder/live-orb";
import { RecordingControls } from "@/components/voice-recorder/recording-controls";

function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = (total % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

const ERROR_MESSAGES: Record<LiveError, string> = {
  "mic-denied": "We need mic access to start the conversation.",
  "mic-unavailable": "No microphone found on this device.",
  unsupported: "Your browser doesn't support live audio.",
  "token-failed": "Couldn't start the live session. Please try again.",
  "socket-failed": "The live session disconnected. Please try again.",
};

export default function VoiceJournalPage() {
  const router = useRouter();
  const live = useLiveConversation();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const frameRef = useRef<HTMLDivElement>(null);

  const uiStatus: "idle" | "recording" | "paused" =
    live.status === "idle"
      ? "idle"
      : live.status === "paused"
      ? "paused"
      : "recording";
  const active = uiStatus !== "idle";

  useEffect(() => {
    if (!active) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [active]);

  async function handleStop() {
    const turns = await live.stop();
    if (turns.length === 0) {
      router.push("/dashboard");
      return;
    }
    const id = crypto.randomUUID();
    try {
      await putTurns({ id, turns, durationMs: live.durationMs, createdAt: Date.now() });
      router.push(`/journal/voice/review?id=${id}`);
    } catch {
      alert("Couldn't save the conversation. Please try again.");
    }
  }

  function handleRequestExit() {
    if (active) setConfirmOpen(true);
    else router.push("/dashboard");
  }

  function handleConfirmDiscard() {
    live.cancel();
    router.push("/dashboard");
  }

  const eyebrow =
    live.status === "idle"
      ? "VOICE JOURNAL"
      : live.status === "connecting"
      ? "PREPARING"
      : live.status === "listening"
      ? "LISTENING"
      : live.status === "speaking"
      ? "SPEAKING"
      : live.status === "paused"
      ? "PAUSED"
      : "";

  const idleCaption = "Tap record when you're ready.\nI'll listen and ask gentle questions.";

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F4F2ED]">
      <div
        ref={frameRef}
        className="relative flex h-[844px] w-[390px] flex-col overflow-hidden bg-[#FBFAF6]"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 transition-opacity duration-[1200ms] ease-[cubic-bezier(0.32,0.72,0,1)]"
          style={{
            background:
              live.status === "speaking"
                ? "radial-gradient(70% 55% at 50% 38%, rgba(245,166,35,0.14) 0%, rgba(245,166,35,0) 70%)"
                : live.status === "listening"
                ? "radial-gradient(70% 55% at 50% 38%, rgba(139,92,246,0.14) 0%, rgba(139,92,246,0) 70%)"
                : "radial-gradient(70% 55% at 50% 38%, rgba(139,92,246,0.06) 0%, rgba(139,92,246,0) 70%)",
          }}
        />

        <div className="h-[62px] shrink-0" aria-hidden />

        {live.status === "error" ? (
          <ErrorFallback
            error={live.error}
            onRetry={() => void live.start()}
            onBack={() => router.push("/dashboard")}
          />
        ) : (
          <div className="relative flex flex-1 flex-col px-6">
            <RecordingHeader status={uiStatus} onClose={handleRequestExit} />

            <div
              aria-hidden
              className="mt-10 text-center text-[10px] font-medium uppercase tracking-[0.24em] text-[#8A8A8A]"
            >
              {eyebrow}
            </div>

            <div className="mt-6 flex justify-center">
              <LiveOrb status={live.status} />
            </div>

            <LiveCaption
              text={live.latestAiCaption}
              fallback={live.status === "idle" ? idleCaption : ""}
            />

            <div className="flex-1" />

            <div className="mb-5 flex items-center justify-center">
              <div className="inline-flex items-center gap-3 rounded-full bg-white/60 px-4 py-[7px] ring-1 ring-black/[0.04] shadow-[0_1px_0_rgba(255,255,255,0.8)_inset,0_2px_10px_rgba(17,12,46,0.04)] backdrop-blur-[2px]">
                <span className="font-mono text-[12px] tabular-nums tracking-[0.02em] text-[#1A1A1A]">
                  {formatDuration(live.durationMs)}
                </span>
                <span className="h-3 w-px bg-black/10" aria-hidden />
                <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-[#8A8A8A]">
                  {live.turns.length} turn{live.turns.length === 1 ? "" : "s"}
                </span>
              </div>
            </div>

            <div className="mb-10">
              <RecordingControls
                status={uiStatus}
                onStart={() => void live.start()}
                onPauseToggle={live.status === "paused" ? live.resume : live.pause}
                onStop={() => void handleStop()}
                onCancel={handleRequestExit}
              />
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

function LiveCaption({ text, fallback }: { text: string; fallback: string }) {
  const display = text || fallback;
  return (
    <div className="mx-auto mt-6 flex min-h-[56px] max-w-[300px] items-center justify-center">
      <p
        aria-live="polite"
        className={`whitespace-pre-line text-center text-[16px] font-medium leading-[22px] tracking-[-0.2px] ${
          text ? "text-[#1A1A1A]" : "text-[#8A8A8A]"
        }`}
      >
        {display}
      </p>
    </div>
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
  const canRetry = error === "mic-denied" || error === "token-failed" || error === "socket-failed";
  const message = error ? ERROR_MESSAGES[error] : "Something went wrong. Please try again.";

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
