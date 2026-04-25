'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const STEPS = [
  { number: 5, sense: 'See',   prompt: 'Name 5 things\nyou can see.',   hint: 'Look around slowly — near and far.',          placeholder: 'e.g. a plant, the ceiling, my phone…' },
  { number: 4, sense: 'Feel',  prompt: 'Name 4 things\nyou can feel.',  hint: 'Notice textures, temperature, weight.',        placeholder: 'e.g. the chair, my shirt, cool air…' },
  { number: 3, sense: 'Hear',  prompt: 'Name 3 things\nyou can hear.',  hint: 'Listen for near sounds and distant ones.',     placeholder: 'e.g. the fan, birds, my breathing…' },
  { number: 2, sense: 'Smell', prompt: 'Name 2 things\nyou can smell.', hint: 'Breathe slowly and notice the air.',           placeholder: 'e.g. coffee, fresh air…' },
  { number: 1, sense: 'Taste', prompt: 'Name 1 thing\nyou can taste.',  hint: 'What lingers on your tongue right now?',       placeholder: 'e.g. mint, water…' },
] as const;

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

function MicIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );
}

function SendIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}

function SparkleIcon({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
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
    }, 220);
    return () => clearTimeout(t);
  }, [visible, stepIndex]);

  const reset = useCallback(() => {
    setStarted(false); setStepIndex(0);
    setVisible(true); setDone(false);
    clearStep();
  }, [clearStep]);

  /* ── Try again: clear input + dismiss overlay ─────────────── */
  const tryAgain = useCallback(() => {
    setFeedback('');
    setIsValid(null);
    setUserInput('');
    setTimeout(() => textareaRef.current?.focus(), 60);
  }, []);

  /* ── Voice input (continuous — stops only on user click) ─── */
  const toggleVoice = useCallback(() => {
    const SR = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!SR) { alert('Voice input is not supported in this browser.'); return; }

    if (recording) {
      // Clear the ref FIRST so the onend handler knows this was a manual stop
      // and won't attempt to restart the session.
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
    // Restart only when the browser ends the session involuntarily (silence timeout, etc.)
    // If recognitionRef.current was cleared by the manual-stop branch, skip restart.
    r.onend = () => {
      if (recognitionRef.current === r) {
        try { r.start(); } catch { recognitionRef.current = null; setRecording(false); }
      }
    };

    recognitionRef.current = r;
    r.start();
    setRecording(true);
  }, [recording]);

  /* ── AI validation ────────────────────────────────────────── */
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

  /* ── Enter key handler ────────────────────────────────────── */
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      validate();
    }
  }, [validate]);

  /* ── Ready screen ─────────────────────────────────────────── */
  if (!started) {
    return (
      <section className="flex w-full flex-col items-center gap-6 px-1">
        <p className="text-center text-[14px] leading-relaxed text-[#9B8AB0]">
          This exercise gently anchors you to the present moment. Share what you notice — by typing or speaking — and Tala will check in with you each step.
        </p>
        <button
          onClick={() => setStarted(true)}
          className="w-full rounded-[18px] bg-[#5B3D78] py-4 text-[16px] font-semibold text-white shadow-[0_4px_20px_rgba(91,61,120,0.35)] transition-all active:scale-[0.97]"
        >
          I&apos;m ready — Begin
        </button>
      </section>
    );
  }

  /* ── Done screen ──────────────────────────────────────────── */
  if (done) {
    return (
      <section className="flex w-full self-stretch flex-col overflow-hidden rounded-[24px] bg-[#1E1035]">
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
          <span className="text-[56px] leading-none">✦</span>
          <p className="text-[26px] font-bold text-white">You&apos;re here.</p>
          <p className="text-[14px] leading-relaxed" style={{ color: 'rgba(168,129,194,0.8)' }}>
            You completed your grounding exercise. Take a gentle breath and carry this stillness with you.
          </p>
        </div>
        <div className="px-6 pb-8">
          <button
            onClick={reset}
            className="w-full rounded-full py-4 text-[15px] font-semibold text-white transition-all active:scale-[0.97]"
            style={{ backgroundColor: '#A881C2' }}
          >
            Done
          </button>
        </div>
      </section>
    );
  }

  /* ── Active step card ─────────────────────────────────────── */
  const overlayOpen = !!feedback;

  return (
    <section className="relative flex w-full self-stretch flex-col overflow-hidden rounded-[24px] bg-[#1E1035]">

      {/* ── Card body (blurs behind overlay) ── */}
      <div
        className="flex flex-1 flex-col"
        style={{
          filter: overlayOpen ? 'blur(3px)' : 'none',
          opacity: overlayOpen ? 0.45 : 1,
          transition: 'filter 250ms ease, opacity 250ms ease',
          pointerEvents: overlayOpen ? 'none' : 'auto',
        }}
      >
        {/* Prompt */}
        <div
          className="relative flex flex-col items-center gap-3 overflow-hidden px-7 pb-4 pt-7 text-center"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(14px)',
            transition: 'opacity 220ms ease-out, transform 220ms ease-out',
          }}
        >
          <span
            className="pointer-events-none absolute select-none font-black leading-none text-white"
            style={{ fontSize: 130, opacity: 0.04, top: -14, right: -10 }}
            aria-hidden
          >
            {step.number}
          </span>

          <span
            className="z-10 rounded-full px-4 py-1 text-[11px] font-bold uppercase tracking-[2px]"
            style={{ backgroundColor: 'rgba(168,129,194,0.15)', color: '#A881C2' }}
          >
            {step.sense}
          </span>

          <h2 className="z-10 whitespace-pre-line text-[26px] font-bold leading-tight text-white">
            {step.prompt}
          </h2>

          <p className="z-10 text-[12px] leading-relaxed" style={{ color: 'rgba(168,129,194,0.55)' }}>
            {step.hint}
          </p>
        </div>

        {/* Input area */}
        <div className="flex flex-1 flex-col justify-center px-6 pb-4">
          <div
            className="flex flex-col gap-2 rounded-[18px] p-4"
            style={{
              backgroundColor: 'rgba(255,255,255,0.05)',
              border: loadingAI
                ? '1px solid rgba(168,129,194,0.6)'
                : '1px solid rgba(168,129,194,0.18)',
              transition: 'border-color 200ms',
              boxShadow: loadingAI ? '0 0 0 3px rgba(168,129,194,0.1)' : 'none',
            }}
          >
            <textarea
              ref={textareaRef}
              value={userInput}
              onChange={e => setUserInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={step.placeholder}
              rows={3}
              disabled={loadingAI}
              className="w-full resize-none bg-transparent text-[14px] leading-relaxed text-white outline-none placeholder:text-[rgba(168,129,194,0.3)] disabled:opacity-50"
            />

            {/* Bottom row: hint + mic + send */}
            <div className="flex items-center justify-between">
              <span className="text-[11px]" style={{ color: 'rgba(168,129,194,0.4)' }}>
                {loadingAI ? 'Tala is thinking…' : recording ? 'Listening…' : 'Press Enter or ↑ to check'}
              </span>

              <div className="flex items-center gap-2">
                {/* Mic */}
                <button
                  onClick={toggleVoice}
                  disabled={loadingAI}
                  className="flex h-8 w-8 items-center justify-center rounded-full transition-all active:scale-[0.93] disabled:opacity-40"
                  style={{
                    backgroundColor: recording ? 'rgba(244,114,182,0.2)' : 'rgba(168,129,194,0.12)',
                    color: recording ? '#f472b6' : '#A881C2',
                    boxShadow: recording ? '0 0 0 3px rgba(244,114,182,0.15)' : 'none',
                  }}
                  aria-label={recording ? 'Stop recording' : 'Voice input'}
                >
                  {recording
                    ? <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: '#f472b6' }} />
                    : <MicIcon size={15} />
                  }
                </button>

                {/* Send */}
                <button
                  onClick={validate}
                  disabled={!userInput.trim() || loadingAI}
                  className="flex h-8 w-8 items-center justify-center rounded-full transition-all active:scale-[0.93] disabled:opacity-25"
                  style={{ backgroundColor: 'rgba(168,129,194,0.18)', color: '#A881C2' }}
                  aria-label="Check with Tala"
                >
                  {loadingAI
                    ? <span className="h-3 w-3 animate-spin rounded-full border-2" style={{ borderColor: '#A881C2', borderTopColor: 'transparent' }} />
                    : <SendIcon size={14} />
                  }
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Pagination dots */}
        <div className="flex justify-center gap-2 pb-5">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className="rounded-full transition-all duration-300"
              style={{
                height: 6,
                width: i === stepIndex ? 22 : 6,
                backgroundColor: i === stepIndex ? '#A881C2' : 'rgba(255,255,255,0.18)',
              }}
            />
          ))}
        </div>
      </div>

      {/* ── Tala overlay (slides up from bottom) ── */}
      {overlayOpen && (
        <div
          className="absolute inset-x-0 bottom-0 flex flex-col rounded-t-[28px] px-6 pb-7 pt-6"
          style={{
            backgroundColor: '#2A1848',
            boxShadow: '0 -4px 40px rgba(0,0,0,0.5)',
            animation: 'slideUp 280ms cubic-bezier(0.16,1,0.3,1)',
          }}
        >
          {/* Drag handle */}
          <div className="mx-auto mb-5 h-1 w-10 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.15)' }} />

          {/* Tala label */}
          <p
            className="mb-3 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[2px]"
            style={{ color: isValid ? '#A881C2' : '#f472b6' }}
          >
            <SparkleIcon size={10} />
            {isValid ? 'Tala' : 'Tala says'}
          </p>

          {/* Feedback text */}
          <p className="mb-6 text-[15px] leading-relaxed text-white/90">{feedback}</p>

          {/* Action button */}
          {isValid ? (
            <button
              onClick={advance}
              className="w-full rounded-full py-4 text-[15px] font-semibold text-white transition-all active:scale-[0.97]"
              style={{ backgroundColor: '#A881C2' }}
            >
              {isLast ? 'Finish ✦' : 'Next →'}
            </button>
          ) : (
            <div className="flex flex-col gap-3">
              <button
                onClick={tryAgain}
                className="w-full rounded-full py-4 text-[15px] font-semibold transition-all active:scale-[0.97]"
                style={{
                  backgroundColor: 'rgba(244,114,182,0.12)',
                  color: '#f9a8d4',
                  border: '1px solid rgba(244,114,182,0.25)',
                }}
              >
                Try again
              </button>
              <button
                onClick={advance}
                className="w-full rounded-full py-3 text-[14px] font-medium transition-all active:scale-[0.97]"
                style={{ color: 'rgba(255,255,255,0.35)' }}
              >
                {isLast ? 'Skip & finish' : 'Skip this step'}
              </button>
            </div>
          )}

          {/* Dots in overlay */}
          <div className="mt-5 flex justify-center gap-2">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className="rounded-full transition-all duration-300"
                style={{
                  height: 5,
                  width: i === stepIndex ? 18 : 5,
                  backgroundColor: i === stepIndex
                    ? (isValid ? '#A881C2' : '#f472b6')
                    : 'rgba(255,255,255,0.15)',
                }}
              />
            ))}
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>
    </section>
  );
}
