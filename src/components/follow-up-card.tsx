"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  HeartHandshake,
  Loader2,
  Phone,
  Plus,
  Sparkles,
} from "lucide-react";

import type { Intent } from "@/lib/types";

type FollowUpCardProps = {
  question: string;
  onUse: () => void;
  onDismiss: () => void;
};

export function FollowUpCard({ question, onUse, onDismiss }: FollowUpCardProps) {
  return (
    <div className="flex flex-col gap-2.5 rounded-[20px] border border-[#E9DAF2] bg-[#F4EEF9] p-3.5">
      <div className="flex items-center gap-1.5">
        <span
          aria-hidden
          className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-[#A881C2]"
        >
          <Sparkles className="h-3 w-3 text-white" strokeWidth={2} />
        </span>
        <span className="text-[11px] font-bold uppercase tracking-[1px] text-[#5B3D78]">
          Follow-up Question
        </span>
      </div>

      <p className="text-[15px] font-medium leading-[1.45] text-[#1A1A1A]">
        {question}
      </p>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onUse}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-[#1A1A1A] px-3 py-2 text-[12px] font-semibold text-white transition-opacity hover:opacity-90 active:opacity-80"
        >
          <Plus className="h-3 w-3" strokeWidth={2.5} />
          Use this
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="cursor-pointer rounded-full bg-white px-3 py-2 text-[12px] font-semibold text-[#6B6259] transition-opacity hover:opacity-90 active:opacity-80"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}

export function SupportCard() {
  return (
    <div className="flex flex-col gap-3 rounded-[20px] border border-[#F3D6D0] bg-[#FBEDE9] p-4">
      <div className="flex items-center gap-1.5">
        <span
          aria-hidden
          className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-[#C06B5D]"
        >
          <HeartHandshake className="h-3 w-3 text-white" strokeWidth={2} />
        </span>
        <span className="text-[11px] font-bold uppercase tracking-[1px] text-[#8A3A2E]">
          Support
        </span>
      </div>

      <div className="flex flex-col gap-1">
        <p className="text-[15px] font-semibold leading-[1.35] text-[#1A1A1A]">
          It sounds like this is heavy.
        </p>
        <p className="text-[13px] leading-[1.5] text-[#6B4A43]">
          You don&apos;t have to sit with this alone. Reaching out can help.
        </p>
      </div>

      <ul className="flex flex-col gap-1 text-[13px] text-[#1A1A1A]">
        <li>
          <span className="font-semibold">NCMH Crisis Hotline</span>
          <span className="text-[#6B4A43]"> · 1553 (toll-free PH)</span>
        </li>
        <li>
          <span className="font-semibold">Hopeline PH</span>
          <span className="text-[#6B4A43]"> · (02) 8804-HOPE (4673)</span>
        </li>
      </ul>

      <Link
        href="/dashboard"
        className="mt-1 inline-flex w-fit cursor-pointer items-center gap-1.5 rounded-full bg-[#1A1A1A] px-3 py-2 text-[12px] font-semibold text-white transition-opacity hover:opacity-90 active:opacity-80"
      >
        Leave and return later
      </Link>
    </div>
  );
}

type AiResponseCardProps = {
  intent: Intent;
  response: string;
  escalation?: boolean;
};

export function AiResponseCard({
  intent,
  response,
  escalation,
}: AiResponseCardProps) {
  const isCrisis = intent === "crisis";
  return (
    <div
      className={[
        "flex flex-col gap-3.5 rounded-[22px] border p-5",
        isCrisis
          ? "border-[#F3D6D0] bg-[#FBEDE9]"
          : "border-[#D7E4DC] bg-[#EFF6F1]",
      ].join(" ")}
    >
      <div className="flex items-center gap-2.5">
        <span
          aria-hidden
          className={[
            "flex h-7 w-7 items-center justify-center rounded-full shadow-[0_1px_0_rgba(255,255,255,0.6)_inset,0_1px_2px_rgba(0,0,0,0.08)]",
            isCrisis ? "bg-[#C06B5D]" : "bg-[#4F8A6E]",
          ].join(" ")}
        >
          {isCrisis ? (
            <HeartHandshake className="h-3.5 w-3.5 text-white" strokeWidth={2} />
          ) : (
            <Sparkles className="h-3.5 w-3.5 text-white" strokeWidth={2} />
          )}
        </span>
        <div className="flex flex-col">
          <span
            className={[
              "text-[13px] font-semibold tracking-[-0.1px]",
              isCrisis ? "text-[#8A3A2E]" : "text-[#2F5C47]",
            ].join(" ")}
          >
            {isCrisis ? "Support" : "AI Companion"}
          </span>
          <span
            className={[
              "text-[11px] font-medium tracking-[0.1px]",
              isCrisis ? "text-[#B88078]" : "text-[#7AA592]",
            ].join(" ")}
          >
            {isCrisis ? "Here to help, right now" : "Wrote back just now"}
          </span>
        </div>
      </div>

      <p className="whitespace-pre-wrap text-[15px] leading-[1.6] text-[#1A1A1A]">
        {response}
      </p>

      {escalation && !isCrisis ? (
        <div className="flex items-start gap-2 rounded-[14px] border border-[#F3D6D0] bg-white/70 px-3.5 py-2.5 text-[12px] leading-[1.5] text-[#6B4A43]">
          <AlertTriangle
            className="mt-0.5 h-4 w-4 shrink-0 text-[#C06B5D]"
            strokeWidth={2}
          />
          <span>
            Your mood has trended down across recent entries. If this pattern
            continues, consider talking to someone you trust.
          </span>
        </div>
      ) : null}
    </div>
  );
}

type ProfessionalHelpCardProps = {
  onConnect?: () => void;
};

type ConnectState = "idle" | "sending" | "sent";

/**
 * Shown on every successful submission. Rather than dumping a resource
 * list, it offers to connect the user to a verified professional by
 * sharing the journal entry as context — a one-click escape hatch into
 * real human support.
 */
export function ProfessionalHelpCard({ onConnect }: ProfessionalHelpCardProps) {
  const [state, setState] = useState<ConnectState>("idle");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleClick = () => {
    if (state !== "idle") return;
    setState("sending");
    onConnect?.();
    timerRef.current = setTimeout(() => {
      setState("sent");
    }, 900);
  };

  const isSent = state === "sent";

  return (
    <div
      className={[
        "flex flex-col gap-2.5 rounded-[20px] border p-4 transition-colors duration-200",
        isSent
          ? "border-[#D7E4DC] bg-[#F3F8F4]"
          : "border-[#E4E0D8] bg-white",
      ].join(" ")}
    >
      <div className="flex items-center gap-1.5">
        <span
          aria-hidden
          className={[
            "flex h-[22px] w-[22px] items-center justify-center rounded-full transition-colors duration-200",
            isSent ? "bg-[#4F8A6E]" : "bg-[#1A1A1A]",
          ].join(" ")}
        >
          {isSent ? (
            <CheckCircle2 className="h-3.5 w-3.5 text-white" strokeWidth={2} />
          ) : (
            <Phone className="h-3 w-3 text-white" strokeWidth={2} />
          )}
        </span>
        <span
          className={[
            "text-[11px] font-bold uppercase tracking-[1px] transition-colors duration-200",
            isSent ? "text-[#2F5C47]" : "text-[#4B423B]",
          ].join(" ")}
        >
          {isSent ? "Request received" : "Talk to a professional"}
        </span>
      </div>

      <p className="text-[13px] leading-[1.55] text-[#4B423B]">
        {isSent
          ? "Thanks for reaching out. One of our verified professionals will review your entry and follow up soon. You're not alone in this."
          : "If you'd like to share this journal entry to ask for advice or raise a concern, we can connect you with one of our verified mental health professionals."}
      </p>

      <button
        type="button"
        onClick={handleClick}
        disabled={state !== "idle"}
        aria-live="polite"
        className={[
          "mt-1 inline-flex w-fit items-center gap-1.5 rounded-full px-3.5 py-2 text-[12px] font-semibold text-white transition-colors duration-200",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1A1A1A]",
          state === "idle"
            ? "cursor-pointer bg-[#1A1A1A] hover:bg-[#2A2724] active:opacity-85"
            : "",
          state === "sending"
            ? "cursor-progress bg-[#3A3632]"
            : "",
          state === "sent"
            ? "cursor-default bg-[#4F8A6E]"
            : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {state === "sending" ? (
          <>
            <Loader2
              className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none"
              strokeWidth={2}
              aria-hidden
            />
            <span>Connecting…</span>
          </>
        ) : state === "sent" ? (
          <>
            <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
            <span>Request sent</span>
          </>
        ) : (
          <span>Connect me with a professional</span>
        )}
      </button>
    </div>
  );
}
