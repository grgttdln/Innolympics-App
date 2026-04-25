"use client";

import { Square } from "lucide-react";

export function LiveStopButton({
  onClick,
  disabled,
}: {
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label="Stop conversation"
      className="flex h-[72px] w-[72px] cursor-pointer items-center justify-center rounded-full bg-[#E25B5B] shadow-[0_8px_24px_rgba(226,91,91,0.35)] transition-opacity active:opacity-85 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <Square className="h-7 w-7 fill-white text-white" strokeWidth={0} />
    </button>
  );
}
