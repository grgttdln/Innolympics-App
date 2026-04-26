"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  FileQuestion,
  Mic,
  Sparkles,
  Trash2,
  User,
} from "lucide-react";

import { BackButton } from "@/components/back-button";
import { InsightsDialog } from "@/components/insights-dialog";
import { deleteTurns, getTurns, type TurnsRecord } from "@/lib/turns-store";
import { loadUser } from "@/lib/session";
import type { JournalApiResponse } from "@/lib/types";

type LoadState =
  | { kind: "loading" }
  | { kind: "not-found" }
  | { kind: "ready"; record: TurnsRecord };

type Run = { role: "user" | "ai"; text: string };

function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = (total % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
  });
}

/**
 * Turns the session's alternating AI/user turns into a single transcript
 * that reads coherently when the LangGraph classifier sees it. AI turns
 * are bracketed so the classifier knows which lines were prompts vs the
 * user's actual words.
 */
function stitchTranscript(turns: TurnsRecord["turns"]): string {
  return turns
    .map((t) =>
      t.role === "ai" ? `[Tala] ${t.text.trim()}` : t.text.trim(),
    )
    .filter((line) => line.length > 0)
    .join("\n\n");
}

function coalesceTurns(turns: TurnsRecord["turns"]): Run[] {
  const runs: Run[] = [];
  for (const t of turns) {
    const text = t.text.trim();
    if (!text) continue;
    const last = runs[runs.length - 1];
    if (last && last.role === t.role) {
      last.text = `${last.text} ${text}`;
    } else {
      runs.push({ role: t.role, text });
    }
  }
  return runs;
}

function VoiceReviewPageInner() {
  const router = useRouter();
  const params = useSearchParams();
  const id = params.get("id");
  const [load, setLoad] = useState<LoadState>({ kind: "loading" });
  const [userId, setUserId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [aiReply, setAiReply] = useState<JournalApiResponse | null>(null);
  const [insightsOpen, setInsightsOpen] = useState(false);
  const frameRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate from localStorage on mount
    setUserId(loadUser()?.id ?? null);
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!id) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sync load state from route param
      setLoad({ kind: "not-found" });
      return;
    }
    (async () => {
      const record = await getTurns(id);
      if (cancelled) return;
      setLoad(record ? { kind: "ready", record } : { kind: "not-found" });
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function handleDiscard() {
    if (!id) return;
    await deleteTurns(id);
    router.push("/dashboard");
  }

  async function handleSave() {
    if (load.kind !== "ready" || !userId || saving) return;
    const transcript = stitchTranscript(load.record.turns);
    if (!transcript) {
      if (id) await deleteTurns(id);
      router.replace("/dashboard");
      return;
    }

    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch("/api/journal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": String(userId),
        },
        body: JSON.stringify({ transcript, input_type: "voice" }),
      });
      if (!res.ok) {
        setSaveError("Couldn't save the conversation. Please try again.");
        return;
      }
      const data = (await res.json()) as JournalApiResponse;
      setAiReply(data);
      setInsightsOpen(true);
      if (id) await deleteTurns(id).catch(() => { });
    } catch {
      setSaveError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const canSave = load.kind === "ready" && !saving && !!userId;

  return (
    <main className="flex min-h-[100dvh] items-stretch justify-center bg-neutral-100 sm:items-center">
      <div
        ref={frameRef}
        className="relative flex h-[100dvh] w-full flex-col overflow-hidden bg-[#FCFAF7] sm:h-[844px] sm:w-[390px] sm:rounded-[40px]"
      >
        <div className="hidden h-[54px] shrink-0 sm:block" aria-hidden />

        <header className="flex items-center justify-between px-6 pb-2 pt-[calc(env(safe-area-inset-top)+1.25rem)] sm:pt-6">
          <BackButton href="/dashboard" />
          <div className="flex items-center gap-1.5">
            <span
              aria-hidden
              className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-[#A881C2]"
            >
              <Mic className="h-3 w-3 text-white" strokeWidth={2} />
            </span>
            <span className="text-[11px] font-bold uppercase tracking-[1px] text-[#5B3D78]">
              Voice journal
            </span>
          </div>
          <div aria-hidden className="h-11 w-11" />
        </header>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-6 pb-6 pt-4 [scrollbar-color:#D9D2C7_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#D9D2C7] [&::-webkit-scrollbar]:w-1.5">
          {load.kind === "loading" && <LoadingState />}

          {load.kind === "not-found" && <NotFoundState />}

          {load.kind === "ready" && (
            <>
              <div className="flex items-center gap-2 text-[13px] font-semibold tracking-[0.4px] text-[#8A8079]">
                <span>{formatDate(load.record.createdAt)}</span>
                <span
                  aria-hidden
                  className="h-[3px] w-[3px] rounded-full bg-[#B8B0A7]"
                />
                <span>{formatDuration(load.record.durationMs)}</span>
              </div>
              <h1
                className="mt-1 text-[28px] font-bold leading-[1.1] tracking-[-0.5px] text-[#1A1A1A]"
                style={{ fontFamily: "var(--font-geist-sans)" }}
              >
                Your reflection
              </h1>
              <p className="mt-1.5 text-[14px] leading-[1.55] text-[#6B6259]">
                Review what you said, then save it as an entry when ready.
              </p>

              <TranscriptCard turns={load.record.turns} />

              {saveError ? (
                <p className="mt-3 rounded-xl border border-[#F3D6D0] bg-[#FBEDE9] px-3.5 py-2.5 text-[13px] leading-[1.45] text-[#8A3A2E]">
                  {saveError}
                </p>
              ) : null}
            </>
          )}
        </div>

        {load.kind === "ready" ? (
          <div className="shrink-0 border-t border-[#EFE8E0] bg-[#FCFAF7] px-5 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-4">
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => void handleDiscard()}
                disabled={saving}
                aria-label="Discard"
                className="flex h-[52px] w-[52px] shrink-0 cursor-pointer items-center justify-center rounded-[26px] border border-[#E9DAF2] bg-white text-[#6B6259] transition-opacity hover:opacity-90 active:opacity-80 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A881C2]"
              >
                <Trash2 className="h-[18px] w-[18px]" strokeWidth={1.75} />
              </button>
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={!canSave}
                className="flex h-[52px] flex-1 cursor-pointer items-center justify-center gap-2 rounded-[26px] bg-[#1A1A1A] text-[15px] font-semibold tracking-[0.1px] text-[#FCFAF7] shadow-[0_6px_20px_rgba(26,26,26,0.2)] transition-opacity hover:opacity-90 active:opacity-80 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A881C2]"
              >
                {saving ? "Saving…" : "Save entry"}
                {saving ? null : (
                  <ArrowRight className="h-4 w-4" strokeWidth={2} />
                )}
              </button>
            </div>
          </div>
        ) : null}

        <InsightsDialog
          open={insightsOpen}
          onOpenChange={(next) => {
            setInsightsOpen(next);
            if (!next && aiReply) {
              router.replace("/dashboard");
            }
          }}
          reply={aiReply}
          onConnectProfessional={() => {
            if (!userId || !aiReply?.entry_id) return;
            fetch("/api/professional/share", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "x-user-id": String(userId),
              },
              body: JSON.stringify({ entry_id: aiReply.entry_id }),
            }).catch(() => { });
          }}
          container={frameRef}
        />
      </div>
    </main>
  );
}

function TranscriptCard({ turns }: { turns: TurnsRecord["turns"] }) {
  const runs = coalesceTurns(turns);

  return (
    <section
      aria-label="Transcript"
      className="mt-5 flex flex-col gap-4 rounded-[24px] border border-[#EFE8E0] bg-white p-5 shadow-[0_4px_16px_-8px_rgba(26,26,26,0.06)]"
    >
      <div className="flex items-center gap-1.5">
        <span
          aria-hidden
          className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-[#1A1A1A]"
        >
          <Mic className="h-3 w-3 text-white" strokeWidth={2} />
        </span>
        <span className="text-[11px] font-bold uppercase tracking-[1px] text-[#4B423B]">
          Transcript
        </span>
        {runs.length > 0 ? (
          <>
            <span
              aria-hidden
              className="h-[3px] w-[3px] rounded-full bg-[#B8B0A7]"
            />
            <span className="text-[11px] font-semibold uppercase tracking-[0.6px] text-[#8A8079]">
              {runs.length} turn{runs.length === 1 ? "" : "s"}
            </span>
          </>
        ) : null}
      </div>

      {runs.length === 0 ? (
        <p className="text-[14px] leading-[1.55] text-[#8A8079]">
          No conversation was recorded.
        </p>
      ) : (
        <ol className="flex flex-col gap-5">
          {runs.map((run, i) => (
            <li key={i} className="flex flex-col gap-2">
              <RoleChip role={run.role} />
              <p
                className={
                  run.role === "ai"
                    ? "whitespace-pre-wrap text-[14px] italic leading-[1.6] text-[#8A8079]"
                    : "whitespace-pre-wrap text-[16px] leading-[1.6] text-[#1A1A1A]"
                }
              >
                {run.text}
              </p>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function RoleChip({ role }: { role: "user" | "ai" }) {
  if (role === "ai") {
    return (
      <div className="flex items-center gap-1.5">
        <span
          aria-hidden
          className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-[#A881C2]"
        >
          <Sparkles className="h-3 w-3 text-white" strokeWidth={2} />
        </span>
        <span className="text-[11px] font-bold uppercase tracking-[1px] text-[#5B3D78]">
          Tala
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <span
        aria-hidden
        className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-[#1A1A1A]"
      >
        <User className="h-3 w-3 text-white" strokeWidth={2} />
      </span>
      <span className="text-[11px] font-bold uppercase tracking-[1px] text-[#4B423B]">
        You
      </span>
    </div>
  );
}

function LoadingState() {
  return (
    <div aria-busy="true" aria-label="Loading transcript" className="flex flex-col gap-3">
      <div className="h-3.5 w-28 animate-pulse rounded-full bg-[#EFE8E0] motion-reduce:animate-none" />
      <div className="h-7 w-48 animate-pulse rounded-lg bg-[#EFE8E0] motion-reduce:animate-none" />
      <div className="h-3 w-64 animate-pulse rounded-full bg-[#EFE8E0] motion-reduce:animate-none" />
      <div className="mt-5 flex flex-col gap-4 rounded-[24px] border border-[#EFE8E0] bg-white p-5">
        <div className="h-3 w-24 animate-pulse rounded-full bg-[#EFE8E0] motion-reduce:animate-none" />
        <div className="flex flex-col gap-2">
          <div className="h-3 w-20 animate-pulse rounded-full bg-[#F4EEF9] motion-reduce:animate-none" />
          <div className="h-3 w-full animate-pulse rounded-full bg-[#EFE8E0] motion-reduce:animate-none" />
          <div className="h-3 w-5/6 animate-pulse rounded-full bg-[#EFE8E0] motion-reduce:animate-none" />
        </div>
        <div className="flex flex-col gap-2">
          <div className="h-3 w-16 animate-pulse rounded-full bg-[#EFE8E0] motion-reduce:animate-none" />
          <div className="h-3.5 w-full animate-pulse rounded-full bg-[#EFE8E0] motion-reduce:animate-none" />
          <div className="h-3.5 w-11/12 animate-pulse rounded-full bg-[#EFE8E0] motion-reduce:animate-none" />
          <div className="h-3.5 w-2/3 animate-pulse rounded-full bg-[#EFE8E0] motion-reduce:animate-none" />
        </div>
      </div>
    </div>
  );
}

function NotFoundState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
      <span
        aria-hidden
        className="flex h-14 w-14 items-center justify-center rounded-full border border-[#E9DAF2] bg-white text-[#5B3D78]"
      >
        <FileQuestion className="h-6 w-6" strokeWidth={1.75} />
      </span>
      <h1
        className="text-[22px] font-bold tracking-[-0.3px] text-[#1A1A1A]"
        style={{ fontFamily: "var(--font-geist-sans)" }}
      >
        Conversation not found
      </h1>
      <p className="max-w-[260px] text-[14px] leading-[1.55] text-[#6B6259]">
        We couldn&apos;t find that conversation. It may have been deleted.
      </p>
    </div>
  );
}

export default function VoiceReviewPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-[100dvh] items-stretch justify-center bg-neutral-100 sm:items-center">
          <div className="h-[100dvh] w-full bg-[#FCFAF7] sm:h-[844px] sm:w-[390px] sm:rounded-[40px]" />
        </main>
      }
    >
      <VoiceReviewPageInner />
    </Suspense>
  );
}
