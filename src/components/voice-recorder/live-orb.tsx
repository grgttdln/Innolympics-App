"use client";

import type { LiveStatus } from "@/lib/use-live-conversation";

const ACCENTS: Record<LiveStatus, string> = {
  idle: "#8B5CF6",
  connecting: "#8B5CF6",
  listening: "#8B5CF6",
  speaking: "#F5A623",
  paused: "#A0A0A0",
  error: "#C65A5F",
};

const BAR_COUNT = 16;
const BAR_SPACING = 12;
const BAR_WIDTH = 3;

type Bar = { x: number; h: number; delay: number };

const BARS: Bar[] = Array.from({ length: BAR_COUNT }, (_, i) => {
  const centerIdx = (BAR_COUNT - 1) / 2;
  const distance = Math.abs(i - centerIdx) / centerIdx;
  const envelope = Math.cos(distance * (Math.PI / 2));
  return {
    x: (i - centerIdx) * BAR_SPACING,
    h: 16 + envelope * 56,
    delay: Math.abs(i - centerIdx) * 0.05,
  };
});

export function LiveOrb({ status }: { status: LiveStatus }) {
  const accent = ACCENTS[status];
  const paused = status === "paused";

  const animName =
    status === "speaking"
      ? "wave-fast"
      : status === "listening" || status === "connecting"
      ? "wave-med"
      : "wave-idle";

  const animDuration =
    status === "speaking" ? "0.9s" : status === "listening" ? "1.8s" : "3.6s";

  return (
    <div className="relative flex h-[160px] w-[260px] items-center justify-center">
      <style>{`
        @keyframes wave-idle { 0%,100% { transform: scaleY(0.85); } 50% { transform: scaleY(1.05); } }
        @keyframes wave-med  { 0%,100% { transform: scaleY(0.55); } 45% { transform: scaleY(1.08); } }
        @keyframes wave-fast { 0%,100% { transform: scaleY(0.45); } 30% { transform: scaleY(1.2); } 65% { transform: scaleY(0.7); } }
      `}</style>

      {BARS.map((b, i) => (
        <span
          key={i}
          aria-hidden
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            marginLeft: b.x - BAR_WIDTH / 2,
            marginTop: -b.h / 2,
            width: `${BAR_WIDTH}px`,
            height: `${b.h}px`,
            borderRadius: "2px",
            backgroundColor: accent,
            opacity: paused ? 0.3 : 0.95,
            transformOrigin: "center",
            animation: paused
              ? "none"
              : `${animName} ${animDuration} cubic-bezier(0.45, 0, 0.55, 1) ${b.delay}s infinite`,
            transition:
              "background-color 500ms cubic-bezier(0.32,0.72,0,1), opacity 400ms cubic-bezier(0.32,0.72,0,1)",
            willChange: "transform",
          }}
        />
      ))}
    </div>
  );
}
