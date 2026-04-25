'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type Phase = 'inhale' | 'hold' | 'exhale';

type PhaseSpec = {
  id: Phase;
  label: string;
  cue: string;
  durationMs: number;
};

const PATTERN: readonly PhaseSpec[] = [
  { id: 'inhale', label: 'Inhale', cue: 'Breathe in, slowly', durationMs: 4000 },
  { id: 'hold', label: 'Hold', cue: 'Pause. Let it settle', durationMs: 2000 },
  { id: 'exhale', label: 'Exhale', cue: 'Release, soften', durationMs: 6000 },
] as const;

const CYCLE_MS = PATTERN.reduce((n, p) => n + p.durationMs, 0);
const SESSION_SECONDS = 120;
const TICK_MS = 80;

const EASE = 'cubic-bezier(0.16, 1, 0.3, 1)';

function formatClock(total: number): string {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function getPhaseFromCycle(elapsedMs: number): { spec: PhaseSpec; phaseProgress: number } {
  let offset = 0;
  for (const spec of PATTERN) {
    if (elapsedMs < offset + spec.durationMs) {
      return { spec, phaseProgress: (elapsedMs - offset) / spec.durationMs };
    }
    offset += spec.durationMs;
  }
  const last = PATTERN[PATTERN.length - 1];
  return { spec: last, phaseProgress: 1 };
}

function PlayIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M8 5.14v13.72a1 1 0 0 0 1.54.84l10.5-6.86a1 1 0 0 0 0-1.68L9.54 4.3A1 1 0 0 0 8 5.14Z" />
    </svg>
  );
}

function PauseIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <rect x="6" y="5" width="4" height="14" rx="1.2" />
      <rect x="14" y="5" width="4" height="14" rx="1.2" />
    </svg>
  );
}

function RestartIcon({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3 12a9 9 0 1 0 3.2-6.9" />
      <path d="M3 4v5h5" />
    </svg>
  );
}

export function MindfulnessVisualizer() {
  const [started, setStarted] = useState(false);
  const [paused, setPaused] = useState(false);
  const [done, setDone] = useState(false);

  const [elapsedCycleMs, setElapsedCycleMs] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(SESSION_SECONDS);

  const lastTickRef = useRef<number | null>(null);

  const reset = useCallback(() => {
    setStarted(false);
    setPaused(false);
    setDone(false);
    setElapsedCycleMs(0);
    setSecondsLeft(SESSION_SECONDS);
    lastTickRef.current = null;
  }, []);

  useEffect(() => {
    if (!started || done || paused) {
      lastTickRef.current = null;
      return;
    }
    const timer = setInterval(() => {
      const now = Date.now();
      const last = lastTickRef.current ?? now;
      const delta = now - last;
      lastTickRef.current = now;

      setElapsedCycleMs((prev) => (prev + delta) % CYCLE_MS);
      setSecondsLeft((prev) => {
        const next = prev - delta / 1000;
        if (next <= 0) {
          setDone(true);
          return 0;
        }
        return next;
      });
    }, TICK_MS);
    return () => clearInterval(timer);
  }, [started, done, paused]);

  const { spec, phaseProgress } = useMemo(
    () => getPhaseFromCycle(elapsedCycleMs),
    [elapsedCycleMs],
  );

  const sessionProgress = useMemo(
    () => 1 - secondsLeft / SESSION_SECONDS,
    [secondsLeft],
  );

  const orbScale = useMemo(() => {
    if (spec.id === 'inhale') return 0.78 + phaseProgress * 0.22;
    if (spec.id === 'hold') return 1;
    return 1 - phaseProgress * 0.22;
  }, [spec.id, phaseProgress]);

  const haloOpacity = useMemo(() => {
    if (spec.id === 'inhale') return 0.08 + phaseProgress * 0.14;
    if (spec.id === 'hold') return 0.22;
    return 0.22 - phaseProgress * 0.16;
  }, [spec.id, phaseProgress]);

  const ringCircumference = 2 * Math.PI * 124;
  const ringOffset = ringCircumference * (1 - sessionProgress);

  if (!started) {
    return (
      <section
        aria-label="Mindfulness session introduction"
        className="flex w-full flex-1 flex-col justify-between gap-4 pt-1"
      >
        <div className="flex items-start justify-between" aria-hidden>
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-[2.4px] text-[#A881C2]">
              2 minute reset
            </span>
            <span className="text-[22px] font-semibold leading-none tracking-tight text-[#2A2A2A]">
              Ready?
            </span>
          </div>
          <div className="h-10 w-[88px]" />
        </div>

        <button
          type="button"
          onClick={() => setStarted(true)}
          aria-label="Begin mindfulness session"
          className="group relative mx-auto flex h-[300px] w-[300px] items-center justify-center rounded-full transition-transform duration-300 active:scale-[0.97]"
          style={{ transitionTimingFunction: EASE }}
        >
          <span
            className="absolute inset-12 rounded-full bg-[#A881C2]/12 blur-[22px] transition-opacity duration-500 group-hover:opacity-90"
            aria-hidden
          />
          <span
            className="absolute rounded-full bg-[#A881C2]/22"
            style={{
              width: 210,
              height: 210,
              animation: 'tala-mindful-idle 6.5s ease-in-out infinite',
            }}
            aria-hidden
          />
          <span
            className="relative flex items-center justify-center rounded-full bg-[#5B3D78] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_28px_50px_-22px_rgba(91,61,120,0.6)]"
            style={{
              width: 172,
              height: 172,
              animation: 'tala-mindful-idle 6.5s ease-in-out infinite',
            }}
          >
            <span className="flex flex-col items-center gap-1.5">
              <PlayIcon size={24} />
              <span className="text-[10px] font-semibold uppercase tracking-[2.2px] text-[#E6D7F3]">
                Tap to begin
              </span>
            </span>
          </span>
        </button>

        <div className="flex flex-col items-center gap-1.5 pb-10 text-center">
          <p className="text-[14px] font-medium leading-snug text-[#2A2A2A]">
            Let your shoulders drop.
          </p>
          <p className="text-[11.5px] font-medium uppercase tracking-[2px] text-[#A881C2]">
            4 &middot; 2 &middot; 6 cadence
          </p>
        </div>

        <MindfulnessKeyframes />
      </section>
    );
  }

  if (done) {
    return (
      <section
        aria-label="Mindfulness session complete"
        className="flex w-full flex-1 flex-col justify-between gap-6"
      >
        <div className="flex flex-1 flex-col items-center justify-center gap-7">
          <div className="relative flex h-[220px] w-[220px] items-center justify-center">
            <span
              className="absolute inset-0 rounded-full bg-[#A881C2]/15 blur-[22px]"
              aria-hidden
            />
            <span
              className="absolute inset-6 rounded-full bg-[#A881C2]/30"
              style={{ animation: 'tala-mindful-complete 4s ease-in-out infinite' }}
              aria-hidden
            />
            <span
              className="relative flex h-[130px] w-[130px] items-center justify-center rounded-full bg-[#5B3D78] shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_20px_38px_-16px_rgba(91,61,120,0.6)]"
            >
              <svg
                width="34"
                height="34"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#F6EEFF"
                strokeWidth={2.2}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </span>
          </div>

          <div className="flex flex-col items-center gap-1.5 text-center">
            <span className="text-[11px] font-semibold uppercase tracking-[2.4px] text-[#A881C2]">
              Session complete
            </span>
            <p className="text-[22px] font-semibold leading-tight tracking-tight text-[#2A2A2A]">
              Nicely done.
            </p>
            <p className="max-w-[260px] text-[13.5px] leading-relaxed text-[#6E6878]">
              Two minutes lighter. Carry this breath with you.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={reset}
            className="flex items-center justify-center gap-2 rounded-[18px] border border-[#E9DAF2] bg-white py-[14px] text-[14px] font-semibold text-[#2A2A2A] transition-all duration-200 active:translate-y-[1px] active:scale-[0.985]"
            style={{ transitionTimingFunction: EASE }}
          >
            <RestartIcon size={14} />
            Another round
          </button>
          <Link
            href="/wellness"
            className="flex items-center justify-center rounded-[18px] bg-[#2A2A2A] py-[14px] text-[14px] font-semibold text-white shadow-[0_10px_28px_-12px_rgba(42,42,42,0.5)] transition-all duration-200 active:translate-y-[1px] active:scale-[0.985]"
            style={{ transitionTimingFunction: EASE }}
          >
            Done for now
          </Link>
        </div>

        <MindfulnessKeyframes />
      </section>
    );
  }

  return (
    <section
      aria-label="Mindfulness session in progress"
      className="flex w-full flex-1 flex-col justify-between gap-4 pt-1"
    >
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-semibold uppercase tracking-[2.2px] text-[#A881C2]">
            Remaining
          </span>
          <span className="font-mono text-[22px] font-semibold leading-none tracking-tight text-[#2A2A2A] tabular-nums">
            {formatClock(Math.ceil(secondsLeft))}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPaused((p) => !p)}
            aria-label={paused ? 'Resume session' : 'Pause session'}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[#E9DAF2] bg-white text-[#2A2A2A] transition-all duration-200 active:scale-[0.94]"
            style={{ transitionTimingFunction: EASE }}
          >
            {paused ? <PlayIcon size={14} /> : <PauseIcon size={14} />}
          </button>
          <button
            type="button"
            onClick={reset}
            aria-label="End session"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[#E9DAF2] bg-white text-[#6E6878] transition-all duration-200 active:scale-[0.94]"
            style={{ transitionTimingFunction: EASE }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.2}
              strokeLinecap="round"
              aria-hidden
            >
              <path d="M6 6l12 12" />
              <path d="M18 6 6 18" />
            </svg>
          </button>
        </div>
      </div>

      <div className="relative mx-auto flex h-[300px] w-[300px] items-center justify-center">
        <svg
          className="absolute inset-0 -rotate-90"
          viewBox="0 0 280 280"
          width="300"
          height="300"
          aria-hidden
        >
          <circle cx="140" cy="140" r="124" fill="none" stroke="#EFE6F7" strokeWidth="2" />
          <circle
            cx="140"
            cy="140"
            r="124"
            fill="none"
            stroke="#5B3D78"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeDasharray={ringCircumference}
            strokeDashoffset={ringOffset}
            style={{ transition: `stroke-dashoffset 320ms ${EASE}` }}
          />
        </svg>

        <span
          className="absolute inset-12 rounded-full bg-[#A881C2]"
          style={{
            opacity: haloOpacity,
            filter: 'blur(26px)',
            transition: `opacity 800ms ${EASE}, transform 800ms ${EASE}`,
            transform: `scale(${0.85 + phaseProgress * 0.12})`,
          }}
          aria-hidden
        />

        <span
          className="absolute rounded-full bg-[#A881C2]/22"
          style={{
            width: 210,
            height: 210,
            opacity: paused ? 0.2 : 0.55,
            transform: `scale(${orbScale * 0.96})`,
            transition: `transform ${Math.max(spec.durationMs - 200, 600)}ms ${EASE}, opacity 600ms ${EASE}`,
          }}
          aria-hidden
        />

        <span
          className="relative flex items-center justify-center rounded-full bg-[#5B3D78] shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_28px_50px_-22px_rgba(91,61,120,0.6)]"
          style={{
            width: 172,
            height: 172,
            transform: `scale(${orbScale})`,
            transition: `transform ${Math.max(spec.durationMs - 200, 600)}ms ${EASE}`,
          }}
        >
          <span className="flex flex-col items-center gap-1">
            <span
              key={spec.id}
              className="text-[20px] font-semibold leading-none tracking-tight text-white"
              style={{ animation: `tala-phase-fade 600ms ${EASE}` }}
            >
              {spec.label}
            </span>
            <span
              className="text-[10px] font-medium uppercase tracking-[2.2px] text-[#E6D7F3]"
            >
              {Math.max(1, Math.ceil(spec.durationMs / 1000 - phaseProgress * (spec.durationMs / 1000)))}
              s
            </span>
          </span>
        </span>
      </div>

      <div className="flex flex-col items-center gap-1.5 pb-10 text-center">
        <p
          key={`${spec.id}-cue`}
          className="text-[14px] font-medium leading-snug text-[#2A2A2A]"
          style={{ animation: `tala-phase-fade 700ms ${EASE}` }}
        >
          {spec.cue}
        </p>
        <p className="text-[11.5px] font-medium uppercase tracking-[2px] text-[#A881C2]">
          4 &middot; 2 &middot; 6 cadence
        </p>
      </div>

      <MindfulnessKeyframes />
    </section>
  );
}

const MINDFULNESS_KEYFRAMES = `
  @keyframes tala-mindful-idle {
    0%, 100% { transform: scale(0.92); opacity: 0.9; }
    50% { transform: scale(1.04); opacity: 1; }
  }
  @keyframes tala-mindful-complete {
    0%, 100% { transform: scale(1); opacity: 0.85; }
    50% { transform: scale(1.06); opacity: 1; }
  }
  @keyframes tala-phase-fade {
    0% { opacity: 0; transform: translateY(4px); }
    100% { opacity: 1; transform: translateY(0); }
  }
`;

function MindfulnessKeyframes() {
  return <style dangerouslySetInnerHTML={{ __html: MINDFULNESS_KEYFRAMES }} />;
}
