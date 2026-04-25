"use client";

import { Pause, Play, Trash2 } from "lucide-react";

type Props = {
  status: "idle" | "recording" | "paused";
  onStart: () => void;
  onPauseToggle: () => void;
  onStop: () => void;
  onCancel: () => void;
};

export function RecordingControls({ status, onStart, onPauseToggle, onStop, onCancel }: Props) {
  const idle = status === "idle";
  const paused = status === "paused";

  return (
    <div className="flex items-center justify-center gap-8">
      <ButtonSlot label={paused ? "Resume" : "Pause"} hidden={idle}>
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

      <ButtonSlot label={idle ? "Record" : "Stop"}>
        {idle ? (
          <button
            type="button"
            aria-label="Start recording"
            onClick={onStart}
            className="flex h-[88px] w-[88px] cursor-pointer items-center justify-center rounded-full bg-[#E5484D] shadow-md transition-transform active:scale-95"
          >
            <span className="h-5 w-5 rounded-full bg-white" aria-hidden />
          </button>
        ) : (
          <button
            type="button"
            aria-label="Stop"
            onClick={onStop}
            className="flex h-[88px] w-[88px] cursor-pointer items-center justify-center rounded-full bg-[#8B5CF6] shadow-md transition-transform active:scale-95"
          >
            <span className="h-6 w-6 rounded-[4px] bg-white" aria-hidden />
          </button>
        )}
      </ButtonSlot>

      <ButtonSlot label="Cancel" hidden={idle}>
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

function ButtonSlot({
  label,
  children,
  hidden = false,
}: {
  label: string;
  children: React.ReactNode;
  hidden?: boolean;
}) {
  return (
    <div className={`flex flex-col items-center gap-2 ${hidden ? "invisible pointer-events-none" : ""}`}>
      {children}
      <span className="text-[12px] text-[#1A1A1A]">{label}</span>
    </div>
  );
}
