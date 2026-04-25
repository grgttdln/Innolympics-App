"use client";

import { cn } from "@/lib/utils";
import type { LiveStatus } from "@/lib/use-live-conversation";

export function LiveOrb({ status }: { status: LiveStatus }) {
  const speaking = status === "speaking";
  const listening = status === "listening";
  const thinking = status === "thinking" || status === "connecting";

  const color = speaking
    ? "bg-[#F5A623]"
    : listening
    ? "bg-[#8B5CF6]"
    : "bg-[#CFC9BE]";

  const pulse = speaking
    ? "animate-[live-orb-fast_0.9s_ease-in-out_infinite]"
    : listening
    ? "animate-[live-orb-slow_2.2s_ease-in-out_infinite]"
    : thinking
    ? "animate-pulse"
    : "";

  return (
    <div className="relative flex h-[220px] w-[220px] items-center justify-center">
      <style>{`
        @keyframes live-orb-slow {
          0%, 100% { transform: scale(1); opacity: 0.85; }
          50% { transform: scale(1.06); opacity: 1; }
        }
        @keyframes live-orb-fast {
          0%, 100% { transform: scale(1); opacity: 0.9; }
          50% { transform: scale(1.12); opacity: 1; }
        }
      `}</style>
      <div
        className={cn(
          "h-[180px] w-[180px] rounded-full blur-[1px] shadow-[0_0_60px_rgba(139,92,246,0.35)]",
          color,
          pulse,
        )}
        aria-hidden
      />
    </div>
  );
}
