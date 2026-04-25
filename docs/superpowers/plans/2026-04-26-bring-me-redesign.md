# Bring Me (Visual Grounding) UI Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the `/wellness/bring-me` UI so it matches the three-state dark-card pattern used by `grounding-visualizer.tsx`, without changing any camera or analysis logic.

**Architecture:** Single-component rewrite inside `src/components/grounding-bring-me-game.tsx`, using Tailwind 4 classes with inline `style` objects for dynamic values (same pattern as `grounding-visualizer.tsx`). Adds a `phase: 'intro' | 'active' | 'done'` state machine plus overlay state. Extends the existing `hideHeroCopy` branch in `src/app/wellness/[slug]/page.tsx` by one slug.

**Tech Stack:** Next.js 16 (App Router, `--webpack`), React 19, Tailwind CSS v4, TypeScript 5, `lucide-react` icons already in the dep tree (but the plan uses inline SVGs to match `grounding-visualizer.tsx` exactly). No new dependencies.

**Manual verification only:** This project has no test runner configured (`package.json` only has `dev`, `build`, `lint`). Verification in each task is `pnpm lint` / `npm run lint` plus a visual check against `http://localhost:3000/wellness/bring-me`.

**Spec:** `docs/superpowers/specs/2026-04-26-bring-me-redesign-design.md`

---

## File Structure

- **Modify:** `src/components/grounding-bring-me-game.tsx` — full rewrite of JSX tree + styles, state machine grows from "one screen" to `phase` union. All async/camera/canvas code preserved unchanged.
- **Modify:** `src/app/wellness/[slug]/page.tsx` — one-line change: add `showGroundingGame` to the `hideHeroCopy` OR expression.
- **No new files. No new dependencies.**

---

## Task 1: Hide page-level hero copy for bring-me

The rebuilt game owns its own title/badge inside the dark card. Leaving the page-level hero above it would duplicate content and push the card below the fold.

**Files:**
- Modify: `src/app/wellness/[slug]/page.tsx:36`

- [ ] **Step 1: Update `hideHeroCopy` to also cover the grounding game**

Open `src/app/wellness/[slug]/page.tsx`. Find this line:

```tsx
const hideHeroCopy = showMindfulness || showBreathing;
```

Replace with:

```tsx
const hideHeroCopy = showMindfulness || showBreathing || showGroundingGame;
```

- [ ] **Step 2: Verify lint passes**

Run: `npm run lint`

Expected: No errors for `src/app/wellness/[slug]/page.tsx`.

- [ ] **Step 3: Manually verify the page still renders**

Start the dev server: `npm run dev`

Visit: `http://localhost:3000/wellness/bring-me`

Expected: The `GROUNDING` badge + "Visual Grounding Task" + description copy no longer appear above the game component. The header bar (back arrow + "Visual Grounding Task") is still visible.

Also visit `/wellness/grounding`, `/wellness/mindfulness`, `/wellness/breathing` to confirm nothing regressed — grounding still shows hero copy, the other two still hide it.

- [ ] **Step 4: Commit**

```bash
git add src/app/wellness/[slug]/page.tsx
git commit -m "feat(wellness): hide hero copy for bring-me grounding game

The rebuilt Bring Me game owns its own title and badge inside its
dark card container, matching the other in-card wellness techniques."
```

---

## Task 2: Extract shared constants and helpers at the top of the game component

Before restructuring the JSX, pull out the style constants and small SVG components so the new render tree can reference them. This task is pure refactor — the UI keeps rendering the same thing.

**Files:**
- Modify: `src/components/grounding-bring-me-game.tsx`

- [ ] **Step 1: Add easing constant, icon components, and overlay keyframes above the `GroundingBringMeGame` function**

Open `src/components/grounding-bring-me-game.tsx`. Directly after the `PROMPT_FLOW` constant (around line 21), insert:

```tsx
const EASE = 'cubic-bezier(0.16, 1, 0.3, 1)';

function CornerBracket({ position }: { position: 'tl' | 'tr' | 'bl' | 'br' }) {
  const base = 'absolute h-6 w-6 border-[#A881C2]';
  const perCorner: Record<typeof position, string> = {
    tl: 'top-2 left-2 border-l-2 border-t-2 rounded-tl-[10px]',
    tr: 'top-2 right-2 border-r-2 border-t-2 rounded-tr-[10px]',
    bl: 'bottom-2 left-2 border-l-2 border-b-2 rounded-bl-[10px]',
    br: 'bottom-2 right-2 border-r-2 border-b-2 rounded-br-[10px]',
  };
  return <span className={`${base} ${perCorner[position]}`} aria-hidden />;
}

function CameraIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

function CameraOffIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M1 1l22 22" />
      <path d="M21 21H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3m3-3h6l2 3h4a2 2 0 0 1 2 2v9.34m-7.72-2.06a4 4 0 1 1-5.56-5.56" />
    </svg>
  );
}

function ShutterIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="3.2" fill="currentColor" stroke="none" />
    </svg>
  );
}

function SparkleIcon({ size = 10 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
    </svg>
  );
}

const BRING_ME_KEYFRAMES = `
  @keyframes bring-me-slide-up {
    from { transform: translateY(100%); opacity: 0; }
    to   { transform: translateY(0);    opacity: 1; }
  }
  @keyframes bring-me-fade-in {
    from { opacity: 0; transform: translateY(6px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @media (prefers-reduced-motion: reduce) {
    [data-bring-me-animate] { animation: none !important; transition: none !important; }
  }
`;

function BringMeKeyframes() {
  return <style dangerouslySetInnerHTML={{ __html: BRING_ME_KEYFRAMES }} />;
}
```

- [ ] **Step 2: Verify lint + types**

Run: `npm run lint`

Expected: No errors. Unused imports like `CameraIcon` / `CameraOffIcon` are expected at this point — Task 3 uses them. If lint's `no-unused-vars` rule fires, add an eslint-disable-next-line above each unused icon function, or skip this verification step and continue; Task 3 will consume them in the same working directory before commit.

- [ ] **Step 3: Do NOT commit yet**

Task 3 replaces the JSX that still references these as dead code. Combining the two commits keeps history clean.

---

## Task 3: Rewrite the render tree into intro / active / done phases

This is the bulk of the visual redesign. The state machine gains a `phase` variable that drives which branch to render. Existing `round`, `prompt`, `usedPrompts`, camera refs, and the `openCamera` / `stopCamera` / `captureAndAnalyze` functions stay intact — only their invocation wiring changes.

**Files:**
- Modify: `src/components/grounding-bring-me-game.tsx`

- [ ] **Step 1: Replace the component body with the new phase-driven implementation**

In `src/components/grounding-bring-me-game.tsx`, replace the entire `export function GroundingBringMeGame()` declaration and its closing brace with the following. Keep everything above it (imports, `AnalyzeResponse` type, `INITIAL_PROMPT`, `DEBUG_LOG_PREFIX`, `PROMPT_FLOW`, the new constants and icons from Task 2) exactly as-is.

```tsx
type Phase = 'intro' | 'active' | 'done';

export function GroundingBringMeGame() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [phase, setPhase] = useState<Phase>('intro');
  const [round, setRound] = useState(1);
  const [prompt, setPrompt] = useState(INITIAL_PROMPT);
  const [usedPrompts, setUsedPrompts] = useState<string[]>([INITIAL_PROMPT]);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [lastResultMatch, setLastResultMatch] = useState<boolean | null>(null);
  const [pendingNextPrompt, setPendingNextPrompt] = useState<string | null>(null);
  const [pendingGameComplete, setPendingGameComplete] = useState(false);

  function getFallbackNextPrompt(
    currentPrompt: string,
    currentRound: number,
    seenPrompts: string[],
  ): string {
    const seen = new Set(seenPrompts.map((item) => item.toLowerCase()));

    const fromPool = PROMPT_FLOW.find(
      (item) => !seen.has(item.toLowerCase()) && item.toLowerCase() !== currentPrompt.toLowerCase(),
    );
    if (fromPool) return fromPool;

    const dynamicPrompts = [
      'Show me something made of wood.',
      'Show me something smooth.',
      'Show me something with a pattern.',
      'Show me something lightweight.',
      'Show me something rectangular.',
      'Show me something green.',
      'Show me something with a number on it.',
      'Show me something textured.',
    ];
    const fromDynamic = dynamicPrompts.find(
      (item) => !seen.has(item.toLowerCase()) && item.toLowerCase() !== currentPrompt.toLowerCase(),
    );
    if (fromDynamic) return fromDynamic;

    return `Show me item ${currentRound + 1} with a clear shape.`;
  }

  useEffect(() => {
    return () => { stopCamera(); };
  }, []);

  function stopCamera() {
    if (!streamRef.current) return;
    for (const track of streamRef.current.getTracks()) track.stop();
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setIsCameraReady(false);
  }

  async function openCamera() {
    setCameraError(null);

    if (!window.isSecureContext) {
      console.error(`${DEBUG_LOG_PREFIX} insecure context - camera blocked by browser`);
      setCameraError('Camera needs HTTPS on iPhone Safari. Open the app using a secure https:// URL.');
      return;
    }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.error(`${DEBUG_LOG_PREFIX} mediaDevices.getUserMedia unavailable`);
      setCameraError('Camera is not available in this browser context.');
      return;
    }

    try {
      console.log(`${DEBUG_LOG_PREFIX} requesting camera permission`);
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setIsCameraReady(true);
      setCameraError(null);
      console.log(`${DEBUG_LOG_PREFIX} camera ready`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown error';
      const name = error instanceof DOMException ? error.name : 'UnknownError';
      console.error(`${DEBUG_LOG_PREFIX} camera permission denied or unavailable`, { name, message });

      if (name === 'NotAllowedError' || name === 'SecurityError') {
        setCameraError('Camera access was denied. In Safari, allow camera for this site and try again.');
      } else if (name === 'NotFoundError' || name === 'OverconstrainedError') {
        setCameraError('No usable camera was found on this device.');
      } else if (name === 'NotReadableError') {
        setCameraError('Camera is busy in another app. Close other apps using the camera and retry.');
      } else {
        setCameraError('Unable to open camera right now. Please try again.');
      }
      setIsCameraReady(false);
    }
  }

  async function captureAndAnalyze() {
    if (!videoRef.current || !canvasRef.current || isAnalyzing) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const width = video.videoWidth || 720;
    const height = video.videoHeight || 540;
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext('2d');
    if (!context) {
      setFeedback('Could not read camera frame. Please try again.');
      setLastResultMatch(false);
      return;
    }

    context.drawImage(video, 0, 0, width, height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    const imageBase64 = dataUrl.split(',')[1];
    if (!imageBase64) {
      setFeedback('Capture failed. Please try again.');
      setLastResultMatch(false);
      return;
    }

    setIsAnalyzing(true);
    console.log(`${DEBUG_LOG_PREFIX} capture submitted`, { round, prompt, imageSize: imageBase64.length });

    try {
      const response = await fetch('/api/grounding-game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPrompt: prompt,
          usedPrompts,
          imageBase64,
          mimeType: 'image/jpeg',
          round,
        }),
      });

      const payload = (await response.json()) as Partial<AnalyzeResponse> & { error?: string };
      if (!response.ok || payload.error) {
        console.error(`${DEBUG_LOG_PREFIX} analysis error`, { status: response.status, payload });
        setFeedback(payload.error ?? 'Analysis failed. Please try again.');
        setLastResultMatch(false);
        return;
      }

      console.log(`${DEBUG_LOG_PREFIX} analysis result`, payload);

      const encouragement = payload.encouragement ?? (payload.isMatch ? 'Nice spot.' : 'Try a different object.');
      setFeedback(encouragement);
      setLastResultMatch(!!payload.isMatch);

      if (payload.isMatch) {
        const nextPrompt = payload.nextPrompt || getFallbackNextPrompt(prompt, round, usedPrompts);
        setPendingNextPrompt(nextPrompt);
        setPendingGameComplete(!!payload.gameComplete);
        console.log(`${DEBUG_LOG_PREFIX} match; next prompt staged`, {
          fromRound: round,
          nextPrompt,
          gameComplete: !!payload.gameComplete,
        });
      } else {
        setPendingNextPrompt(null);
        setPendingGameComplete(false);
        console.log(`${DEBUG_LOG_PREFIX} item not matched; retrying same prompt`, { round, prompt });
      }
    } catch (error) {
      console.error(`${DEBUG_LOG_PREFIX} network failure`, {
        error: error instanceof Error ? error.message : 'unknown error',
      });
      setFeedback('Could not reach grounding service. Try again in a moment.');
      setLastResultMatch(false);
    } finally {
      setIsAnalyzing(false);
    }
  }

  function handleBegin() {
    setPhase('active');
    // Defer camera open by one microtask so React flushes the render
    // and videoRef.current points to the visible <video> in the active branch.
    queueMicrotask(() => { void openCamera(); });
  }

  function handleAdvance() {
    if (pendingGameComplete) {
      setFeedback('');
      setLastResultMatch(null);
      setPendingNextPrompt(null);
      setPendingGameComplete(false);
      setPhase('done');
      return;
    }

    const nextPrompt = pendingNextPrompt ?? getFallbackNextPrompt(prompt, round, usedPrompts);
    setPrompt(nextPrompt);
    setRound((value) => value + 1);
    setUsedPrompts((value) => {
      const seen = value.map((item) => item.toLowerCase());
      return seen.includes(nextPrompt.toLowerCase()) ? value : [...value, nextPrompt];
    });
    setFeedback('');
    setLastResultMatch(null);
    setPendingNextPrompt(null);
    setPendingGameComplete(false);
  }

  function handleTryAgain() {
    setFeedback('');
    setLastResultMatch(null);
    setPendingNextPrompt(null);
    setPendingGameComplete(false);
  }

  function handleSkip() {
    const nextPrompt = getFallbackNextPrompt(prompt, round, usedPrompts);
    setPrompt(nextPrompt);
    setRound((value) => value + 1);
    setUsedPrompts((value) => {
      const seen = value.map((item) => item.toLowerCase());
      return seen.includes(nextPrompt.toLowerCase()) ? value : [...value, nextPrompt];
    });
    setFeedback('');
    setLastResultMatch(null);
    setPendingNextPrompt(null);
    setPendingGameComplete(false);
  }

  function handlePlayAgain() {
    stopCamera();
    setRound(1);
    setPrompt(INITIAL_PROMPT);
    setUsedPrompts([INITIAL_PROMPT]);
    setFeedback('');
    setLastResultMatch(null);
    setPendingNextPrompt(null);
    setPendingGameComplete(false);
    setCameraError(null);
    setPhase('intro');
  }

  const overlayOpen = !!feedback;
  const totalPrompts = 5;
  const dotCount = totalPrompts;
  const activeDotIndex = Math.min(round - 1, dotCount - 1);

  if (phase === 'intro') {
    return (
      <section className="relative flex w-full self-stretch flex-col overflow-hidden rounded-[24px] bg-[#1E1035]">
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-7 py-10 text-center">
          <span
            className="rounded-full px-4 py-1 text-[11px] font-bold uppercase tracking-[2px]"
            style={{ backgroundColor: 'rgba(168,129,194,0.15)', color: '#A881C2' }}
          >
            Grounding
          </span>
          <h2 className="text-[26px] font-bold leading-tight text-white">
            Find what you see.
          </h2>
          <p className="text-[14px] leading-relaxed" style={{ color: 'rgba(168,129,194,0.75)' }}>
            Point your camera at simple objects. Tala will guide you through five prompts.
          </p>
          <p className="pt-2 text-[11px] font-semibold uppercase tracking-[2.4px]" style={{ color: 'rgba(168,129,194,0.55)' }}>
            5 Prompts · 2 Min
          </p>
        </div>
        <div className="px-6 pb-7">
          <button
            type="button"
            onClick={handleBegin}
            className="w-full rounded-[18px] py-4 text-[16px] font-semibold text-white transition-all active:scale-[0.97]"
            style={{
              backgroundColor: '#5B3D78',
              boxShadow: '0 4px 20px rgba(91,61,120,0.35)',
              transitionTimingFunction: EASE,
            }}
          >
            I&apos;m ready — Begin
          </button>
        </div>
        <BringMeKeyframes />
      </section>
    );
  }

  if (phase === 'done') {
    return (
      <section className="flex w-full self-stretch flex-col overflow-hidden rounded-[24px] bg-[#1E1035]">
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
          <span className="text-[56px] leading-none text-white">✦</span>
          <p className="text-[26px] font-bold text-white">You&apos;re here.</p>
          <p className="text-[14px] leading-relaxed" style={{ color: 'rgba(168,129,194,0.8)' }}>
            Five small anchors. You grounded yourself — carry this presence with you.
          </p>
        </div>
        <div className="flex flex-col gap-3 px-6 pb-8">
          <a
            href="/wellness"
            className="w-full rounded-full py-4 text-center text-[15px] font-semibold text-white transition-all active:scale-[0.97]"
            style={{ backgroundColor: '#A881C2', transitionTimingFunction: EASE }}
          >
            Done
          </a>
          <button
            type="button"
            onClick={handlePlayAgain}
            className="w-full py-2 text-[13px] font-medium transition-all active:scale-[0.97]"
            style={{ color: 'rgba(255,255,255,0.5)', transitionTimingFunction: EASE }}
          >
            Play again
          </button>
        </div>
        <BringMeKeyframes />
      </section>
    );
  }

  return (
    <section
      aria-label="Visual grounding game in progress"
      className="relative flex w-full self-stretch flex-col overflow-hidden rounded-[24px] bg-[#1E1035]"
    >
      <div
        className="flex flex-1 flex-col"
        style={{
          filter: overlayOpen ? 'blur(3px)' : 'none',
          opacity: overlayOpen ? 0.45 : 1,
          transition: 'filter 250ms ease, opacity 250ms ease',
          pointerEvents: overlayOpen ? 'none' : 'auto',
        }}
      >
        <div className="relative flex flex-col items-center gap-2 overflow-hidden px-7 pb-3 pt-7 text-center">
          <span
            className="pointer-events-none absolute select-none font-black leading-none text-white"
            style={{ fontSize: 130, opacity: 0.04, top: -14, right: -10 }}
            aria-hidden
          >
            {String(round).padStart(2, '0')}
          </span>
          <span
            className="z-10 rounded-full px-4 py-1 text-[11px] font-bold uppercase tracking-[2px]"
            style={{ backgroundColor: 'rgba(168,129,194,0.15)', color: '#A881C2' }}
          >
            Item {round} of {totalPrompts}
          </span>
          <h2
            key={prompt}
            className="z-10 text-[24px] font-bold leading-tight text-white"
            data-bring-me-animate
            style={{ animation: `bring-me-fade-in 320ms ${EASE}` }}
          >
            {prompt}
          </h2>
          <p className="z-10 text-[12px] leading-relaxed" style={{ color: 'rgba(168,129,194,0.55)' }}>
            Point. Hold steady. Tap Check.
          </p>
        </div>

        <div className="px-6 pb-3">
          <div
            className="relative overflow-hidden rounded-[18px] bg-black transition-shadow duration-300"
            style={{
              border: '1px solid rgba(168,129,194,0.25)',
              boxShadow: isAnalyzing ? '0 0 0 3px rgba(168,129,194,0.25)' : 'none',
            }}
          >
            <video
              ref={videoRef}
              className="aspect-[4/3] w-full object-cover"
              playsInline
              muted
              autoPlay
            />
            <CornerBracket position="tl" />
            <CornerBracket position="tr" />
            <CornerBracket position="bl" />
            <CornerBracket position="br" />
          </div>
          <canvas ref={canvasRef} className="hidden" aria-hidden />
        </div>

        {cameraError && !isCameraReady ? (
          <div className="mx-6 mb-3 rounded-2xl px-4 py-3 text-[13px] leading-relaxed" style={{ backgroundColor: 'rgba(244,114,182,0.12)', color: '#f9a8d4' }}>
            {cameraError}
          </div>
        ) : null}

        <div className="flex items-center gap-3 px-6 pb-3">
          <button
            type="button"
            onClick={isCameraReady ? stopCamera : openCamera}
            aria-label={isCameraReady ? 'Stop camera' : 'Start camera'}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-all active:scale-[0.94]"
            style={{
              backgroundColor: 'rgba(168,129,194,0.14)',
              color: '#A881C2',
              transitionTimingFunction: EASE,
            }}
          >
            {isCameraReady ? <CameraIcon size={16} /> : <CameraOffIcon size={16} />}
          </button>
          <button
            type="button"
            onClick={captureAndAnalyze}
            disabled={!isCameraReady || isAnalyzing}
            className="flex flex-1 items-center justify-center gap-2 rounded-full py-3 text-[15px] font-semibold text-white transition-all active:scale-[0.97] disabled:opacity-40"
            style={{ backgroundColor: '#A881C2', transitionTimingFunction: EASE }}
          >
            {isAnalyzing ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2" style={{ borderColor: 'white', borderTopColor: 'transparent' }} />
            ) : (
              <ShutterIcon size={16} />
            )}
            {isAnalyzing ? 'Checking…' : 'Check item'}
          </button>
        </div>

        <div className="flex justify-center gap-2 pb-5">
          {Array.from({ length: dotCount }).map((_, i) => (
            <div
              key={i}
              className="rounded-full transition-all duration-300"
              style={{
                height: 6,
                width: i === activeDotIndex ? 22 : 6,
                backgroundColor:
                  i === activeDotIndex
                    ? lastResultMatch === false && overlayOpen
                      ? '#f472b6'
                      : '#A881C2'
                    : 'rgba(255,255,255,0.18)',
              }}
            />
          ))}
        </div>
      </div>

      {overlayOpen ? (
        <div
          role="status"
          aria-live="polite"
          className="absolute inset-x-0 bottom-0 flex flex-col rounded-t-[28px] px-6 pb-7 pt-6"
          data-bring-me-animate
          style={{
            backgroundColor: '#2A1848',
            boxShadow: '0 -4px 40px rgba(0,0,0,0.5)',
            animation: `bring-me-slide-up 280ms ${EASE}`,
          }}
        >
          <div className="mx-auto mb-5 h-1 w-10 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.15)' }} />
          <p
            className="mb-3 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[2px]"
            style={{ color: lastResultMatch ? '#A881C2' : '#f472b6' }}
          >
            <SparkleIcon size={10} />
            {lastResultMatch ? 'Tala' : 'Tala says'}
          </p>
          <p className="mb-6 text-[15px] leading-relaxed text-white/90 whitespace-pre-wrap">{feedback}</p>

          {lastResultMatch ? (
            <button
              type="button"
              onClick={handleAdvance}
              className="w-full rounded-full py-4 text-[15px] font-semibold text-white transition-all active:scale-[0.97]"
              style={{ backgroundColor: '#A881C2', transitionTimingFunction: EASE }}
            >
              {pendingGameComplete ? 'Finish ✦' : 'Next →'}
            </button>
          ) : (
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={handleTryAgain}
                className="w-full rounded-full py-4 text-[15px] font-semibold transition-all active:scale-[0.97]"
                style={{
                  backgroundColor: 'rgba(244,114,182,0.12)',
                  color: '#f9a8d4',
                  border: '1px solid rgba(244,114,182,0.25)',
                  transitionTimingFunction: EASE,
                }}
              >
                Try again
              </button>
              <button
                type="button"
                onClick={handleSkip}
                className="w-full py-3 text-[14px] font-medium transition-all active:scale-[0.97]"
                style={{ color: 'rgba(255,255,255,0.4)', transitionTimingFunction: EASE }}
              >
                Skip this one
              </button>
            </div>
          )}

          <div className="mt-5 flex justify-center gap-2">
            {Array.from({ length: dotCount }).map((_, i) => (
              <div
                key={i}
                className="rounded-full transition-all duration-300"
                style={{
                  height: 5,
                  width: i === activeDotIndex ? 18 : 5,
                  backgroundColor:
                    i === activeDotIndex
                      ? lastResultMatch
                        ? '#A881C2'
                        : '#f472b6'
                      : 'rgba(255,255,255,0.15)',
                }}
              />
            ))}
          </div>
        </div>
      ) : null}

      <BringMeKeyframes />
    </section>
  );
}
```

Implementation notes:

- Only the active branch mounts `<video ref={videoRef}>` and `<canvas ref={canvasRef}>`. Because `handleBegin` flips `phase` to `'active'` and schedules `openCamera()` via `queueMicrotask`, React flushes the new render first, so `videoRef.current` points at the visible element by the time the stream attaches.
- The intro and done branches render only their content + `<BringMeKeyframes />` — no hidden video or canvas.

- [ ] **Step 2: Verify lint + types**

Run: `npm run lint`

Expected: No errors.

- [ ] **Step 3: Manually verify all three phases on the dev server**

Start the dev server if not running: `npm run dev`

Visit: `http://localhost:3000/wellness/bring-me`

Walk through each state:

1. **Intro:** Dark card with "Grounding" pill, "Find what you see.", subtext, "5 Prompts · 2 Min", and full-width purple "I'm ready — Begin" button. Tapping Begin requests camera.
2. **Active:** After granting camera, you see the live preview inside the dark card with four purple corner brackets, the "ITEM 1 OF 5" pill, prompt text, hint line, camera-toggle icon + "Check item" pill row, and five pagination dots (first elongated).
3. **Check item:** Pressing "Check item" dims the top area, blurs it slightly, and slides up the purple `Tala` panel. If the API says `isMatch: true`, the panel shows "Next →"; tapping it advances the prompt and the active dot moves.
4. **Miss:** If the API says `isMatch: false`, the panel shows pink "Tala says" with "Try again" + "Skip this one". Active dot temporarily turns pink while overlay is open, returns to purple once dismissed.
5. **Complete:** After the API sets `gameComplete: true` (or after five rounds in the fallback path), tapping the primary button moves to the done state with ✦, "You're here.", "Done", and "Play again".
6. **Play again:** Tapping "Play again" returns you to Intro; the first prompt is `INITIAL_PROMPT` again.
7. **Reduced motion:** In macOS System Settings → Accessibility → Display, enable "Reduce motion", reload the page, tap Check. The bottom overlay should still appear but without the slide-in motion; the prompt fade should be skipped too.

- [ ] **Step 4: Verify no regressions on the other wellness pages**

Open each and perform a light sanity check:

- `http://localhost:3000/wellness/grounding` — still renders the 5-4-3-2-1 sense flow unchanged.
- `http://localhost:3000/wellness/mindfulness` — breathing orb still animates.
- `http://localhost:3000/wellness/breathing` — box breathing still animates.

- [ ] **Step 5: Commit the full redesign**

```bash
git add src/components/grounding-bring-me-game.tsx
git commit -m "feat(wellness): redesign Bring Me grounding game

Moves /wellness/bring-me onto the same three-state dark-card pattern
used by the 5-4-3-2-1 grounding exercise: intro screen, active scanner
with corner brackets and pagination dots, and a completion state with
replay. Camera stream, canvas capture, and /api/grounding-game request
contract are unchanged; only presentation, state machine, and feedback
overlay are new."
```

---

## Task 4: Final sweep — lint, build, manual smoke test

**Files:** none modified here — just verification.

- [ ] **Step 1: Lint the whole repo**

Run: `npm run lint`

Expected: No new errors introduced by either commit.

- [ ] **Step 2: Production build**

Run: `npm run build`

Expected: Build succeeds without type errors. The wellness routes appear in the static generation output.

- [ ] **Step 3: Smoke test the production bundle**

Run: `npm run start`

Visit: `http://localhost:3000/wellness/bring-me`

Walk the three phases once more in production mode to catch any dev-only behavior differences (e.g., Strict Mode double-invoke of `openCamera`, hydration issues).

- [ ] **Step 4: Push the branch**

```bash
git push -u origin feat/ui-improvement
```

(Skip this step if the branch has already been pushed and you only want the commits on the remote — in that case, run `git push` without `-u`.)

---

## Self-Review Notes

- **Spec coverage:** All three states (intro / active / done), corner brackets, pagination dots, slide-up overlay, match/miss styling, `Play again` affordance, reduced-motion support, API-contract preservation, page-level hero suppression — each mapped to a task above.
- **Types:** `Phase`, `AnalyzeResponse`, and prop shapes are consistent across Tasks 2 and 3. `lastResultMatch` is `boolean | null` everywhere. `pendingNextPrompt` is `string | null`, `pendingGameComplete` is `boolean`.
- **Placeholders:** None. Every code block is complete and drop-in.
- **Naming:** `handleBegin`, `handleAdvance`, `handleTryAgain`, `handleSkip`, `handlePlayAgain` — all referenced where declared. `openCamera` / `stopCamera` / `captureAndAnalyze` names preserved verbatim from the pre-existing component.
