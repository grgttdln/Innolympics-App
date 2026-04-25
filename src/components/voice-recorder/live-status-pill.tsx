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

const DOT_COLORS: Record<LiveStatus, string> = {
  idle: "bg-[#8B5CF6]",
  connecting: "bg-[#CFC9BE]",
  listening: "bg-[#8B5CF6]",
  thinking: "bg-[#CFC9BE]",
  speaking: "bg-[#F5A623]",
  error: "bg-[#E25B5B]",
};

export function LiveStatusPill({ status }: { status: LiveStatus }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full bg-[#F5F2ED] px-3 py-1">
      <span
        className={`inline-block h-2 w-2 rounded-full ${DOT_COLORS[status]}`}
        aria-hidden
      />
      <span className="text-[13px] font-medium text-[#1A1A1A]">
        {LABELS[status]}
      </span>
    </div>
  );
}
