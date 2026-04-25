"use client";

import { X } from "lucide-react";

type Props = {
  status: "idle" | "recording" | "paused";
  onClose: () => void;
};

export function RecordingHeader({ status, onClose }: Props) {
  const dotColor = status === "recording" ? "#E5484D" : status === "paused" ? "#A0A0A0" : "#8B5CF6";
  const label = status === "recording" ? "Recording" : status === "paused" ? "Paused" : "Ready";

  return (
    <div className="flex h-11 items-center justify-between">
      <button
        type="button"
        aria-label="Back"
        onClick={onClose}
        className="group flex h-11 w-11 cursor-pointer items-center justify-center rounded-full bg-white/80 text-[#1A1A1A] ring-1 ring-black/[0.05] shadow-[0_1px_0_rgba(255,255,255,0.9)_inset,0_4px_12px_-2px_rgba(17,12,46,0.06)] backdrop-blur-[2px] transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-[1px] hover:bg-white hover:shadow-[0_1px_0_rgba(255,255,255,0.9)_inset,0_6px_16px_-2px_rgba(17,12,46,0.1)] active:translate-y-0 active:scale-95"
      >
        <X className="h-[18px] w-[18px]" strokeWidth={1.5} />
      </button>

      <div className="flex h-9 items-center gap-2 rounded-full bg-white/80 px-4 ring-1 ring-black/[0.05] shadow-[0_1px_0_rgba(255,255,255,0.9)_inset,0_2px_8px_-2px_rgba(17,12,46,0.05)] backdrop-blur-[2px]">
        <span
          className="h-[6px] w-[6px] rounded-full transition-colors duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]"
          style={{
            backgroundColor: dotColor,
            boxShadow: `0 0 8px ${dotColor}`,
          }}
          aria-hidden
        />
        <span className="text-[13px] font-semibold tracking-[-0.1px] text-[#1A1A1A]">
          {label}
        </span>
      </div>

      <div className="h-11 w-11" aria-hidden />
    </div>
  );
}
