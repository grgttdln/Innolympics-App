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

  const primaryLabel = idle ? "Record" : "Stop";
  const primaryColor = idle ? "#E5484D" : "#8B5CF6";

  return (
    <div className="flex items-end justify-center gap-8">
      <ButtonSlot label={paused ? "Resume" : "Pause"} hidden={idle} variant="secondary">
        <SideButton aria-label={paused ? "Resume" : "Pause"} onClick={onPauseToggle}>
          {paused ? (
            <Play className="h-[20px] w-[20px] text-[#1A1A1A]" strokeWidth={1.5} />
          ) : (
            <Pause className="h-[20px] w-[20px] text-[#1A1A1A]" strokeWidth={1.5} />
          )}
        </SideButton>
      </ButtonSlot>

      <ButtonSlot label={primaryLabel} variant="primary">
        <button
          type="button"
          aria-label={idle ? "Start recording" : "Stop"}
          onClick={idle ? onStart : onStop}
          style={{ backgroundColor: primaryColor }}
          className="flex h-[80px] w-[80px] cursor-pointer items-center justify-center rounded-full shadow-[0_8px_20px_-4px_rgba(17,12,46,0.15)] transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:scale-[1.03] active:scale-95"
        >
          {idle ? (
            <span className="h-[18px] w-[18px] rounded-full bg-white" aria-hidden />
          ) : (
            <span className="h-[20px] w-[20px] rounded-[4px] bg-white" aria-hidden />
          )}
        </button>
      </ButtonSlot>

      <ButtonSlot label="Cancel" hidden={idle} variant="secondary">
        <SideButton aria-label="Cancel" onClick={onCancel}>
          <Trash2 className="h-[20px] w-[20px] text-[#1A1A1A]" strokeWidth={1.5} />
        </SideButton>
      </ButtonSlot>
    </div>
  );
}

function SideButton({
  children,
  onClick,
  ...rest
}: {
  children: React.ReactNode;
  onClick: () => void;
  "aria-label": string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      {...rest}
      className="group flex h-[56px] w-[56px] cursor-pointer items-center justify-center rounded-full bg-white/80 backdrop-blur-[2px] ring-1 ring-black/[0.05] shadow-[0_1px_0_rgba(255,255,255,0.9)_inset,0_6px_16px_-4px_rgba(17,12,46,0.08),0_2px_4px_rgba(17,12,46,0.04)] transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] will-change-transform hover:-translate-y-[2px] hover:bg-white hover:shadow-[0_1px_0_rgba(255,255,255,0.9)_inset,0_10px_24px_-4px_rgba(17,12,46,0.12),0_2px_6px_rgba(17,12,46,0.06)] active:translate-y-0 active:scale-95"
    >
      {children}
    </button>
  );
}

function ButtonSlot({
  label,
  children,
  hidden = false,
  variant,
}: {
  label: string;
  children: React.ReactNode;
  hidden?: boolean;
  variant: "primary" | "secondary";
}) {
  const labelClass =
    variant === "primary"
      ? "text-[10px] font-semibold uppercase tracking-[0.24em] text-[#1A1A1A]"
      : "text-[10px] font-medium uppercase tracking-[0.18em] text-[#8A8A8A]";
  return (
    <div
      className={`flex flex-col items-center gap-[14px] ${
        hidden ? "invisible pointer-events-none" : ""
      }`}
    >
      {children}
      <span className={labelClass}>{label}</span>
    </div>
  );
}
