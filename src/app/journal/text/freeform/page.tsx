"use client";

import Link from "next/link";
import { Fragment, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";

import {
  AiResponseCard,
  FollowUpCard,
  SupportCard,
} from "@/components/follow-up-card";
import { loadUser } from "@/lib/session";
import type { JournalApiResponse } from "@/lib/types";

const IDLE_MS = 3000;
const COOLDOWN_MS = 15000;

type Block = { kind: "text"; value: string } | { kind: "question"; value: string };

type SuggestPayload =
  | { question: string }
  | { skip: true }
  | { blocked: true }
  | { error: string };

function formatDate(date: Date) {
  const day = date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  const time = date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return { day, time };
}

export default function FreeformWritingPage() {
  const [title, setTitle] = useState("Untitled entry");
  const [blocks, setBlocks] = useState<Block[]>([{ kind: "text", value: "" }]);
  const [split, setSplit] = useState<{ pre: string; post: string } | null>(null);
  const [question, setQuestion] = useState<string | null>(null);
  const [suppressUntil, setSuppressUntil] = useState(0);
  const [locked, setLocked] = useState(false);
  const [meta, setMeta] = useState<{ day: string; time: string } | null>(null);
  const [userId, setUserId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [aiReply, setAiReply] = useState<JournalApiResponse | null>(null);

  const caretRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setMeta(formatDate(new Date()));
    setUserId(loadUser()?.id ?? null);
  }, []);

  useEffect(() => {
    if (locked || question || userId === null) return;
    const combined = blocks.map((b) => b.value).join("");
    if (!combined.trim()) return;

    const wait = Math.max(IDLE_MS, suppressUntil - Date.now());

    const timer = setTimeout(async () => {
      const lastIdx = blocks.length - 1;
      const last = blocks[lastIdx];
      if (last.kind !== "text") return;

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch("/api/journal/suggest", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-user-id": String(userId),
          },
          body: JSON.stringify({ blocks }),
          signal: controller.signal,
        });
        if (!res.ok) return;
        const data = (await res.json()) as SuggestPayload;

        if ("blocked" in data && data.blocked) {
          setLocked(true);
          return;
        }
        if ("question" in data && typeof data.question === "string") {
          const caret = Math.min(caretRef.current, last.value.length);
          setSplit({ pre: last.value.slice(0, caret), post: last.value.slice(caret) });
          setQuestion(data.question);
        }
      } catch {
        // aborted or network error — silent
      }
    }, wait);

    return () => {
      clearTimeout(timer);
      abortRef.current?.abort();
    };
  }, [blocks, question, suppressUntil, locked, userId]);

  const updateBlock = (idx: number, value: string) => {
    setBlocks((bs) => bs.map((b, i) => (i === idx && b.kind === "text" ? { ...b, value } : b)));
  };

  const handleUse = () => {
    if (!question || !split) return;
    setBlocks((bs) => {
      const next = [...bs];
      const lastIdx = next.length - 1;
      next[lastIdx] = { kind: "text", value: split.pre };
      next.push({ kind: "question", value: question });
      next.push({ kind: "text", value: split.post });
      return next;
    });
    setSplit(null);
    setQuestion(null);
    setSuppressUntil(Date.now() + COOLDOWN_MS);
  };

  const handleDismiss = () => {
    if (split) {
      setBlocks((bs) => {
        const next = [...bs];
        const lastIdx = next.length - 1;
        next[lastIdx] = { kind: "text", value: split.pre + split.post };
        return next;
      });
    }
    setSplit(null);
    setQuestion(null);
    setSuppressUntil(Date.now() + COOLDOWN_MS);
  };

  const hasContent = blocks.some((b) => b.value.trim().length > 0);
  const lastIdx = blocks.length - 1;

  const handleSubmit = async () => {
    if (!userId || submitting || locked) return;
    const transcript = blocks
      .map((b) => (b.kind === "question" ? `\n${b.value}\n` : b.value))
      .join("")
      .trim();
    if (!transcript) return;

    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/journal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": String(userId),
        },
        body: JSON.stringify({ transcript, input_type: "text" }),
      });
      if (!res.ok) {
        setSubmitError("Something went wrong. Please try again.");
        return;
      }
      const data = (await res.json()) as JournalApiResponse;
      setAiReply(data);
      if (data.intent === "crisis") setLocked(true);
    } catch {
      setSubmitError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-[100dvh] items-stretch justify-center bg-neutral-100 sm:items-center">
      <div className="relative flex h-[100dvh] w-full flex-col overflow-hidden bg-[#FCFAF7] sm:h-[844px] sm:w-[390px] sm:rounded-[40px]">
        <div className="hidden h-[54px] shrink-0 sm:block" aria-hidden />

        <header className="flex flex-col gap-1.5 px-6 pb-2 pt-[calc(env(safe-area-inset-top)+2.5rem)] sm:pt-10">
          {meta ? (
            <div className="flex items-center gap-2 text-[13px] font-semibold tracking-[0.4px] text-[#B8B0A7]">
              <span>{meta.day}</span>
              <span aria-hidden className="h-[3px] w-[3px] rounded-full bg-[#B8B0A7]" />
              <span>{meta.time}</span>
            </div>
          ) : null}
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onFocus={(e) => {
              if (e.target.value === "Untitled entry") e.target.select();
            }}
            readOnly={locked}
            aria-label="Entry title"
            className="w-full border-none bg-transparent p-0 text-[30px] font-bold leading-[1.1] tracking-[-1px] text-[#1A1A1A] placeholder:text-[#B8B0A7] focus:outline-none"
            placeholder="Untitled entry"
          />
        </header>

        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain px-6 pb-4 pt-2 [scrollbar-color:#D9D2C7_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#D9D2C7] [&::-webkit-scrollbar]:w-1.5">
          {blocks.map((block, i) => {
            if (block.kind === "question") {
              return (
                <p
                  key={i}
                  className="text-[16px] italic leading-[1.55] text-[#B8B0A7]"
                >
                  {block.value}
                </p>
              );
            }

            const isLast = i === lastIdx;
            if (isLast && split) {
              return (
                <Fragment key={i}>
                  <EntryArea
                    value={split.pre}
                    onChange={(v) => setSplit((s) => (s ? { ...s, pre: v } : s))}
                    onCaret={(c) => {
                      caretRef.current = c;
                    }}
                    placeholder=""
                    readOnly={locked}
                  />
                  <FollowUpCard
                    question={question ?? ""}
                    onUse={handleUse}
                    onDismiss={handleDismiss}
                  />
                  <EntryArea
                    value={split.post}
                    onChange={(v) => setSplit((s) => (s ? { ...s, post: v } : s))}
                    placeholder="Keep writing. This space is yours."
                    readOnly={locked}
                  />
                </Fragment>
              );
            }

            return (
              <EntryArea
                key={i}
                value={block.value}
                onChange={(v) => updateBlock(i, v)}
                onCaret={isLast ? (c) => (caretRef.current = c) : undefined}
                placeholder={isLast && !locked ? "Keep writing. This space is yours." : ""}
                readOnly={locked}
              />
            );
          })}

          {aiReply ? (
            <AiResponseCard
              intent={aiReply.intent}
              response={aiReply.response}
              escalation={aiReply.needs_escalation}
            />
          ) : null}

          {submitError ? (
            <p className="text-[13px] text-[#8A3A2E]">{submitError}</p>
          ) : null}

          {locked ? <SupportCard /> : null}
        </div>

        <div className="shrink-0 border-t border-[#EFE8E0] bg-[#FCFAF7] px-5 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-4">
          <div className="flex items-center gap-2.5">
            <Link
              href="/journal/text"
              aria-label="Back"
              className="flex h-[52px] w-[52px] shrink-0 cursor-pointer items-center justify-center rounded-[26px] border border-[#E9DAF2] bg-white text-[#1A1A1A] transition-opacity hover:opacity-90 active:opacity-80"
            >
              <ArrowLeft className="h-[18px] w-[18px]" strokeWidth={1.75} />
            </Link>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!hasContent || locked || submitting || !userId}
              className="flex h-[52px] flex-1 cursor-pointer items-center justify-center gap-2 rounded-[26px] bg-[#1A1A1A] text-[15px] font-semibold tracking-[0.1px] text-[#FCFAF7] shadow-[0_6px_20px_rgba(26,26,26,0.2)] transition-opacity hover:opacity-90 active:opacity-80 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "Sending…" : "Submit"}
              {submitting ? null : (
                <ArrowRight className="h-4 w-4" strokeWidth={2} />
              )}
            </button>
          </div>
        </div>

      </div>
    </main>
  );
}

type EntryAreaProps = {
  value: string;
  onChange: (value: string) => void;
  onCaret?: (caret: number) => void;
  placeholder: string;
  readOnly?: boolean;
};

const ENTRY_CLASS =
  "m-0 block w-full whitespace-pre-wrap break-words border-none bg-transparent p-0 text-[16px] leading-[1.55] text-[#1A1A1A] placeholder:italic placeholder:text-[#B8B0A7] focus:outline-none";

function EntryArea({ value, onChange, onCaret, placeholder, readOnly }: EntryAreaProps) {
  return (
    <div className="relative w-full">
      <div
        aria-hidden
        className={`${ENTRY_CLASS} invisible min-h-[1.55em]`}
      >
        {value ? `${value}\n` : "​"}
      </div>
      <textarea
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          onCaret?.(e.target.selectionStart);
        }}
        onKeyUp={(e) => onCaret?.((e.target as HTMLTextAreaElement).selectionStart)}
        onClick={(e) => onCaret?.((e.target as HTMLTextAreaElement).selectionStart)}
        placeholder={placeholder}
        readOnly={readOnly}
        className={`${ENTRY_CLASS} absolute inset-0 h-full w-full resize-none overflow-hidden`}
      />
    </div>
  );
}
