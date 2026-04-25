'use client';

import { useEffect, useMemo, useState } from 'react';

type BreathPhase = {
  label: string;
  durationMs: number;
};

type BreathingVisualizerProps = {
  mode: 'box' | 'circle';
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

function getCycleDuration(pattern: readonly BreathPhase[]): number {
  return pattern.reduce((sum, phase) => sum + phase.durationMs, 0);
}

function getCurrentPhase(
  pattern: readonly BreathPhase[],
  elapsedInCycleMs: number
): {
  phase: BreathPhase;
  phaseIndex: number;
  phaseProgress: number;
  cycleProgress: number;
  remainingMs: number;
} {
  const cycleDuration = getCycleDuration(pattern);
  const cycleProgress = elapsedInCycleMs / cycleDuration;

  let offset = 0;

  for (let index = 0; index < pattern.length; index += 1) {
    const phase = pattern[index];
    const phaseStart = offset;
    const phaseEnd = phaseStart + phase.durationMs;

    if (elapsedInCycleMs >= phaseStart && elapsedInCycleMs < phaseEnd) {
      const phaseProgress = (elapsedInCycleMs - phaseStart) / phase.durationMs;
      const remainingMs = phase.durationMs - (elapsedInCycleMs - phaseStart);
      return { phase, phaseIndex: index, phaseProgress, cycleProgress, remainingMs };
    }

    offset = phaseEnd;
  }

  const fallbackIndex = pattern.length - 1;
  return {
    phase: pattern[fallbackIndex],
    phaseIndex: fallbackIndex,
    phaseProgress: 1,
    cycleProgress: 1,
    remainingMs: 0,
  };
}

function usePrefersReducedMotion(): boolean {
  const [prefers, setPrefers] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefers(mq.matches);
    const handler = (event: MediaQueryListEvent) => setPrefers(event.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return prefers;
}

function PhaseDots({
  count,
  activeIndex,
}: {
  count: number;
  activeIndex: number;
}) {
  return (
    <div className="flex items-center gap-2" aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <span
          key={i}
          className={`h-1.5 rounded-full transition-all duration-300 ${
            i === activeIndex ? 'w-6 bg-[#5B3D78]' : 'w-1.5 bg-[#E9DAF2]'
          }`}
        />
      ))}
    </div>
  );
}

export function BreathingVisualizer({ mode }: BreathingVisualizerProps) {
  const pattern = mode === 'box' ? BOX_PATTERN : CIRCLE_PATTERN;
  const cycleDuration = useMemo(() => getCycleDuration(pattern), [pattern]);
  const [elapsedMs, setElapsedMs] = useState(0);
  const prefersReducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    if (prefersReducedMotion) {
      setElapsedMs(0);
      return;
    }

    const start = performance.now();
    let rafId = 0;

    const loop = (now: number) => {
      setElapsedMs((now - start) % cycleDuration);
      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [cycleDuration, prefersReducedMotion]);

  const { phase, phaseIndex, phaseProgress, cycleProgress, remainingMs } = getCurrentPhase(
    pattern,
    elapsedMs
  );
  const secondsLeft = Math.max(1, Math.ceil(remainingMs / 1000));

  if (mode === 'box') {
    const size = 272;
    const stroke = 6;
    const inset = stroke / 2;
    const radius = 36;
    const innerSize = size - stroke;
    const perimeter = 4 * innerSize - 8 * radius + 2 * Math.PI * radius;
    const drawn = cycleProgress * perimeter;

    return (
      <section
        aria-label="Box breathing guide, four by four cadence"
        className="flex w-full flex-col items-center gap-6"
      >
        <div
          className="relative"
          style={{ width: `${size}px`, height: `${size}px` }}
        >
          <div className="absolute inset-4 rounded-[28px] bg-gradient-to-br from-[#FFFFFF] to-[#F5EEE4] shadow-[0_1px_2px_rgba(91,61,120,0.06),0_18px_40px_-20px_rgba(91,61,120,0.25)]" />
          <div className="absolute inset-8 rounded-[22px] border border-[#F1E4D0]" />

          <svg
            className="absolute inset-0 h-full w-full"
            viewBox={`0 0 ${size} ${size}`}
            aria-hidden
          >
            <rect
              x={inset}
              y={inset}
              width={innerSize}
              height={innerSize}
              rx={radius}
              fill="none"
              stroke="#EFE2F3"
              strokeWidth={stroke}
            />
            <rect
              x={inset}
              y={inset}
              width={innerSize}
              height={innerSize}
              rx={radius}
              fill="none"
              stroke="url(#box-stroke)"
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={perimeter}
              strokeDashoffset={prefersReducedMotion ? 0 : perimeter - drawn}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
              style={{
                transition: prefersReducedMotion
                  ? undefined
                  : 'stroke-dashoffset 80ms linear',
              }}
            />
            <defs>
              <linearGradient id="box-stroke" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#A881C2" />
                <stop offset="100%" stopColor="#5B3D78" />
              </linearGradient>
            </defs>
          </svg>

          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span
              aria-live="polite"
              className="text-[36px] font-bold leading-none text-[#2A2A2A]"
            >
              {phase.label}
            </span>
            <span className="pt-4 text-[56px] font-semibold leading-none text-[#5B3D78] tabular-nums">
              {secondsLeft}
            </span>
            <span className="pt-2 text-[10px] font-semibold uppercase tracking-[2px] text-[#B8A8C4]">
              seconds
            </span>
          </div>
        </div>

        <p className="text-[13px] leading-normal text-[#8A8274]">
          Four seconds each side. Follow the line.
        </p>
      </section>
    );
  }

  const radiusPx = 112;
  const innerSize = 180;
  const inhaleProgress =
    phase.label === 'Inhale'
      ? phaseProgress
      : phase.label === 'Hold'
      ? 1
      : 1 - phaseProgress;
  const circleScale = 0.85 + inhaleProgress * 0.15;

  return (
    <section
      aria-label="Calming breathing circle"
      className="flex w-full flex-col items-center gap-6"
    >
      <div
        className="relative grid place-items-center"
        style={{
          width: `${radiusPx * 2 + 24}px`,
          height: `${radiusPx * 2 + 24}px`,
        }}
      >
        <div
          className="absolute rounded-full border border-[#E9DAF2]"
          style={{
            width: `${radiusPx * 2 + 24}px`,
            height: `${radiusPx * 2 + 24}px`,
          }}
        />

        <div
          className="grid place-items-center rounded-full bg-[#5B3D78] text-center"
          style={{
            width: `${innerSize}px`,
            height: `${innerSize}px`,
            transform: prefersReducedMotion ? undefined : `scale(${circleScale})`,
          }}
        >
          <div className="flex flex-col items-center">
            <span
              aria-live="polite"
              className="text-[36px] font-bold leading-none text-white"
            >
              {phase.label}
            </span>
            <span className="pt-2 text-[12px] font-semibold text-[#E9DAF2] tabular-nums">
              {secondsLeft}s
            </span>
          </div>
        </div>
      </div>

      <PhaseDots count={CIRCLE_PATTERN.length} activeIndex={phaseIndex} />
    </section>
  );
}
