"use client";

import type { RefObject } from "react";
import { Dialog } from "@base-ui/react/dialog";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDiscard: () => void;
  container?: RefObject<HTMLElement | null>;
};

export function DiscardConfirmSheet({ open, onOpenChange, onDiscard, container }: Props) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal container={container}>
        <Dialog.Backdrop className="absolute inset-0 z-10 bg-black/40 backdrop-blur-sm" />
        <Dialog.Popup className="absolute inset-x-0 bottom-0 z-20 rounded-t-3xl bg-white p-6 pb-8 shadow-2xl">
        <Dialog.Title className="text-[18px] font-semibold text-[#1A1A1A]">
          Discard recording?
        </Dialog.Title>
        <Dialog.Description className="mt-2 text-[14px] text-[#8A8A8A]">
          Your audio will be deleted and can&apos;t be recovered.
        </Dialog.Description>
        <div className="mt-6 flex flex-col gap-3">
          <button
            type="button"
            onClick={() => {
              onDiscard();
              onOpenChange(false);
            }}
            className="h-12 cursor-pointer rounded-full bg-[#E5484D] text-[15px] font-semibold text-white transition-opacity active:opacity-85"
          >
            Discard
          </button>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="h-12 cursor-pointer rounded-full bg-[#F5F2ED] text-[15px] font-semibold text-[#1A1A1A] transition-opacity active:opacity-85"
          >
            Keep recording
          </button>
        </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
