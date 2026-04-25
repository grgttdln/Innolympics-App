"use client";

import { X } from "lucide-react";

type Props = {
  status: "recording" | "paused";
  onClose: () => void;
};

export function RecordingHeader({ status, onClose }: Props) {
  const isRecording = status === "recording";
  const dotColor = isRecording ? "#E5484D" : "#A0A0A0";
  const label = isRecording ? "Recording" : "Paused";

  return (
    <div className="flex h-11 items-center justify-between">
      <button
        type="button"
        aria-label="Back"
        onClick={onClose}
        className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full bg-[#F5F2ED] text-[#1A1A1A] transition-opacity hover:opacity-90 active:opacity-80"
      >
        <X className="h-5 w-5" strokeWidth={1.75} />
      </button>

      <div className="flex h-9 items-center gap-2 rounded-full bg-[#F5F2ED] px-4">
        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: dotColor }} aria-hidden />
        <span className="text-[15px] font-semibold text-[#1A1A1A]">{label}</span>
      </div>

      <div className="h-11 w-11" aria-hidden />
    </div>
  );
}
