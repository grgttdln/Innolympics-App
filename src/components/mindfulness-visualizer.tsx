'use client';

import { useCallback, useEffect, useState } from 'react';

type Phase = 'inhale' | 'exhale';

const PHASE_MS = 4000;
const SESSION_SECONDS = 120;

function formatTime(s: number) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function MindfulnessVisualizer() {
  const [started, setStarted] = useState(false);
  const [phase, setPhase] = useState<Phase>('inhale');
  const [timeLeft, setTimeLeft] = useState(SESSION_SECONDS);
  const [done, setDone] = useState(false);

  const reset = useCallback(() => {
    setStarted(false);
    setPhase('inhale');
    setTimeLeft(SESSION_SECONDS);
    setDone(false);
  }, []);

  useEffect(() => {
    if (!started || done) return;
    const phaseTimer = setInterval(() => {
      setPhase(p => (p === 'inhale' ? 'exhale' : 'inhale'));
    }, PHASE_MS);
    return () => clearInterval(phaseTimer);
  }, [started, done]);

  useEffect(() => {
    if (!started || done) return;
    const countdown = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { setDone(true); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(countdown);
  }, [started, done]);

  /* ── Ready screen ─────────────────────────────────────────── */
  if (!started) {
    return (
      <section className="flex w-full flex-col items-center gap-6 px-1">
        <p className="text-center text-[14px] leading-relaxed text-[#9B8AB0]">
          Find a quiet moment, relax your shoulders, and follow the circle.
          Press begin when you&apos;re ready.
        </p>
        <button
          onClick={() => setStarted(true)}
          className="w-full rounded-[18px] bg-[#A881C2] py-4 text-[16px] font-semibold text-white shadow-[0_4px_20px_rgba(168,129,194,0.35)] transition-all active:scale-[0.97]"
        >
          I&apos;m ready — Begin
        </button>
      </section>
    );
  }

  /* ── Done screen ──────────────────────────────────────────── */
  if (done) {
    return (
      <section className="flex w-full flex-col items-center gap-6 px-1 text-center">
        <div
          className="h-28 w-28 rounded-full"
          style={{
            backgroundColor: '#A881C2',
            boxShadow: '0 0 40px 10px rgba(168,129,194,0.2)',
          }}
        />
        <p className="text-[24px] font-semibold text-[#3B1F5E]">Well done.</p>
        <p className="text-[14px] text-[#9B8AB0]">
          You completed your 2-minute mindfulness reset.
        </p>
        <button
          onClick={reset}
          className="rounded-[18px] bg-[#A881C2] px-8 py-3 text-[15px] font-semibold text-white shadow-[0_4px_20px_rgba(168,129,194,0.3)] transition-all active:scale-[0.97]"
        >
          Go again
        </button>
      </section>
    );
  }

  /* ── Active session ───────────────────────────────────────── */
  const isInhale = phase === 'inhale';

  return (
    <section className="flex w-full flex-col items-center gap-8">
      {/* Timer */}
      <p
        className="text-[13px] font-medium uppercase tracking-[3px]"
        style={{ color: '#C4A8E0' }}
      >
        {formatTime(timeLeft)}
      </p>

      {/* Breathing circle */}
      <div className="relative flex items-center justify-center">
        {/* Soft ambient halo */}
        <div
          className="absolute rounded-full"
          style={{
            width: 270,
            height: 270,
            backgroundColor: '#A881C2',
            opacity: isInhale ? 0.09 : 0.03,
            transition: `opacity ${PHASE_MS}ms ease-in-out`,
          }}
        />

        {/* Main circle */}
        <div
          className="relative flex items-center justify-center rounded-full"
          style={{
            width: 210,
            height: 210,
            backgroundColor: '#A881C2',
            transform: isInhale ? 'scale(1)' : 'scale(0.72)',
            boxShadow: isInhale
              ? '0 0 56px 18px rgba(168,129,194,0.28)'
              : '0 0 16px 4px rgba(168,129,194,0.10)',
            transition: `transform ${PHASE_MS}ms ease-in-out, box-shadow ${PHASE_MS}ms ease-in-out`,
          }}
        >
          <span
            className="select-none text-[17px] font-medium text-white"
            style={{
              opacity: isInhale ? 1 : 0.75,
              transition: 'opacity 600ms ease-in-out',
            }}
          >
            {isInhale ? 'Breathe in...' : 'Breathe out...'}
          </span>
        </div>
      </div>

      <button
        onClick={reset}
        className="text-[13px] text-[#C4A8E0] underline-offset-2 hover:underline"
      >
        End session
      </button>
    </section>
  );
}
