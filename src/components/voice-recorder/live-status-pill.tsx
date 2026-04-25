"use client";

import type { LiveStatus } from "@/lib/use-live-conversation";

const LABELS: Record<LiveStatus, string> = {
  idle: "Ready",
  connecting: "Connecting…",
  listening: "Listening…",
  thinking: "Thinking…",
  speaking: "Speaking…",
  error: "Error",
};

export function LiveStatusPill({ status }: { status: LiveStatus }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full bg-[#F5F2ED] px-3 py-1">
      <span
        className="inline-block h-2 w-2 rounded-full bg-[#8B5CF6]"
        aria-hidden
      />
      <span className="text-[13px] font-medium text-[#1A1A1A]">
        {LABELS[status]}
      </span>
    </div>
  );
}
