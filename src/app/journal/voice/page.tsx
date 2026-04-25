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

  const headerStatus: "idle" | "recording" | "paused" = active ? "recording" : "idle";

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
            <RecordingHeader status={headerStatus} onClose={handleRequestExit} />

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
