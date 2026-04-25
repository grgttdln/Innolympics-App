"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BackButton } from "@/components/back-button";
import { deleteRecording, getRecording, updateTranscript, type AudioRecord } from "@/lib/audio-store";
import { transcribe } from "@/lib/transcribe";

type LoadState =
  | { kind: "loading" }
  | { kind: "not-found" }
  | { kind: "ready"; record: AudioRecord; audioUrl: string };

type TranscriptState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ready"; text: string }
  | { kind: "error"; message: string };

function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSeconds / 60);
  const s = (totalSeconds % 60).toString().padStart(2, "0");
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
  const [transcript, setTranscript] = useState<TranscriptState>({ kind: "idle" });
  const urlRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!id) {
      setLoad({ kind: "not-found" });
      return;
    }
    (async () => {
      const record = await getRecording(id);
      if (cancelled) return;
      if (!record) {
        setLoad({ kind: "not-found" });
        return;
      }
      const audioUrl = URL.createObjectURL(record.blob);
      urlRef.current = audioUrl;
      setLoad({ kind: "ready", record, audioUrl });

      if (record.transcript) {
        setTranscript({ kind: "ready", text: record.transcript });
      } else {
        setTranscript({ kind: "loading" });
        try {
          const text = await transcribe(record.blob);
          if (cancelled) return;
          setTranscript({ kind: "ready", text });
          await updateTranscript(id, text);
        } catch (err) {
          if (cancelled) return;
          const message = err instanceof Error ? err.message : "Couldn't transcribe.";
          setTranscript({ kind: "error", message });
        }
      }
    })();
    return () => {
      cancelled = true;
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current);
        urlRef.current = null;
      }
    };
  }, [id]);

  async function handleRetry() {
    if (load.kind !== "ready" || !id) return;
    setTranscript({ kind: "loading" });
    try {
      const text = await transcribe(load.record.blob);
      setTranscript({ kind: "ready", text });
      await updateTranscript(id, text);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Couldn't transcribe.";
      setTranscript({ kind: "error", message });
    }
  }

  async function handleDiscard() {
    if (!id) return;
    await deleteRecording(id);
    router.push("/dashboard");
  }

  function handleSave() {
    // Placeholder — saving to database is out of scope for this task.
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
              <h1 className="text-[26px] font-bold text-[#1A1A1A]" style={{ fontFamily: "var(--font-geist-sans)" }}>
                Recording not found
              </h1>
              <p className="text-[15px] text-[#666666]">
                We couldn&apos;t find that recording. It may have been deleted.
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

              <div className="mt-4 rounded-3xl bg-[#F5F2ED] p-5">
                {transcript.kind === "loading" && (
                  <div className="flex flex-col gap-3">
                    <div className="h-3 w-3/4 animate-pulse rounded-full bg-[#E5DFD4]" aria-hidden />
                    <div className="h-3 w-5/6 animate-pulse rounded-full bg-[#E5DFD4]" aria-hidden />
                    <div className="h-3 w-2/3 animate-pulse rounded-full bg-[#E5DFD4]" aria-hidden />
                    <p className="mt-2 text-[14px] text-[#8A8A8A]">Transcribing…</p>
                  </div>
                )}
                {transcript.kind === "ready" && (
                  <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-[#1A1A1A]">
                    {transcript.text || "(No speech detected.)"}
                  </p>
                )}
                {transcript.kind === "error" && (
                  <div className="flex flex-col gap-2">
                    <p className="text-[14px] text-[#8A8A8A]">Couldn&apos;t transcribe.</p>
                    <button
                      type="button"
                      onClick={() => void handleRetry()}
                      className="self-start text-[14px] font-semibold text-[#8B5CF6]"
                    >
                      Retry
                    </button>
                  </div>
                )}
              </div>

              <audio
                controls
                src={load.audioUrl}
                className="mt-2 w-full"
                aria-label="Recording playback"
              />

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

export default function VoiceReviewPage() {
  return (
    <Suspense fallback={<main className="flex min-h-screen items-center justify-center bg-neutral-100"><div className="h-[844px] w-[390px] bg-white" /></main>}>
      <VoiceReviewPageInner />
    </Suspense>
  );
}
