"use client";

import type { LiveStatus } from "@/lib/use-live-conversation";

type Palette = {
  accent: string;
  accentSoft: string;
  ink: string;
  ambient: string;
};

const PALETTES: Record<LiveStatus, Palette> = {
  idle: {
    accent: "#8B5CF6",
    accentSoft: "rgba(139, 92, 246, 0.35)",
    ink: "#1A1A1A",
    ambient: "radial-gradient(closest-side, rgba(139,92,246,0.08) 0%, rgba(139,92,246,0) 70%)",
  },
  connecting: {
    accent: "#8B5CF6",
    accentSoft: "rgba(139, 92, 246, 0.45)",
    ink: "#1A1A1A",
    ambient: "radial-gradient(closest-side, rgba(139,92,246,0.12) 0%, rgba(139,92,246,0) 70%)",
  },
  listening: {
    accent: "#8B5CF6",
    accentSoft: "rgba(139, 92, 246, 0.55)",
    ink: "#1A1A1A",
    ambient: "radial-gradient(closest-side, rgba(139,92,246,0.18) 0%, rgba(139,92,246,0) 70%)",
  },
  speaking: {
    accent: "#F5A623",
    accentSoft: "rgba(245, 166, 35, 0.55)",
    ink: "#1A1A1A",
    ambient: "radial-gradient(closest-side, rgba(245,166,35,0.18) 0%, rgba(245,166,35,0) 70%)",
  },
  paused: {
    accent: "#A0A0A0",
    accentSoft: "rgba(160, 160, 160, 0.4)",
    ink: "#1A1A1A",
    ambient: "radial-gradient(closest-side, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0) 70%)",
  },
  error: {
    accent: "#C65A5F",
    accentSoft: "rgba(198, 90, 95, 0.5)",
    ink: "#1A1A1A",
    ambient: "radial-gradient(closest-side, rgba(198,90,95,0.14) 0%, rgba(198,90,95,0) 70%)",
  },
};

type BarSpec = {
  id: number;
  x: number;
  baseHeight: number;
  delay: number;
};

// 18 vertical bars, symmetric envelope peaking in the center.
// Precomputed so the array is stable across renders.
const BAR_COUNT = 18;
const BAR_SPACING = 14; // px center-to-center
const BARS: BarSpec[] = Array.from({ length: BAR_COUNT }, (_, i) => {
  const centerIdx = (BAR_COUNT - 1) / 2;
  const distance = Math.abs(i - centerIdx);
  // envelope: center bars tall, edges short
  const envelope = Math.cos((distance / centerIdx) * (Math.PI / 2));
  const baseHeight = 18 + envelope * 62; // 18px .. 80px
  return {
    id: i,
    x: (i - centerIdx) * BAR_SPACING,
    baseHeight,
    delay: distance * 0.06 + (i % 2 === 0 ? 0 : 0.03),
  };
});

export function LiveOrb({ status }: { status: LiveStatus }) {
  const p = PALETTES[status];

  const animName =
    status === "speaking"
      ? "waveform-fast"
      : status === "listening"
      ? "waveform-slow"
      : status === "connecting"
      ? "waveform-slow"
      : status === "paused"
      ? ""
      : "waveform-idle";

  const animDuration =
    status === "speaking"
      ? "0.9s"
      : status === "listening"
      ? "1.8s"
      : status === "connecting"
      ? "2.4s"
      : "4.2s";

  return (
    <div className="relative flex h-[220px] w-[280px] items-center justify-center">
      <style>{`
        @keyframes waveform-idle {
          0%, 100% { transform: scaleY(0.88); }
          50%      { transform: scaleY(1.06); }
        }
        @keyframes waveform-slow {
          0%, 100% { transform: scaleY(0.62); }
          40%      { transform: scaleY(1.1); }
          60%      { transform: scaleY(0.82); }
        }
        @keyframes waveform-fast {
          0%, 100% { transform: scaleY(0.5); }
          25%      { transform: scaleY(1.2); }
          55%      { transform: scaleY(0.7); }
          80%      { transform: scaleY(1.05); }
        }
      `}</style>

      {/* Ambient wash behind waveform */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 transition-opacity duration-[900ms] ease-[cubic-bezier(0.32,0.72,0,1)]"
        style={{ background: p.ambient }}
      />

      {/* Upper hairline rule — editorial framing */}
      <div
        aria-hidden
        className="absolute left-1/2 top-0 h-px w-[180px] -translate-x-1/2"
        style={{
          background: `linear-gradient(90deg, transparent 0%, ${p.accentSoft} 50%, transparent 100%)`,
        }}
      />

      {/* Lower hairline rule */}
      <div
        aria-hidden
        className="absolute left-1/2 bottom-0 h-px w-[180px] -translate-x-1/2"
        style={{
          background: `linear-gradient(90deg, transparent 0%, ${p.accentSoft} 50%, transparent 100%)`,
        }}
      />

      {/* Monogram dot — subtle focal point */}
      <div
        aria-hidden
        className="absolute h-[5px] w-[5px] rounded-full transition-colors duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]"
        style={{
          backgroundColor: p.accent,
          boxShadow: `0 0 12px ${p.accentSoft}`,
          top: "50%",
          transform: "translateY(-50%)",
        }}
      />

      {/* Waveform bars */}
      <div className="relative flex h-[120px] items-center justify-center">
        {BARS.map((b) => (
          <span
            key={b.id}
            aria-hidden
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              transform: `translate(calc(-50% + ${b.x}px), -50%)`,
              width: "3px",
              height: `${b.baseHeight}px`,
              borderRadius: "2px",
              backgroundColor: p.accent,
              opacity: status === "paused" ? 0.3 : 0.92,
              transformOrigin: "center",
              animation:
                status === "paused"
                  ? "none"
                  : `${animName} ${animDuration} cubic-bezier(0.45, 0, 0.55, 1) ${b.delay}s infinite`,
              willChange: "transform",
              transition:
                "background-color 500ms cubic-bezier(0.32,0.72,0,1), opacity 400ms cubic-bezier(0.32,0.72,0,1)",
            }}
          />
        ))}
        {/* Mirror bars with low opacity for depth — same shape, faded */}
        {BARS.map((b) => (
          <span
            key={`shadow-${b.id}`}
            aria-hidden
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              transform: `translate(calc(-50% + ${b.x}px), -50%)`,
              width: "3px",
              height: `${b.baseHeight * 1.35}px`,
              borderRadius: "2px",
              backgroundColor: p.accent,
              opacity: status === "paused" ? 0.06 : 0.12,
              filter: "blur(6px)",
              transformOrigin: "center",
              animation:
                status === "paused"
                  ? "none"
                  : `${animName} ${animDuration} cubic-bezier(0.45, 0, 0.55, 1) ${b.delay}s infinite`,
              willChange: "transform",
              zIndex: -1,
            }}
          />
        ))}
      </div>
    </div>
  );
}
