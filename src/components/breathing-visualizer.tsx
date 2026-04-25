'use client';

import { useEffect, useMemo, useState } from 'react';

type BreathPhase = {
  label: string;
  durationMs: number;
};

type BreathingVisualizerProps = {
  mode: 'box' | 'circle';
};

type PositionedPoint = {
  x: number;
  y: number;
};

const BOX_PATTERN: readonly BreathPhase[] = [
  { label: 'Inhale', durationMs: 4000 },
  { label: 'Hold', durationMs: 4000 },
  { label: 'Exhale', durationMs: 4000 },
  { label: 'Hold', durationMs: 4000 },
];

const CIRCLE_PATTERN: readonly BreathPhase[] = [
  { label: 'Inhale', durationMs: 4000 },
  { label: 'Hold', durationMs: 2000 },
  { label: 'Exhale', durationMs: 6000 },
];

const TICK_MS = 50;

function getCycleDuration(pattern: readonly BreathPhase[]): number {
  return pattern.reduce((sum, phase) => sum + phase.durationMs, 0);
}

function getCurrentPhase(
  pattern: readonly BreathPhase[],
  elapsedInCycleMs: number,
): { phase: BreathPhase; phaseProgress: number; cycleProgress: number } {
  const cycleDuration = getCycleDuration(pattern);
  const cycleProgress = elapsedInCycleMs / cycleDuration;
  let offset = 0;

  for (const phase of pattern) {
    const phaseEnd = offset + phase.durationMs;
    if (elapsedInCycleMs >= offset && elapsedInCycleMs < phaseEnd) {
      return {
        phase,
        phaseProgress: (elapsedInCycleMs - offset) / phase.durationMs,
        cycleProgress,
      };
    }
    offset = phaseEnd;
  }

  return { phase: pattern[pattern.length - 1], phaseProgress: 1, cycleProgress: 1 };
}

function getSquarePoint(progress: number, size: number, inset: number): PositionedPoint {
  const side = size - inset * 2;
  const perimeter = side * 4;
  const distance = progress * perimeter;

  if (distance <= side) return { x: inset + distance, y: inset };
  if (distance <= side * 2) return { x: size - inset, y: inset + (distance - side) };
  if (distance <= side * 3) return { x: size - inset - (distance - side * 2), y: size - inset };
  return { x: inset, y: size - inset - (distance - side * 3) };
}

export function BreathingVisualizer({ mode }: BreathingVisualizerProps) {
  const [started, setStarted] = useState(false);
  const pattern = mode === 'box' ? BOX_PATTERN : CIRCLE_PATTERN;
  const cycleDuration = useMemo(() => getCycleDuration(pattern), [pattern]);
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    if (!started) return;
    const start = Date.now();
    const timer = setInterval(() => {
      setElapsedMs((Date.now() - start) % cycleDuration);
    }, TICK_MS);
    return () => clearInterval(timer);
  }, [started, cycleDuration]);

  /* ── Ready screen ─────────────────────────────────────────────── */
  if (!started) {
    return (
      <section className="flex w-full flex-col items-center gap-6 px-1">
        <p className="text-center text-[14px] leading-relaxed text-[#9B8AB0]">
          Find a comfortable position and take a gentle breath. Press begin when you&apos;re ready.
        </p>

        <button
          onClick={() => setStarted(true)}
          className="w-full rounded-[18px] bg-[#7B5EA7] py-4 text-[16px] font-semibold text-white shadow-[0_4px_20px_rgba(123,94,167,0.35)] transition-all active:scale-[0.97]"
        >
          I&apos;m ready — Begin
        </button>
      </section>
    );
  }

  const { phase, phaseProgress, cycleProgress } = getCurrentPhase(pattern, elapsedMs);

  /* ── Box mode ─────────────────────────────────────────────────── */
  if (mode === 'box') {
    const size = 280;
    const inset = 22;
    const dot = getSquarePoint(cycleProgress, size, inset);

    return (
      <section
        aria-label="Animated box breathing guide"
        className="flex w-full max-w-[320px] flex-col items-center gap-4"
      >
        <div className="relative" style={{ width: `${size}px`, height: `${size}px` }}>
          {/* Main box border */}
          <div
            className="absolute inset-0 rounded-[28px] border-[3px] border-[#7B5EA7]"
            style={{ boxShadow: '0 0 32px rgba(123,94,167,0.15)' }}
          />
          {/* Inner subtle ring */}
          <div className="absolute inset-9 rounded-[12px] border border-[#C4A8E0]/40" />

          {/* Animated dot */}
          <div
            className="absolute h-7 w-7 rounded-full bg-[#D8C4F0]"
            style={{
              transform: `translate(${dot.x - 14}px, ${dot.y - 14}px)`,
              boxShadow: '0 0 0 4px rgba(216,196,240,0.3), 0 0 16px rgba(123,94,167,0.5)',
            }}
            aria-hidden
          />

          {/* Phase label */}
          <div className="absolute inset-0 flex items-center justify-center px-10 text-center">
            <span className="text-[48px] font-semibold leading-none text-[#7B5EA7]">
              {phase.label}
            </span>
          </div>
        </div>

        <button
          onClick={() => { setStarted(false); setElapsedMs(0); }}
          className="mt-1 text-[13px] text-[#C4A8E0] underline-offset-2 hover:underline"
        >
          End session
        </button>
      </section>
    );
  }

  /* ── Circle mode ──────────────────────────────────────────────── */
  const radiusPx = 112;
  const innerSize = 180;
  const ringWidth = 12;
  const inhaleProgress =
    phase.label === 'Inhale' ? phaseProgress : phase.label === 'Hold' ? 1 : 0;
  const circleScale = 0.84 + inhaleProgress * 0.16;

  return (
      <section
        aria-label="Animated calming breathing circle"
        className="flex w-full max-w-[320px] flex-col items-center gap-4"
      >
        <div
        className="relative grid place-items-center rounded-full"
        style={{
          width: `${radiusPx * 2 + ringWidth * 2}px`,
          height: `${radiusPx * 2 + ringWidth * 2}px`,
        }}
      >
        <div
          className="absolute rounded-full border-[3px] border-[#C4A8E0]"
          style={{
            width: `${radiusPx * 2 + ringWidth}px`,
            height: `${radiusPx * 2 + ringWidth}px`,
            boxShadow: '0 0 24px rgba(196,168,224,0.25)',
          }}
        />
        <div
          className="grid place-items-center rounded-full bg-[#7B5EA7] text-center transition-transform duration-300"
          style={{
            width: `${innerSize}px`,
            height: `${innerSize}px`,
            transform: `scale(${circleScale})`,
            boxShadow: '0 0 24px rgba(123,94,167,0.35)',
          }}
        >
          <span className="px-6 text-[48px] font-semibold leading-[1.05] text-white">
            {phase.label}
          </span>
        </div>
      </div>

      <button
        onClick={() => { setStarted(false); setElapsedMs(0); }}
        className="mt-1 text-[13px] text-[#C4A8E0] underline-offset-2 hover:underline"
      >
        End session
      </button>
    </section>
  );
}
