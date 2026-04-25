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

function getCurrentPhase(pattern: readonly BreathPhase[], elapsedInCycleMs: number): {
  phase: BreathPhase;
  phaseProgress: number;
  cycleProgress: number;
} {
  const cycleDuration = getCycleDuration(pattern);
  const cycleProgress = elapsedInCycleMs / cycleDuration;

  let offset = 0;

  for (const phase of pattern) {
    const phaseStart = offset;
    const phaseEnd = phaseStart + phase.durationMs;

    if (elapsedInCycleMs >= phaseStart && elapsedInCycleMs < phaseEnd) {
      const phaseProgress = (elapsedInCycleMs - phaseStart) / phase.durationMs;
      return { phase, phaseProgress, cycleProgress };
    }

    offset = phaseEnd;
  }

  const fallbackPhase = pattern[pattern.length - 1];
  return {
    phase: fallbackPhase,
    phaseProgress: 1,
    cycleProgress: 1,
  };
}

function getSquarePoint(progress: number, size: number, inset: number): PositionedPoint {
  const side = size - inset * 2;
  const perimeter = side * 4;
  const distance = progress * perimeter;

  if (distance <= side) {
    return { x: inset + distance, y: inset };
  }

  if (distance <= side * 2) {
    return { x: size - inset, y: inset + (distance - side) };
  }

  if (distance <= side * 3) {
    return { x: size - inset - (distance - side * 2), y: size - inset };
  }

  return { x: inset, y: size - inset - (distance - side * 3) };
}

export function BreathingVisualizer({ mode }: BreathingVisualizerProps) {
  const pattern = mode === 'box' ? BOX_PATTERN : CIRCLE_PATTERN;
  const cycleDuration = useMemo(() => getCycleDuration(pattern), [pattern]);
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    const start = Date.now();
    const timer = setInterval(() => {
      const delta = Date.now() - start;
      setElapsedMs(delta % cycleDuration);
    }, TICK_MS);

    return () => clearInterval(timer);
  }, [cycleDuration]);

  const { phase, phaseProgress, cycleProgress } = getCurrentPhase(pattern, elapsedMs);

  if (mode === 'box') {
    const size = 280;
    const inset = 22;
    const dot = getSquarePoint(cycleProgress, size, inset);

    return (
      <section
        aria-label="Animated box breathing guide"
        className="flex w-full max-w-[320px] flex-col items-center gap-4"
      >
        <div className="text-center">
          <p className="text-[28px] font-semibold leading-tight text-[#5B6395]">
            Pause. Breathe.
          </p>
          <p className="pt-1 text-[14px] text-[#7D82A8]">4-4-4-4 cadence</p>
        </div>

        <div
          className="relative"
          style={{ width: `${size}px`, height: `${size}px` }}
        >
          <div className="absolute inset-0 rounded-[28px] border-14 border-[#2F3568]" />
          <div className="absolute inset-9 rounded-[12px] border border-[#4A548E]/40" />

          <div
            className="absolute left-0 top-0 h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#CCC1FF] shadow-[0_0_0_3px_rgba(204,193,255,0.28)]"
            style={{ transform: `translate(${dot.x}px, ${dot.y}px)` }}
            aria-hidden
          />

          <div className="absolute inset-0 flex items-center justify-center px-10 text-center">
            <span className="text-[48px] font-semibold leading-none text-[#3C457E]">
              {phase.label}
            </span>
          </div>
        </div>
      </section>
    );
  }

  const radiusPx = 112;
  const innerSize = 180;
  const ringWidth = 12;
  const inhaleProgress = phase.label === 'Inhale' ? phaseProgress : phase.label === 'Hold' ? 1 : 0;
  const circleScale = 0.84 + inhaleProgress * 0.16;

  return (
    <section
      aria-label="Animated calming breathing circle"
      className="flex w-full max-w-[320px] flex-col items-center gap-4"
    >
      <div className="text-center">
        <p className="text-[28px] font-semibold leading-tight text-[#5B6395]">
          Settle your breath.
        </p>
        <p className="pt-1 text-[14px] text-[#7D82A8]">4s inhale, 2s hold, 6s exhale</p>
      </div>

      <div
        className="relative grid place-items-center rounded-full"
        style={{ width: `${radiusPx * 2 + ringWidth * 2}px`, height: `${radiusPx * 2 + ringWidth * 2}px` }}
      >
        <div
          className="absolute rounded-full border-12 border-[#CFC3FF]"
          style={{
            width: `${radiusPx * 2 + ringWidth}px`,
            height: `${radiusPx * 2 + ringWidth}px`,
          }}
        />

        <div
          className="grid place-items-center rounded-full bg-[#3A4279] text-center transition-transform"
          style={{
            width: `${innerSize}px`,
            height: `${innerSize}px`,
            transform: `scale(${circleScale})`,
          }}
        >
          <span className="px-6 text-[48px] font-semibold leading-[1.05] text-[#EEF0FF]">
            {phase.label}
          </span>
        </div>
      </div>
    </section>
  );
}