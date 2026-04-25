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
  const primaryGradient = idle
    ? "linear-gradient(155deg, #EE6B70 0%, #D83D44 55%, #B42A31 100%)"
    : "linear-gradient(155deg, #A48BFF 0%, #8B5CF6 55%, #6D3FD6 100%)";
  const primaryGlow = idle
    ? "0 18px 40px -12px rgba(216, 61, 68, 0.55), 0 4px 12px rgba(216, 61, 68, 0.18)"
    : "0 18px 40px -12px rgba(109, 63, 214, 0.55), 0 4px 12px rgba(109, 63, 214, 0.18)";
  const primaryHaloTint = idle
    ? "rgba(216, 61, 68, 0.16)"
    : "rgba(139, 92, 246, 0.18)";

  return (
    <div className="flex items-end justify-center gap-8">
      <ButtonSlot label={paused ? "Resume" : "Pause"} hidden={idle} variant="secondary">
        <SideButton
          aria-label={paused ? "Resume" : "Pause"}
          onClick={onPauseToggle}
        >
          {paused ? (
            <Play className="h-[20px] w-[20px] text-[#1A1A1A]" strokeWidth={1.5} />
          ) : (
            <Pause className="h-[20px] w-[20px] text-[#1A1A1A]" strokeWidth={1.5} />
          )}
        </SideButton>
      </ButtonSlot>

      <ButtonSlot label={primaryLabel} variant="primary">
        {/* Double-bezel outer shell */}
        <div
          className="relative rounded-full p-[6px] transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]"
          style={{
            background: `radial-gradient(circle at 50% 30%, ${primaryHaloTint} 0%, rgba(255,255,255,0) 70%)`,
          }}
        >
          {/* Soft concentric halo */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-[-14px] rounded-full"
            style={{ background: `radial-gradient(circle, ${primaryHaloTint} 0%, rgba(255,255,255,0) 65%)` }}
          />
          <button
            type="button"
            aria-label={idle ? "Start recording" : "Stop"}
            onClick={idle ? onStart : onStop}
            style={{
              background: primaryGradient,
              boxShadow: `${primaryGlow}, inset 0 1px 0 rgba(255,255,255,0.28), inset 0 -4px 8px rgba(0,0,0,0.15)`,
            }}
            className="relative flex h-[96px] w-[96px] cursor-pointer items-center justify-center rounded-full transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] will-change-transform hover:scale-[1.04] active:scale-[0.94]"
          >
            {/* Specular top highlight */}
            <span
              aria-hidden
              className="absolute left-[22%] top-[14%] h-[32%] w-[44%] rounded-full blur-md"
              style={{ background: "rgba(255,255,255,0.45)" }}
            />
            {idle ? (
              <span
                className="relative h-[22px] w-[22px] rounded-full bg-white"
                style={{ boxShadow: "inset 0 -1px 2px rgba(0,0,0,0.08)" }}
                aria-hidden
              />
            ) : (
              <span
                className="relative h-[24px] w-[24px] rounded-[6px] bg-white"
                style={{ boxShadow: "inset 0 -1px 2px rgba(0,0,0,0.08)" }}
                aria-hidden
              />
            )}
          </button>
        </div>
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
