# Guided Journaling — 1-1-1 Method Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a method-picker at `/journal/text/guided` with a fully working 1-1-1 step-by-step runner (three prompts → `/api/journal` → InsightsDialog), plus three static "Coming soon" placeholder methods.

**Architecture:** Data-as-registry approach. A single `guided-methods.ts` module exports the list of methods and a pure transcript builder. A dynamic `[method]` route looks up each method and dispatches to either the client-side runner or an inline "Coming soon" view. The runner is method-agnostic — driven entirely by `prompts[]`. Adding a new method later is a ~10-line data change, no new files.

**Tech Stack:** Next.js 16 (App Router), React client/server components, Tailwind, vitest for the one unit test. Reuses existing `/api/journal` endpoint, `InsightsDialog`, `BackButton`, `loadUser`, and `JournalApiResponse`.

**Spec:** `docs/superpowers/specs/2026-04-26-guided-journaling-1-1-1-design.md`

---

## File Structure

**New files:**
- `src/components/guided-methods.ts` — data registry + `buildGuidedTranscript` pure helper
- `src/components/guided-method-card.tsx` — presentational card for picker
- `src/components/guided-prompt-runner.tsx` — client runner, step state, submit flow
- `src/app/journal/text/guided/[method]/page.tsx` — server component, dispatch runner vs "coming soon"
- `tests/guided/transcript.test.ts` — unit test for transcript builder

**Replaced:**
- `src/app/journal/text/guided/page.tsx` — stub replaced with real picker

**Untouched but depended on:**
- `/api/journal` POST endpoint (unchanged)
- `src/components/insights-dialog.tsx`
- `src/components/back-button.tsx`
- `src/lib/session.ts` (`loadUser`)
- `src/lib/types.ts` (`JournalApiResponse`)

---

## Task 1: Create `guided-methods.ts` registry and transcript builder (TDD)

**Files:**
- Create: `src/components/guided-methods.ts`
- Create: `tests/guided/transcript.test.ts`

- [ ] **Step 1: Create the failing test file**

Create `tests/guided/transcript.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import {
  buildGuidedTranscript,
  GUIDED_METHODS,
} from "@/components/guided-methods";

describe("buildGuidedTranscript", () => {
  const prompts = [
    { label: "1 thing I'm grateful for", placeholder: "" },
    { label: "1 thing I accomplished", placeholder: "" },
    { label: "1 thing I'm looking forward to", placeholder: "" },
  ];

  it("joins label and answer for each prompt separated by blank lines", () => {
    const answers = ["morning coffee", "shipped the PR", "dinner with K"];
    expect(buildGuidedTranscript(prompts, answers)).toBe(
      [
        "1 thing I'm grateful for",
        "morning coffee",
        "",
        "1 thing I accomplished",
        "shipped the PR",
        "",
        "1 thing I'm looking forward to",
        "dinner with K",
      ].join("\n"),
    );
  });

  it("trims outer whitespace on each answer", () => {
    const answers = ["  coffee  ", "\n\nthe PR\n", " K "];
    const out = buildGuidedTranscript(prompts, answers);
    expect(out).toContain("\ncoffee\n");
    expect(out).toContain("\nthe PR\n");
    expect(out).toContain("\nK");
    expect(out).not.toContain("  coffee  ");
  });

  it("preserves internal newlines within an answer", () => {
    const answers = ["line one\nline two", "", ""];
    const out = buildGuidedTranscript(prompts, answers);
    expect(out).toContain("line one\nline two");
  });

  it("produces label followed by empty line when answer is blank", () => {
    const answers = ["", "", ""];
    const out = buildGuidedTranscript(prompts, answers);
    expect(out.startsWith("1 thing I'm grateful for\n\n")).toBe(true);
  });
});

describe("GUIDED_METHODS registry", () => {
  it("includes exactly four methods", () => {
    expect(GUIDED_METHODS).toHaveLength(4);
  });

  it("marks 1-1-1 as ready with three prompts", () => {
    const m = GUIDED_METHODS.find((x) => x.key === "one-one-one");
    expect(m?.status).toBe("ready");
    expect(m?.prompts).toHaveLength(3);
  });

  it("marks all other methods as coming-soon", () => {
    const others = GUIDED_METHODS.filter((x) => x.key !== "one-one-one");
    expect(others.every((m) => m.status === "coming-soon")).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- tests/guided/transcript.test.ts`
Expected: FAIL with "Cannot find module '@/components/guided-methods'"

- [ ] **Step 3: Create `src/components/guided-methods.ts`**

```ts
export type Prompt = { label: string; placeholder: string };

export type GuidedMethodKey =
  | "one-one-one"
  | "gratitude-list"
  | "worry-dump"
  | "evening";

export type GuidedMethod = {
  key: GuidedMethodKey;
  title: string;
  blurb: string;
  status: "ready" | "coming-soon";
  prompts?: readonly Prompt[];
};

export const GUIDED_METHODS: readonly GuidedMethod[] = [
  {
    key: "one-one-one",
    title: "1-1-1 Method",
    blurb: "One gratitude, one accomplishment, one thing ahead.",
    status: "ready",
    prompts: [
      {
        label: "1 thing I'm grateful for",
        placeholder: "Something small or big…",
      },
      {
        label: "1 thing I accomplished",
        placeholder: "Even the quiet wins count.",
      },
      {
        label: "1 thing I'm looking forward to",
        placeholder: "Near or far future…",
      },
    ],
  },
  {
    key: "gratitude-list",
    title: "Gratitude List",
    blurb: "Five things you're grateful for today.",
    status: "coming-soon",
  },
  {
    key: "worry-dump",
    title: "Worry Dump",
    blurb: "Empty the noise, then release one thing.",
    status: "coming-soon",
  },
  {
    key: "evening",
    title: "Evening Reflection",
    blurb: "High, low, lesson, and tomorrow's priority.",
    status: "coming-soon",
  },
];

export function buildGuidedTranscript(
  prompts: readonly Prompt[],
  answers: readonly string[],
): string {
  return prompts
    .map((p, i) => `${p.label}\n${(answers[i] ?? "").trim()}`)
    .join("\n\n");
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- tests/guided/transcript.test.ts`
Expected: PASS, 7 tests passing (4 transcript + 3 registry)

- [ ] **Step 5: Commit**

```bash
git add src/components/guided-methods.ts tests/guided/transcript.test.ts
git commit -m "feat(guided): registry of methods and transcript builder"
```

---

## Task 2: Create `GuidedMethodCard` presentational component

**Files:**
- Create: `src/components/guided-method-card.tsx`

- [ ] **Step 1: Create the component**

Create `src/components/guided-method-card.tsx`:

```tsx
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import type { GuidedMethod } from "./guided-methods";

type Props = {
  method: GuidedMethod;
};

export function GuidedMethodCard({ method }: Props) {
  const isComingSoon = method.status === "coming-soon";
  return (
    <Link
      href={`/journal/text/guided/${method.key}`}
      className={[
        "flex w-full flex-col gap-2.5 rounded-[28px] bg-white px-[18px] pb-4 pt-[18px] text-left transition-opacity duration-200 active:opacity-80",
        isComingSoon ? "opacity-60" : "",
      ].join(" ")}
    >
      <div className="flex items-center justify-between gap-3.5">
        <span className="text-[19px] font-semibold leading-tight tracking-[-0.4px] text-[#1A1A1A]">
          {method.title}
        </span>
        <span className="flex items-center gap-2">
          {isComingSoon ? (
            <span className="rounded-full bg-[#F2EEE8] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[1px] text-[#8A8172]">
              Coming soon
            </span>
          ) : null}
          <span
            aria-hidden
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F2EEE8] text-[#1A1A1A]"
          >
            <ArrowUpRight className="h-4 w-4" strokeWidth={2} />
          </span>
        </span>
      </div>
      <p className="text-[13px] leading-[1.5] tracking-[0.1px] text-[#6B6256]">
        {method.blurb}
      </p>
    </Link>
  );
}
```

- [ ] **Step 2: Typecheck by running lint**

Run: `npm run lint`
Expected: No new errors. (If ESLint complains about the card being an `<a>` equivalent — it shouldn't since we're using `next/link` — revisit.)

- [ ] **Step 3: Commit**

```bash
git add src/components/guided-method-card.tsx
git commit -m "feat(guided): method picker card with coming-soon state"
```

---

## Task 3: Replace the picker page with the real method list

**Files:**
- Modify: `src/app/journal/text/guided/page.tsx` (replace entire contents)

- [ ] **Step 1: Overwrite the stub page**

Replace the full contents of `src/app/journal/text/guided/page.tsx` with:

```tsx
import { BackButton } from "@/components/back-button";
import { GuidedMethodCard } from "@/components/guided-method-card";
import { GUIDED_METHODS } from "@/components/guided-methods";

export default function GuidedWritingPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-100">
      <div className="relative flex h-[844px] w-[390px] flex-col overflow-hidden rounded-[40px] bg-[#FCFAF7]">
        <div className="h-[54px] shrink-0" aria-hidden />

        <div className="flex items-center px-5 pb-3 pt-3">
          <BackButton href="/journal/text" />
        </div>

        <header className="flex flex-col items-center gap-2.5 px-7 pb-4 pt-3.5">
          <h1 className="text-center text-[26px] font-bold leading-[1.15] tracking-[-1px] text-[#1A1A1A]">
            Guided writing
          </h1>
          <p className="text-center text-[13px] leading-[1.45] tracking-[0.1px] text-[#8A8172]">
            Pick a method to begin.
          </p>
        </header>

        <div className="flex flex-1 flex-col gap-2.5 overflow-y-auto px-5 pb-6">
          {GUIDED_METHODS.map((method) => (
            <GuidedMethodCard key={method.key} method={method} />
          ))}
        </div>
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Verify in a browser**

Run: `npm run dev` (if not already running)
Open: `http://localhost:3000/journal/text/guided`
Expected: Four cards visible. "1-1-1 Method" on top without a pill. The other three (Gratitude List, Worry Dump, Evening Reflection) show "Coming soon" pills and dimmed opacity. Back arrow in the top-left navigates to `/journal/text`.

If the dev server isn't running, skip the browser check — the next task's browser check will catch regressions.

- [ ] **Step 3: Commit**

```bash
git add src/app/journal/text/guided/page.tsx
git commit -m "feat(guided): replace stub with method picker"
```

---

## Task 4: Create `GuidedPromptRunner` client component

**Files:**
- Create: `src/components/guided-prompt-runner.tsx`

- [ ] **Step 1: Create the runner component**

Create `src/components/guided-prompt-runner.tsx`:

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";

import { InsightsDialog } from "@/components/insights-dialog";
import { buildGuidedTranscript, type Prompt } from "@/components/guided-methods";
import { loadUser } from "@/lib/session";
import type { JournalApiResponse } from "@/lib/types";

type Props = {
  title: string;
  prompts: readonly Prompt[];
};

export function GuidedPromptRunner({ title, prompts }: Props) {
  const router = useRouter();
  const frameRef = useRef<HTMLDivElement | null>(null);

  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<string[]>(() =>
    prompts.map(() => ""),
  );
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [aiReply, setAiReply] = useState<JournalApiResponse | null>(null);
  const [insightsOpen, setInsightsOpen] = useState(false);
  const [userId, setUserId] = useState<number | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate from localStorage on mount
    setUserId(loadUser()?.id ?? null);
  }, []);

  const currentPrompt = prompts[step];
  const currentAnswer = answers[step] ?? "";
  const isLastStep = step === prompts.length - 1;
  const canAdvance = currentAnswer.trim().length > 0;

  const updateAnswer = (value: string) => {
    setAnswers((prev) => {
      const next = [...prev];
      next[step] = value;
      return next;
    });
  };

  const handleBack = () => {
    if (step === 0) {
      router.push("/journal/text/guided");
      return;
    }
    setStep((s) => s - 1);
  };

  const handleNext = () => {
    if (!canAdvance) return;
    setStep((s) => s + 1);
  };

  const handleFinish = async () => {
    if (!canAdvance || submitting || userId === null) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const transcript = buildGuidedTranscript(prompts, answers);
      const res = await fetch("/api/journal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": String(userId),
        },
        body: JSON.stringify({ transcript, input_type: "text" }),
      });
      if (!res.ok) {
        setSubmitError("Something went wrong. Please try again.");
        return;
      }
      const data = (await res.json()) as JournalApiResponse;
      setAiReply(data);
      setInsightsOpen(true);
    } catch {
      setSubmitError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-100">
      <div
        ref={frameRef}
        className="relative flex h-[844px] w-[390px] flex-col overflow-hidden rounded-[40px] bg-[#FCFAF7]"
      >
        <div className="h-[54px] shrink-0" aria-hidden />

        <div className="flex items-center justify-between px-5 pb-3 pt-3">
          <button
            type="button"
            onClick={handleBack}
            aria-label="Back"
            className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full bg-[#F5F2ED] text-[#1A1A1A] transition-opacity hover:opacity-90 active:opacity-80"
          >
            <ArrowLeft className="h-5 w-5" strokeWidth={1.75} />
          </button>
          <span className="text-[13px] font-semibold tracking-[0.4px] text-[#8A8172]">
            Step {step + 1} of {prompts.length}
          </span>
          <span aria-hidden className="h-11 w-11" />
        </div>

        <header className="flex flex-col gap-1.5 px-6 pb-2 pt-3">
          <p className="text-[13px] font-semibold tracking-[0.4px] text-[#B8B0A7]">
            {title}
          </p>
          <h1 className="text-[22px] font-bold leading-[1.2] tracking-[-0.6px] text-[#1A1A1A]">
            {currentPrompt.label}
          </h1>
        </header>

        <div className="flex min-h-0 flex-1 flex-col gap-3 px-6 pb-4 pt-2">
          <textarea
            value={currentAnswer}
            onChange={(e) => updateAnswer(e.target.value)}
            placeholder={currentPrompt.placeholder}
            className="min-h-[220px] w-full flex-1 resize-none border-none bg-transparent p-0 text-[17px] leading-[1.55] text-[#1A1A1A] placeholder:text-[#B8B0A7] focus:outline-none"
            autoFocus
          />

          {submitError ? (
            <p className="text-[13px] text-[#8A3A2E]">{submitError}</p>
          ) : null}

          {userId === null ? (
            <p className="text-[13px] text-[#8A8172]">
              Please sign in to save.
            </p>
          ) : null}
        </div>

        <InsightsDialog
          open={insightsOpen}
          onOpenChange={(next) => {
            setInsightsOpen(next);
            if (!next && aiReply) {
              router.replace("/dashboard");
            }
          }}
          reply={aiReply}
          container={frameRef}
        />

        <div className="shrink-0 border-t border-[#EFE8E0] bg-[#FCFAF7] px-5 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-4">
          <button
            type="button"
            onClick={isLastStep ? handleFinish : handleNext}
            disabled={
              !canAdvance ||
              submitting ||
              (isLastStep && userId === null)
            }
            className="flex h-[54px] w-full cursor-pointer items-center justify-center gap-2.5 rounded-full bg-[#1A1A1A] text-[15px] font-semibold tracking-[0.1px] text-white shadow-[0_8px_18px_rgba(26,26,26,0.2)] transition-opacity hover:opacity-90 active:opacity-80 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isLastStep ? (submitting ? "Saving…" : "Finish") : "Next"}
            {!submitting ? (
              <ArrowRight className="h-4 w-4" strokeWidth={2} />
            ) : null}
          </button>
        </div>
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Typecheck by running lint**

Run: `npm run lint`
Expected: No new errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/guided-prompt-runner.tsx
git commit -m "feat(guided): step-by-step prompt runner"
```

---

## Task 5: Create `[method]` dynamic route dispatcher

**Files:**
- Create: `src/app/journal/text/guided/[method]/page.tsx`

- [ ] **Step 1: Create the dispatcher page**

Create `src/app/journal/text/guided/[method]/page.tsx`:

```tsx
import { notFound } from "next/navigation";

import { BackButton } from "@/components/back-button";
import { GuidedPromptRunner } from "@/components/guided-prompt-runner";
import {
  GUIDED_METHODS,
  type GuidedMethod,
  type GuidedMethodKey,
} from "@/components/guided-methods";

type PageProps = {
  params: Promise<{ method: string }>;
};

function findMethod(key: string): GuidedMethod | undefined {
  return GUIDED_METHODS.find(
    (m): m is GuidedMethod => m.key === (key as GuidedMethodKey),
  );
}

export default async function GuidedMethodPage({ params }: PageProps) {
  const { method: methodKey } = await params;
  const method = findMethod(methodKey);

  if (!method) {
    notFound();
  }

  if (method.status === "coming-soon") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-neutral-100">
        <div className="relative flex h-[844px] w-[390px] flex-col overflow-hidden rounded-[40px] bg-[#FCFAF7]">
          <div className="h-[54px] shrink-0" aria-hidden />

          <div className="flex items-center px-5 pb-3 pt-3">
            <BackButton href="/journal/text/guided" />
          </div>

          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-7 text-center">
            <span className="rounded-full bg-[#F2EEE8] px-3 py-1 text-[10px] font-semibold uppercase tracking-[1px] text-[#8A8172]">
              Coming soon
            </span>
            <h1 className="text-[26px] font-bold leading-[1.15] tracking-[-1px] text-[#1A1A1A]">
              {method.title}
            </h1>
            <p className="max-w-[280px] text-[14px] leading-[1.5] text-[#8A8172]">
              We&apos;re still building this one. Try the 1-1-1 Method while you
              wait.
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (!method.prompts) {
    notFound();
  }

  return (
    <GuidedPromptRunner title={method.title} prompts={method.prompts} />
  );
}
```

- [ ] **Step 2: Typecheck by running lint**

Run: `npm run lint`
Expected: No new errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/journal/text/guided/\[method\]/page.tsx
git commit -m "feat(guided): route dispatcher for ready and coming-soon methods"
```

---

## Task 6: Run tests and lint together

**Files:** (no changes)

- [ ] **Step 1: Run the full test suite**

Run: `npm test`
Expected: All previous tests still pass + 7 new tests (4 transcript + 3 registry). Total: 84 passing.

- [ ] **Step 2: Run lint on the whole project**

Run: `npm run lint`
Expected: Clean, no errors.

- [ ] **Step 3: If anything failed, fix and re-run before moving on.**

Do not proceed to manual verification until both commands are green.

---

## Task 7: Manual browser verification

**Files:** (no changes)

Start the dev server if it is not already running: `npm run dev`

- [ ] **Step 1: Picker renders correctly**

Visit `http://localhost:3000/journal/text/guided`.
Expected: Four cards in order. "1-1-1 Method" card has no "Coming soon" pill. The other three cards (Gratitude List, Worry Dump, Evening Reflection) show the pill and are visibly dimmed. The back arrow top-left navigates to `/journal/text`.

- [ ] **Step 2: Runner opens at step 1 of 3**

From the picker, tap "1-1-1 Method".
Expected: URL becomes `/journal/text/guided/one-one-one`. The header reads "Step 1 of 3" and the prompt is "1 thing I'm grateful for". Textarea is focused. Next button is dimmed/disabled.

- [ ] **Step 3: Next button enables after typing**

Type "morning coffee" into the textarea.
Expected: Next button becomes active.

- [ ] **Step 4: Answers preserved across Back and Next**

Tap Next → advance to step 2. Type "shipped the PR". Tap Back → returns to step 1 with "morning coffee" still in the textarea. Tap Next → step 2 still shows "shipped the PR".

- [ ] **Step 5: Back from step 1 returns to picker**

From step 1, tap Back.
Expected: URL becomes `/journal/text/guided`, the picker is visible.

- [ ] **Step 6: Finish flow**

Walk through all three steps. On step 3, the button reads "Finish" instead of "Next". Tap Finish.
Expected: Button shows "Saving…" briefly, then the InsightsDialog opens with the AI reply. Dismissing the dialog navigates to `/dashboard`.

- [ ] **Step 7: Coming-soon cards show placeholder**

From the picker, tap "Gratitude List".
Expected: URL becomes `/journal/text/guided/gratitude-list`. The page shows a "Coming soon" pill, the method title, and the explanatory copy. The Back button returns to the picker.

Repeat for "Worry Dump" and "Evening Reflection".

- [ ] **Step 8: Unknown slug returns 404**

Visit `http://localhost:3000/journal/text/guided/bogus`.
Expected: Next.js default 404 page.

- [ ] **Step 9: Signed-out behavior**

In browser devtools, clear localStorage (Application → Local Storage → clear entries for this origin). Reload the 1-1-1 runner (`/journal/text/guided/one-one-one`). Walk to the last step and tap Finish.
Expected: Below the textarea, "Please sign in to save." is shown. Finish button is disabled on the last step when not signed in.

Re-sign-in before continuing other testing.

---

## Task 8: Final commit of any fixups from manual verification

**Files:** (depends on what verification surfaced)

- [ ] **Step 1: If manual verification found issues, fix them and run `npm run lint && npm test` again.**

- [ ] **Step 2: If there were no fixup changes, skip this step.**

If there were, commit them:

```bash
git add -A
git commit -m "fix(guided): address issues found in manual verification"
```

- [ ] **Step 3: Review commit log**

Run: `git log --oneline feat/guided ^main`
Expected: A focused series of commits all scoped to the guided feature. Nothing unrelated.

---

## Self-Review

**Spec coverage:**
- Method picker with four cards → Tasks 2, 3
- 1-1-1 fully working → Tasks 1, 4, 5
- Other three methods static → Task 1 (registry), Task 5 (dispatcher renders placeholder)
- Step-by-step flow → Task 4 (runner)
- Transcript format → Task 1 (builder + tests)
- `/api/journal` integration → Task 4 (fetch call)
- InsightsDialog + dashboard redirect → Task 4
- Error handling (network, no user, empty answer, unknown slug) → Task 4 + Task 5
- Visual: existing frame, colors, type scale → Tasks 3, 4, 5
- Step indicator (not a progress bar) → Task 4 header
- Manual verification checklist → Task 7
- Unit test for transcript builder → Task 1

**Placeholder scan:** No TBD/TODO/"similar to". Every code step contains complete code.

**Type consistency:** `GuidedMethod`, `GuidedMethodKey`, and `Prompt` are defined in Task 1 and used consistently in Tasks 2, 4, 5. `buildGuidedTranscript` signature `(prompts, answers)` matches Task 1 definition and Task 4 call site. `JournalApiResponse` import matches `src/lib/types.ts`.

No fixes needed.
