"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";

import { InsightsDialog } from "@/components/insights-dialog";
import { buildGuidedTranscript, type Prompt } from "@/components/guided-methods";
import { loadUser } from "@/lib/session";
import type { JournalApiResponse } from "@/lib/types";

type Props = {
  title: string;
  prompts: readonly Prompt[];
};

export function GuidedPromptRunner({ title, prompts }: Props) {
  const router = useRouter();
  const frameRef = useRef<HTMLDivElement | null>(null);

  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<string[]>(() =>
    prompts.map(() => ""),
  );
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [aiReply, setAiReply] = useState<JournalApiResponse | null>(null);
  const [insightsOpen, setInsightsOpen] = useState(false);
  const [userId, setUserId] = useState<number | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate from localStorage on mount
    setUserId(loadUser()?.id ?? null);
  }, []);

  const currentPrompt = prompts[step];
  const currentAnswer = answers[step] ?? "";
  const isLastStep = step === prompts.length - 1;
  const canAdvance = currentAnswer.trim().length > 0;

  const updateAnswer = (value: string) => {
    setAnswers((prev) => {
      const next = [...prev];
      next[step] = value;
      return next;
    });
  };

  const handleBack = () => {
    if (step === 0) {
      router.push("/journal/text/guided");
      return;
    }
    setStep((s) => s - 1);
  };

  const handleNext = () => {
    if (!canAdvance) return;
    setStep((s) => s + 1);
  };

  const handleFinish = async () => {
    if (!canAdvance || submitting || userId === null) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const transcript = buildGuidedTranscript(prompts, answers);
      const res = await fetch("/api/journal/save-only", {
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
      const { entry_id } = (await res.json()) as { entry_id: string };
      setAiReply({
        intent: "reflection",
        severity: 0,
        mood_score: 0,
        emotions: [],
        response:
          "Thanks for checking in with yourself today. Small moments of reflection add up — keep going at your own pace.",
        flagged: false,
        needs_escalation: false,
        entry_id,
      });
      setInsightsOpen(true);
    } catch {
      setSubmitError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-100">
      <div
        ref={frameRef}
        className="relative flex h-[844px] w-[390px] flex-col overflow-hidden rounded-[40px] bg-[#FCFAF7]"
      >
        <div className="h-[54px] shrink-0" aria-hidden />

        <div className="flex items-center justify-between px-5 pb-3 pt-3">
          <button
            type="button"
            onClick={handleBack}
            aria-label="Back"
            className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full bg-[#F5F2ED] text-[#1A1A1A] transition-opacity hover:opacity-90 active:opacity-80"
          >
            <ArrowLeft className="h-5 w-5" strokeWidth={1.75} />
          </button>
          <span className="text-[13px] font-semibold tracking-[0.4px] text-[#8A8172]">
            Step {step + 1} of {prompts.length}
          </span>
          <span aria-hidden className="h-11 w-11" />
        </div>

        <header className="flex flex-col gap-1.5 px-6 pb-2 pt-3">
          <p className="text-[13px] font-semibold tracking-[0.4px] text-[#B8B0A7]">
            {title}
          </p>
          <h1 className="text-[22px] font-bold leading-[1.2] tracking-[-0.6px] text-[#1A1A1A]">
            {currentPrompt.label}
          </h1>
        </header>

        <div className="flex min-h-0 flex-1 flex-col gap-3 px-6 pb-4 pt-2">
          <textarea
            value={currentAnswer}
            onChange={(e) => updateAnswer(e.target.value)}
            placeholder={currentPrompt.placeholder}
            className="min-h-[220px] w-full flex-1 resize-none border-none bg-transparent p-0 text-[17px] leading-[1.55] text-[#1A1A1A] placeholder:text-[#B8B0A7] focus:outline-none"
            autoFocus
          />

          {submitError ? (
            <p className="text-[13px] text-[#8A3A2E]">{submitError}</p>
          ) : null}

          {userId === null ? (
            <p className="text-[13px] text-[#8A8172]">
              Please sign in to save.
            </p>
          ) : null}
        </div>

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

        <div className="shrink-0 border-t border-[#EFE8E0] bg-[#FCFAF7] px-5 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-4">
          <button
            type="button"
            onClick={isLastStep ? handleFinish : handleNext}
            disabled={
              !canAdvance ||
              submitting ||
              (isLastStep && userId === null)
            }
            className="flex h-[54px] w-full cursor-pointer items-center justify-center gap-2.5 rounded-full bg-[#1A1A1A] text-[15px] font-semibold tracking-[0.1px] text-white shadow-[0_8px_18px_rgba(26,26,26,0.2)] transition-opacity hover:opacity-90 active:opacity-80 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isLastStep ? (submitting ? "Saving…" : "Finish") : "Next"}
            {!submitting ? (
              <ArrowRight className="h-4 w-4" strokeWidth={2} />
            ) : null}
          </button>
        </div>
      </div>
    </main>
  );
}
