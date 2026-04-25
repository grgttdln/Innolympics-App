"use client";

import type { RefObject } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { X } from "lucide-react";

import {
  AiResponseCard,
  MoodChip,
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
 * Post-submit insights surface. Not a bottom sheet — the content has
 * enough scroll weight (mood chip + persona response + CTA) that a
 * centred panel reads better than a drag-handle sheet.
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
        <Dialog.Backdrop className="absolute inset-0 z-10 bg-black/40 backdrop-blur-sm" />
        <Dialog.Popup className="absolute left-1/2 top-1/2 z-20 flex max-h-[80%] w-[92%] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-[28px] bg-[#FCFAF7] shadow-2xl sm:w-[340px]">
          <div className="flex items-center justify-between border-b border-[#EFE8E0] px-5 py-4">
            <Dialog.Title className="text-[15px] font-semibold tracking-[-0.2px] text-[#1A1A1A]">
              Reflective insights
            </Dialog.Title>
            <Dialog.Close
              aria-label="Close"
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-white text-[#4B423B] transition-opacity hover:opacity-80 active:opacity-70"
            >
              <X className="h-4 w-4" strokeWidth={2} />
            </Dialog.Close>
          </div>

          <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-5 py-4 [scrollbar-color:#D9D2C7_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#D9D2C7] [&::-webkit-scrollbar]:w-1.5">
            {reply ? (
              <>
                <MoodChip
                  moodScore={reply.mood_score}
                  emotions={reply.emotions}
                />
                <AiResponseCard
                  intent={reply.intent}
                  response={reply.response}
                  escalation={reply.needs_escalation}
                />
                <ProfessionalHelpCard onConnect={onConnectProfessional} />
              </>
            ) : null}
          </div>

          <div className="shrink-0 border-t border-[#EFE8E0] bg-[#FCFAF7] px-5 py-3">
            <Dialog.Close className="flex h-[44px] w-full cursor-pointer items-center justify-center rounded-full bg-[#1A1A1A] text-[14px] font-semibold text-white transition-opacity hover:opacity-90 active:opacity-80">
              Back to entry
            </Dialog.Close>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
