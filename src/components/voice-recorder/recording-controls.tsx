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
  const primaryShadow = idle
    ? "0_10px_28px_rgba(229,72,77,0.35)"
    : "0_10px_28px_rgba(139,92,246,0.4)";

  return (
    <div className="flex items-end justify-center gap-8">
      <ButtonSlot label={paused ? "Resume" : "Pause"} hidden={idle} variant="secondary">
        <SideButton
          aria-label={paused ? "Resume" : "Pause"}
          onClick={onPauseToggle}
        >
          {paused ? (
            <Play className="h-[22px] w-[22px] text-[#1A1A1A]" strokeWidth={2} />
          ) : (
            <Pause className="h-[22px] w-[22px] text-[#1A1A1A]" strokeWidth={2} />
          )}
        </SideButton>
      </ButtonSlot>

      <ButtonSlot label={primaryLabel} variant="primary">
        <button
          type="button"
          aria-label={idle ? "Start recording" : "Stop"}
          onClick={idle ? onStart : onStop}
          style={{
            backgroundColor: primaryColor,
            boxShadow: `${primaryShadow.replace(/_/g, " ")}, inset 0 1px 0 rgba(255,255,255,0.15), inset 0 -2px 4px rgba(0,0,0,0.12)`,
          }}
          className="relative flex h-[92px] w-[92px] cursor-pointer items-center justify-center rounded-full transition-all duration-150 ease-out hover:scale-[1.03] active:scale-95"
        >
          <span
            aria-hidden
            style={{ borderColor: primaryColor }}
            className="absolute inset-[-10px] rounded-full border-[2px] opacity-20"
          />
          {idle ? (
            <span className="h-[22px] w-[22px] rounded-full bg-white" aria-hidden />
          ) : (
            <span className="h-6 w-6 rounded-[5px] bg-white" aria-hidden />
          )}
        </button>
      </ButtonSlot>

      <ButtonSlot label="Cancel" hidden={idle} variant="secondary">
        <SideButton aria-label="Cancel" onClick={onCancel}>
          <Trash2 className="h-[22px] w-[22px] text-[#1A1A1A]" strokeWidth={2} />
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
      className="flex h-[60px] w-[60px] cursor-pointer items-center justify-center rounded-full bg-white shadow-[0_4px_12px_rgba(17,12,46,0.08)] ring-1 ring-black/[0.04] transition-all duration-150 ease-out hover:-translate-y-0.5 hover:shadow-[0_6px_16px_rgba(17,12,46,0.12)] active:translate-y-0 active:scale-95"
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
      ? "text-[12px] font-semibold tracking-wide text-[#1A1A1A]"
      : "text-[12px] font-medium text-[#8A8A8A]";
  return (
    <div
      className={`flex flex-col items-center gap-3 ${
        hidden ? "invisible pointer-events-none" : ""
      }`}
    >
      {children}
      <span className={labelClass}>{label}</span>
    </div>
  );
}
