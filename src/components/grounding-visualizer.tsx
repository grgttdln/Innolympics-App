'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

type Sense = 'See' | 'Feel' | 'Hear' | 'Smell' | 'Taste';

const STEPS: readonly {
  number: number;
  sense: Sense;
  prompt: string;
  hint: string;
  placeholder: string;
}[] = [
  { number: 5, sense: 'See',   prompt: 'Name 5 things you can see.',   hint: 'Look around slowly — near and far.',       placeholder: 'e.g. a plant, the ceiling, my phone…' },
  { number: 4, sense: 'Feel',  prompt: 'Name 4 things you can feel.',  hint: 'Notice textures, temperature, weight.',     placeholder: 'e.g. the chair, my shirt, cool air…' },
  { number: 3, sense: 'Hear',  prompt: 'Name 3 things you can hear.',  hint: 'Listen for near sounds and distant ones.',  placeholder: 'e.g. the fan, birds, my breathing…' },
  { number: 2, sense: 'Smell', prompt: 'Name 2 things you can smell.', hint: 'Breathe slowly and notice the air.',        placeholder: 'e.g. coffee, fresh air…' },
  { number: 1, sense: 'Taste', prompt: 'Name 1 thing you can taste.',  hint: 'What lingers on your tongue right now?',    placeholder: 'e.g. mint, water…' },
] as const;

const EASE = 'cubic-bezier(0.16, 1, 0.3, 1)';

type SpeechRecognitionEvent = { results: { length: number; [k: number]: { [k: number]: { transcript: string } } } };
type SpeechRecognitionInstance = {
  continuous: boolean; interimResults: boolean; lang: string;
  onresult: (e: SpeechRecognitionEvent) => void;
  onerror: () => void; onend: () => void;
  start: () => void; stop: () => void;
};

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
  }
}

function MicIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );
}

function SendIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 12l16-8-6 18-3-7-7-3z" />
    </svg>
  );
}

function PlayIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M8 5.14v13.72a1 1 0 0 0 1.54.84l10.5-6.86a1 1 0 0 0 0-1.68L9.54 4.3A1 1 0 0 0 8 5.14Z" />
    </svg>
  );
}

function RestartIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 12a9 9 0 1 0 3.2-6.9" />
      <path d="M3 4v5h5" />
    </svg>
  );
}

function CheckIcon({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#F6EEFF" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export function GroundingVisualizer() {
  const [started, setStarted]     = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [visible, setVisible]     = useState(true);
  const [done, setDone]           = useState(false);

  const [userInput, setUserInput] = useState('');
  const [feedback, setFeedback]   = useState('');
  const [isValid, setIsValid]     = useState<boolean | null>(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [recording, setRecording] = useState(false);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const textareaRef    = useRef<HTMLTextAreaElement>(null);

  const step   = STEPS[stepIndex];
  const isLast = stepIndex === STEPS.length - 1;

  const clearStep = useCallback(() => {
    setUserInput('');
    setFeedback('');
    setIsValid(null);
    setLoadingAI(false);
    setRecording(false);
  }, []);

  const advance = useCallback(() => {
    clearStep();
    setVisible(false);
  }, [clearStep]);

  useEffect(() => {
    if (visible) return;
    const t = setTimeout(() => {
      if (stepIndex >= STEPS.length - 1) setDone(true);
      else setStepIndex(i => i + 1);
      setVisible(true);
    }, 260);
    return () => clearTimeout(t);
  }, [visible, stepIndex]);

  const reset = useCallback(() => {
    setStarted(false); setStepIndex(0);
    setVisible(true); setDone(false);
    clearStep();
  }, [clearStep]);

  const tryAgain = useCallback(() => {
    setFeedback('');
    setIsValid(null);
    setUserInput('');
    setTimeout(() => textareaRef.current?.focus(), 60);
  }, []);

  const toggleVoice = useCallback(() => {
    const SR = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!SR) { alert('Voice input is not supported in this browser.'); return; }

    if (recording) {
      const instance = recognitionRef.current;
      recognitionRef.current = null;
      instance?.stop();
      setRecording(false);
      return;
    }

    const r = new SR();
    r.continuous     = true;
    r.interimResults = false;
    r.lang           = 'en-US';

    r.onresult = (e) => {
      const results = Array.from({ length: e.results.length }, (_, i) => e.results[i][0].transcript);
      setUserInput(results.join(', '));
    };
    r.onerror = () => {
      recognitionRef.current = null;
      setRecording(false);
    };
    r.onend = () => {
      if (recognitionRef.current === r) {
        try { r.start(); } catch { recognitionRef.current = null; setRecording(false); }
      }
    };

    recognitionRef.current = r;
    r.start();
    setRecording(true);
  }, [recording]);

  const validate = useCallback(async () => {
    if (!userInput.trim() || loadingAI || feedback) return;
    setLoadingAI(true);
    try {
      const res  = await fetch('/api/grounding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sense: step.sense, userInput }),
      });
      const data = await res.json() as { isValid?: boolean; feedback?: string; error?: string };
      setIsValid(data.isValid ?? false);
      setFeedback(data.feedback ?? data.error ?? 'Something went wrong. Keep going.');
    } catch {
      setIsValid(null);
      setFeedback('Something went wrong. Keep going — you\'re doing great.');
    } finally {
      setLoadingAI(false);
    }
  }, [userInput, loadingAI, feedback, step]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      validate();
    }
  }, [validate]);

  /* ── Ready screen ─────────────────────────────────────────── */
  if (!started) {
    return (
      <section
        aria-label="Grounding session introduction"
        className="flex w-full flex-1 flex-col items-center justify-center gap-6 pt-1"
      >
        <div className="flex flex-col items-center gap-2 text-center">
          <span className="text-[10px] font-semibold uppercase tracking-[2.4px] text-[#A881C2]">
            5 · 4 · 3 · 2 · 1
          </span>
          <span className="text-[22px] font-semibold leading-none tracking-tight text-[#2A2A2A]">
            Ready?
          </span>
        </div>

        <div className="flex flex-col items-center gap-2 text-center">
          <p className="max-w-[280px] text-[16px] font-semibold leading-snug text-[#2A2A2A]">
            Anchor yourself in the present.
          </p>
          <p className="max-w-[260px] text-[13px] leading-relaxed text-[#6E6878]">
            Move through five senses, one step at a time. Type or speak what you notice.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setStarted(true)}
          className="mt-2 flex items-center justify-center gap-2 rounded-[18px] bg-[#5B3D78] px-8 py-[14px] text-[15px] font-semibold text-white shadow-[0_14px_32px_-14px_rgba(91,61,120,0.6)] transition-all duration-200 active:translate-y-[1px] active:scale-[0.985]"
          style={{ transitionTimingFunction: EASE }}
        >
          <PlayIcon size={14} />
          Begin grounding
        </button>

        <GroundingKeyframes />
      </section>
    );
  }

  /* ── Done screen ──────────────────────────────────────────── */
  if (done) {
    return (
      <section
        aria-label="Grounding session complete"
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
              style={{ animation: 'tala-grounding-complete 4s ease-in-out infinite' }}
              aria-hidden
            />
            <span className="relative flex h-[130px] w-[130px] items-center justify-center rounded-full bg-[#5B3D78] shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_20px_38px_-16px_rgba(91,61,120,0.6)]">
              <CheckIcon size={34} />
            </span>
          </div>

          <div className="flex flex-col items-center gap-1.5 text-center">
            <span className="text-[11px] font-semibold uppercase tracking-[2.4px] text-[#A881C2]">
              You&apos;re here
            </span>
            <p className="text-[22px] font-semibold leading-tight tracking-tight text-[#2A2A2A]">
              Nicely done.
            </p>
            <p className="max-w-[260px] text-[13.5px] leading-relaxed text-[#6E6878]">
              You moved through all five senses. Carry this stillness with you.
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
          <a
            href="/wellness"
            className="flex items-center justify-center rounded-[18px] bg-[#2A2A2A] py-[14px] text-[14px] font-semibold text-white shadow-[0_10px_28px_-12px_rgba(42,42,42,0.5)] transition-all duration-200 active:translate-y-[1px] active:scale-[0.985]"
            style={{ transitionTimingFunction: EASE }}
          >
            Done for now
          </a>
        </div>

        <GroundingKeyframes />
      </section>
    );
  }

  /* ── Active step ──────────────────────────────────────────── */
  const overlayOpen = !!feedback;

  return (
    <section
      aria-label="Grounding session in progress"
      className="relative flex w-full flex-1 flex-col gap-4 pt-1"
    >
      {/* Header */}
      <div
        className="flex items-center justify-between"
        style={{
          filter: overlayOpen ? 'blur(2px)' : 'none',
          opacity: overlayOpen ? 0.4 : 1,
          transition: 'filter 220ms ease, opacity 220ms ease',
        }}
      >
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-semibold uppercase tracking-[2.2px] text-[#A881C2]">
            {step.sense} · Step {stepIndex + 1} of {STEPS.length}
          </span>
          <span className="text-[22px] font-semibold leading-none tracking-tight text-[#2A2A2A] tabular-nums">
            {step.number} {step.number === 1 ? 'thing' : 'things'}
          </span>
        </div>

        <button
          type="button"
          onClick={advance}
          aria-label="Skip this step"
          className="flex h-10 items-center justify-center rounded-full border border-[#E9DAF2] bg-white px-3.5 text-[12px] font-semibold text-[#6E6878] transition-all duration-200 active:scale-[0.96]"
          style={{ transitionTimingFunction: EASE }}
        >
          Skip
        </button>
      </div>

      {/* Anchor + prompt + input, grouped and centered as one block */}
      <div
        className="flex flex-1 flex-col items-center justify-center gap-5 pt-2"
        style={{
          filter: overlayOpen ? 'blur(3px)' : 'none',
          opacity: overlayOpen ? 0.4 : (visible ? 1 : 0),
          transform: visible ? 'translateY(0)' : 'translateY(6px)',
          transition: `opacity 280ms ${EASE}, transform 280ms ${EASE}, filter 220ms ease`,
        }}
      >
        <div className="flex flex-col items-center gap-1.5">
          <span
            key={step.sense}
            className="text-[88px] font-semibold leading-none tracking-tight text-[#5B3D78]"
            style={{ animation: `tala-grounding-fade 500ms ${EASE}` }}
          >
            {step.number}
          </span>
          <span className="text-[11px] font-semibold uppercase tracking-[2.4px] text-[#A881C2]">
            {step.sense}
          </span>
        </div>

        <div className="flex flex-col items-center gap-1 text-center">
          <p
            key={`${step.sense}-prompt`}
            className="text-[15px] font-medium leading-snug text-[#2A2A2A]"
            style={{ animation: `tala-grounding-fade 600ms ${EASE}` }}
          >
            {step.prompt}
          </p>
          <p className="text-[12px] leading-relaxed text-[#6E6878]">{step.hint}</p>
        </div>

        <div
          className="mt-1 w-full flex flex-col gap-2 rounded-[18px] border bg-white p-3 transition-all duration-200"
          style={{
            borderColor: loadingAI ? '#A881C2' : '#E9DAF2',
            boxShadow: loadingAI ? '0 0 0 3px rgba(168,129,194,0.12)' : 'none',
            transitionTimingFunction: EASE,
          }}
        >
          <label htmlFor="grounding-input" className="sr-only">
            {`Things you can ${step.sense.toLowerCase()}`}
          </label>
          <textarea
            id="grounding-input"
            ref={textareaRef}
            value={userInput}
            onChange={e => setUserInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={step.placeholder}
            rows={2}
            disabled={loadingAI}
            className="w-full resize-none bg-transparent text-[14px] leading-relaxed text-[#2A2A2A] outline-none placeholder:text-[#B8B0A7] disabled:opacity-60"
          />

          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-[#A881C2]">
              {loadingAI ? 'Tala is reflecting…' : recording ? 'Listening…' : 'Press Enter to check'}
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleVoice}
                disabled={loadingAI}
                aria-label={recording ? 'Stop recording' : 'Start voice input'}
                aria-pressed={recording}
                className="flex h-10 w-10 items-center justify-center rounded-full border transition-all duration-200 active:scale-[0.94] disabled:opacity-40"
                style={{
                  borderColor: recording ? '#f472b6' : '#E9DAF2',
                  backgroundColor: recording ? 'rgba(244,114,182,0.08)' : 'white',
                  color: recording ? '#ec4899' : '#5B3D78',
                  transitionTimingFunction: EASE,
                }}
              >
                {recording
                  ? <span className="h-2.5 w-2.5 rounded-sm bg-[#ec4899]" />
                  : <MicIcon size={15} />
                }
              </button>

              <button
                type="button"
                onClick={validate}
                disabled={!userInput.trim() || loadingAI}
                aria-label="Check with Tala"
                className="flex h-10 w-10 items-center justify-center rounded-full text-white transition-all duration-200 active:scale-[0.94] disabled:opacity-40"
                style={{
                  backgroundColor: '#5B3D78',
                  boxShadow: userInput.trim() && !loadingAI ? '0 8px 20px -8px rgba(91,61,120,0.55)' : 'none',
                  transitionTimingFunction: EASE,
                }}
              >
                {loadingAI
                  ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  : <SendIcon size={14} />
                }
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* Tala feedback overlay */}
      {overlayOpen && (
        <div
          className="absolute inset-x-0 bottom-0 z-20 flex flex-col rounded-[22px] border border-[#E9DAF2] bg-white p-5 shadow-[0_16px_40px_-18px_rgba(91,61,120,0.35)]"
          style={{
            animation: `tala-grounding-slide 280ms ${EASE}`,
          }}
          role="dialog"
          aria-live="polite"
        >
          <p
            className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[2.2px]"
            style={{ color: isValid ? '#A881C2' : '#C2638F' }}
          >
            <span
              className="inline-block h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: isValid ? '#A881C2' : '#C2638F' }}
            />
            Tala says
          </p>

          <p className="mb-4 text-[14px] leading-relaxed text-[#2A2A2A]">{feedback}</p>

          {isValid ? (
            <button
              type="button"
              onClick={advance}
              className="flex items-center justify-center gap-2 rounded-[16px] bg-[#5B3D78] py-[13px] text-[14px] font-semibold text-white shadow-[0_10px_24px_-12px_rgba(91,61,120,0.55)] transition-all duration-200 active:translate-y-[1px] active:scale-[0.985]"
              style={{ transitionTimingFunction: EASE }}
            >
              {isLast ? 'Finish' : 'Next sense'}
              {!isLast && (
                <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              )}
            </button>
          ) : (
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={tryAgain}
                className="flex items-center justify-center rounded-[16px] border border-[#E9DAF2] bg-white py-[13px] text-[14px] font-semibold text-[#2A2A2A] transition-all duration-200 active:scale-[0.985]"
                style={{ transitionTimingFunction: EASE }}
              >
                Try again
              </button>
              <button
                type="button"
                onClick={advance}
                className="flex items-center justify-center rounded-[16px] bg-[#2A2A2A] py-[13px] text-[14px] font-semibold text-white transition-all duration-200 active:scale-[0.985]"
                style={{ transitionTimingFunction: EASE }}
              >
                {isLast ? 'Skip & finish' : 'Skip step'}
              </button>
            </div>
          )}
        </div>
      )}

      <GroundingKeyframes />
    </section>
  );
}

const GROUNDING_KEYFRAMES = `
  @keyframes tala-grounding-idle {
    0%, 100% { transform: scale(0.92); opacity: 0.9; }
    50%      { transform: scale(1.04); opacity: 1;   }
  }
  @keyframes tala-grounding-complete {
    0%, 100% { transform: scale(1);    opacity: 0.85; }
    50%      { transform: scale(1.06); opacity: 1;    }
  }
  @keyframes tala-grounding-fade {
    0%   { opacity: 0; transform: translateY(4px); }
    100% { opacity: 1; transform: translateY(0);   }
  }
  @keyframes tala-grounding-slide {
    0%   { opacity: 0; transform: translateY(12px); }
    100% { opacity: 1; transform: translateY(0);    }
  }
  @media (prefers-reduced-motion: reduce) {
    [class*="tala-grounding"], [style*="tala-grounding"] {
      animation: none !important;
      transition: none !important;
    }
  }
`;

function GroundingKeyframes() {
  return <style dangerouslySetInnerHTML={{ __html: GROUNDING_KEYFRAMES }} />;
}
