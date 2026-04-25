"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BackButton } from "@/components/back-button";
import { deleteTurns, getTurns, type TurnsRecord } from "@/lib/turns-store";

type LoadState =
  | { kind: "loading" }
  | { kind: "not-found" }
  | { kind: "ready"; record: TurnsRecord };

function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = (total % 60).toString().padStart(2, "0");
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

  useEffect(() => {
    let cancelled = false;
    if (!id) {
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

  function handleSave() {
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
              <h1
                className="text-[26px] font-bold text-[#1A1A1A]"
                style={{ fontFamily: "var(--font-geist-sans)" }}
              >
                Conversation not found
              </h1>
              <p className="text-[15px] text-[#666666]">
                We couldn&apos;t find that conversation. It may have been deleted.
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

              <div className="mt-4 flex flex-col gap-5 rounded-3xl bg-[#F5F2ED] p-5">
                {renderGroupedTurns(load.record.turns)}
              </div>

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

function renderGroupedTurns(turns: TurnsRecord["turns"]) {
  if (turns.length === 0) {
    return <p className="text-[14px] text-[#8A8A8A]">(No conversation recorded.)</p>;
  }

  // Merge consecutive same-role turns into runs, then pair AI run with following user run.
  const runs: { role: "user" | "ai"; text: string }[] = [];
  for (const t of turns) {
    const last = runs[runs.length - 1];
    if (last && last.role === t.role) last.text += ` ${t.text}`;
    else runs.push({ role: t.role, text: t.text });
  }

  const groups: { heading: string | null; body: string }[] = [];
  for (let i = 0; i < runs.length; i++) {
    const r = runs[i];
    if (r.role === "user") {
      groups.push({ heading: null, body: r.text });
    } else if (i + 1 < runs.length && runs[i + 1].role === "user") {
      groups.push({ heading: r.text, body: runs[i + 1].text });
      i++;
    } else {
      groups.push({ heading: null, body: r.text });
    }
  }

  return groups.map((g, i) => (
    <div key={i} className="flex flex-col gap-2">
      {g.heading && (
        <p className="text-[14px] italic leading-snug text-[#8A8A8A]">{g.heading}</p>
      )}
      <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-[#1A1A1A]">
        {g.body}
      </p>
    </div>
  ));
}

export default function VoiceReviewPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-neutral-100">
          <div className="h-[844px] w-[390px] bg-white" />
        </main>
      }
    >
      <VoiceReviewPageInner />
    </Suspense>
  );
}
