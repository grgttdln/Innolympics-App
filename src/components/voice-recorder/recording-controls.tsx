"use client";

import { Pause, Play, Trash2 } from "lucide-react";

type Props = {
  paused: boolean;
  onPauseToggle: () => void;
  onStop: () => void;
  onCancel: () => void;
};

export function RecordingControls({ paused, onPauseToggle, onStop, onCancel }: Props) {
  return (
    <div className="flex items-center justify-center gap-8">
      <ButtonSlot label={paused ? "Resume" : "Pause"}>
        <button
          type="button"
          aria-label={paused ? "Resume" : "Pause"}
          onClick={onPauseToggle}
          className="flex h-16 w-16 cursor-pointer items-center justify-center rounded-full border border-[#EBEBEB] bg-white shadow-sm transition-transform active:scale-95"
        >
          {paused ? (
            <Play className="h-6 w-6 text-[#1A1A1A]" strokeWidth={1.75} />
          ) : (
            <Pause className="h-6 w-6 text-[#1A1A1A]" strokeWidth={1.75} />
          )}
        </button>
      </ButtonSlot>

      <ButtonSlot label="Stop">
        <button
          type="button"
          aria-label="Stop"
          onClick={onStop}
          className="flex h-[88px] w-[88px] cursor-pointer items-center justify-center rounded-full bg-[#8B5CF6] shadow-md transition-transform active:scale-95"
        >
          <span className="h-6 w-6 rounded-[4px] bg-white" aria-hidden />
        </button>
      </ButtonSlot>

      <ButtonSlot label="Cancel">
        <button
          type="button"
          aria-label="Cancel"
          onClick={onCancel}
          className="flex h-16 w-16 cursor-pointer items-center justify-center rounded-full border border-[#EBEBEB] bg-white shadow-sm transition-transform active:scale-95"
        >
          <Trash2 className="h-6 w-6 text-[#1A1A1A]" strokeWidth={1.75} />
        </button>
      </ButtonSlot>
    </div>
  );
}

function ButtonSlot({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2">
      {children}
      <span className="text-[12px] text-[#1A1A1A]">{label}</span>
    </div>
  );
}
