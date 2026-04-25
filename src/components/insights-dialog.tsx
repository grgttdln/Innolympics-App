"use client";

import type { RefObject } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { Sparkles } from "lucide-react";

import {
  AiResponseCard,
  ProfessionalHelpCard,
} from "@/components/follow-up-card";
import type { JournalApiResponse } from "@/lib/types";

type InsightsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reply: JournalApiResponse | null;
  onConnectProfessional?: () => void;
  container?: RefObject<HTMLElement | null>;
};

/**
 * Post-submit insights surface. Sheet-like centred panel inside the
 * phone frame, matching the existing discard-confirm-sheet chrome +
 * follow-up-card lavender accent family.
 */
export function InsightsDialog({
  open,
  onOpenChange,
  reply,
  onConnectProfessional,
  container,
}: InsightsDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal container={container}>
        <Dialog.Backdrop
          className={[
            "absolute inset-0 z-10 bg-black/45 backdrop-blur-[3px]",
            "transition-opacity duration-200 ease-out",
            "data-[starting-style]:opacity-0 data-[ending-style]:opacity-0",
            "motion-reduce:transition-none",
          ].join(" ")}
        />
        <Dialog.Popup
          className={[
            "absolute left-1/2 top-1/2 z-20 flex max-h-[86%] w-[92%] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-[28px] bg-[#FCFAF7] shadow-[0_24px_60px_-20px_rgba(26,26,26,0.35)] sm:w-[342px] sm:max-h-[600px]",
            "transition-[transform,opacity] duration-250 ease-[cubic-bezier(0.32,0.72,0,1)]",
            "data-[starting-style]:opacity-0 data-[starting-style]:translate-y-[calc(-50%+12px)] data-[starting-style]:scale-[0.96]",
            "data-[ending-style]:opacity-0 data-[ending-style]:translate-y-[calc(-50%+8px)] data-[ending-style]:scale-[0.97]",
            "motion-reduce:transition-none motion-reduce:transform-none",
            "focus-visible:outline-none",
          ].join(" ")}
        >
          <header className="flex items-center justify-center gap-2 border-b border-[#EFE8E0] px-5 py-4">
            <span
              aria-hidden
              className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-[#A881C2]"
            >
              <Sparkles className="h-3 w-3 text-white" strokeWidth={2} />
            </span>
            <Dialog.Title className="text-[14px] font-semibold tracking-[-0.2px] text-[#1A1A1A]">
              Reflective insights
            </Dialog.Title>
          </header>

          <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-5 py-5 [scrollbar-color:#D9D2C7_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#D9D2C7] [&::-webkit-scrollbar]:w-1.5">
            {reply ? (
              <>
                {reply.emotions.length > 0 ? (
                  <EmotionAcknowledgement emotions={reply.emotions} />
                ) : null}
                <AiResponseCard
                  intent={reply.intent}
                  response={reply.response}
                  escalation={reply.needs_escalation}
                />
                <ProfessionalHelpCard onConnect={onConnectProfessional} />
              </>
            ) : null}
          </div>

          <div className="shrink-0 border-t border-[#EFE8E0] bg-[#FCFAF7] px-5 py-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
            <Dialog.Close
              className={[
                "flex h-[48px] w-full cursor-pointer items-center justify-center rounded-full bg-[#1A1A1A] text-[14px] font-semibold tracking-[0.1px] text-[#FCFAF7] shadow-[0_6px_20px_rgba(26,26,26,0.18)]",
                "transition-colors duration-200 hover:bg-[#2A2724] active:opacity-90",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A881C2]",
              ].join(" ")}
            >
              Done
            </Dialog.Close>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/**
 * Replaces the old MoodChip. No numeric mood_score exposed — just a
 * gentle emotional acknowledgement line. Emotions render as lowercase
 * soft-lavender chips, matching the FollowUpCard family.
 */
function EmotionAcknowledgement({ emotions }: { emotions: string[] }) {
  const visible = emotions.slice(0, 3).map(toTitleCase);
  return (
    <div className="flex flex-col gap-2 rounded-[20px] border border-[#E9DAF2] bg-[#F4EEF9] px-4 py-3">
      <p className="text-[11px] font-bold uppercase tracking-[1px] text-[#5B3D78]">
        What I noticed
      </p>
      <div className="flex flex-wrap items-center gap-1.5">
        {visible.map((emotion) => (
          <span
            key={emotion}
            className="inline-flex items-center rounded-full bg-white px-2.5 py-1 text-[12px] font-medium text-[#5B3D78]"
          >
            {emotion}
          </span>
        ))}
      </div>
    </div>
  );
}

function toTitleCase(value: string): string {
  return value
    .trim()
    .split(/\s+/)
    .map((word) =>
      word.length === 0
        ? word
        : word[0].toUpperCase() + word.slice(1).toLowerCase(),
    )
    .join(" ");
}
