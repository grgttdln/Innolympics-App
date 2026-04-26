# Guided Journaling — 1-1-1 Method

**Date:** 2026-04-26
**Scope:** Build a working guided-journaling flow on `/journal/text/guided`, with the 1-1-1 method fully implemented and three additional methods present as static "Coming soon" placeholders.

## Goal

When a user selects "Guided writing" from `/journal/text`, they currently land on a stub page. This spec replaces the stub with:

1. A **method picker** listing four guided-journaling methods.
2. A **working 1-1-1 runner** that walks the user through three prompts (gratitude, accomplishment, looking forward), saves the entry to the existing `/api/journal` pipeline, and shows AI insights on completion.
3. A **"Coming soon" view** for the three non-implemented methods, reachable from the picker.

Adding a new method later must be a ~10-line change in a single data file — no duplicated UI scaffolding.

## Non-goals

- No draft/resume persistence. Leaving mid-flow loses answers (matches freeform behavior).
- No new API routes. Guided entries land in `/api/journal` using the exact payload shape freeform uses.
- No component-test harness. Existing codebase has none and adding one is out of scope.
- No new design tokens. Uses the existing frame, type scale, and color palette.

## Architecture

New files:

```
src/
  app/journal/text/guided/
    page.tsx                    # method picker (server component)
    [method]/page.tsx           # runner / coming-soon dispatch (server component)
  components/
    guided-methods.ts           # data registry + pure transcript builder
    guided-method-card.tsx      # presentational card with ready/coming-soon states
    guided-prompt-runner.tsx    # step-by-step runner (client component)
  tests/guided/
    transcript.test.ts          # unit test for transcript builder
```

Existing `src/app/journal/text/guided/page.tsx` (the stub) is replaced.

### Data flow

```
/journal/text/guided                → picker reads GUIDED_METHODS, renders 4 cards
  ↓ (tap card, always navigates — no local state)
/journal/text/guided/[method]       → [method] page looks up method in registry
    status: "ready"                  →  <GuidedPromptRunner prompts={...} />
    status: "coming-soon"            →  <ComingSoonView />
    unknown key                      →  notFound()
```

The runner is a client component because it owns step state and submit state. Picker and `[method]` pages are server components — no client state at that level.

## Components

### `guided-methods.ts`

Data-only module. Defines the `GuidedMethod` type, exports `GUIDED_METHODS`, and exports a pure `buildGuidedTranscript` helper used by the runner and covered by unit tests.

```ts
type Prompt = { label: string; placeholder: string };

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
      { label: "1 thing I'm grateful for",
        placeholder: "Something small or big…" },
      { label: "1 thing I accomplished",
        placeholder: "Even the quiet wins count." },
      { label: "1 thing I'm looking forward to",
        placeholder: "Near or far future…" },
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
    .map((p, i) => `${p.label}\n${answers[i].trim()}`)
    .join("\n\n");
}
```

### `guided-method-card.tsx`

Presentational card, wrapped in a `<Link href="/journal/text/guided/${method.key}">`. Shows title and blurb. For `coming-soon` cards, adds a small right-aligned pill reading "Coming soon" and applies `opacity-60` to the card body. All cards remain tappable — tapping a coming-soon card navigates to the same route, which renders the placeholder view.

Uses existing type scale (`text-[16px]` title, `text-[13px]` blurb in `#8A8172`). Card frame matches `WritingModeCard` visually — rounded corners, soft surface, subtle border.

### `guided-prompt-runner.tsx`

`"use client"`. Props: `title: string`, `prompts: readonly Prompt[]`.

Internal state:

```ts
const [step, setStep] = useState(0);
const [answers, setAnswers] = useState<string[]>(() => prompts.map(() => ""));
const [submitting, setSubmitting] = useState(false);
const [submitError, setSubmitError] = useState<string | null>(null);
const [aiReply, setAiReply] = useState<JournalApiResponse | null>(null);
const [insightsOpen, setInsightsOpen] = useState(false);
const [userId, setUserId] = useState<number | null>(null);
```

User hydration on mount mirrors freeform:

```ts
useEffect(() => {
  // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate from localStorage on mount
  setUserId(loadUser()?.id ?? null);
}, []);
```

Layout (inside the existing 390×844 frame):

- Header: `BackButton`, title, and step indicator ("Step 2 of 3") in `#8A8172`.
- Body: current prompt label in `text-[22px] font-bold`, textarea below with the prompt's placeholder.
- Footer: Back button (navigates to picker on step 0, else decrements step) and Next button (becomes "Finish" on last step).

Navigation rules:

- Next / Finish is disabled when the current answer is whitespace-only.
- Back on step 0 navigates to `/journal/text/guided`; on step > 0 decrements and preserves answers in memory.
- Finish also disabled while `submitting` or when `userId === null`. When `userId === null`, renders inline message "Please sign in to save."

Finish handler:

```ts
const transcript = buildGuidedTranscript(prompts, answers);
const res = await fetch("/api/journal", {
  method: "POST",
  headers: { "Content-Type": "application/json", "x-user-id": String(userId) },
  body: JSON.stringify({ transcript, input_type: "text" }),
});
```

- On 2xx: `setAiReply(data); setInsightsOpen(true);`
- On non-2xx: inline error "Something went wrong. Please try again." — user retries by tapping Finish again.
- On network error: same error text.

`InsightsDialog` reuse matches freeform (`src/app/journal/text/freeform/page.tsx:272-285`). On dialog dismiss after a successful reply, `router.replace("/dashboard")` so the browser back button doesn't return to the completed runner.

### `[method]/page.tsx`

Server component. Reads `params.method`, finds the matching entry in `GUIDED_METHODS`.

- Unknown key → `notFound()`.
- `status === "coming-soon"` → renders an inline placeholder view: same frame shell, title card with blurb, a muted paragraph ("We're still building this one. Try the 1-1-1 Method while you wait."), and a `BackButton` to `/journal/text/guided`.
- `status === "ready"` → renders `<GuidedPromptRunner title={method.title} prompts={method.prompts!} />`.

The non-null assertion on `method.prompts` is safe because `status === "ready"` implies prompts are defined. The type could be tightened with a discriminated union if this is touched again, but keeping it simple for now.

### `page.tsx` (picker)

Server component. No local state — navigation happens via `<Link>`. Renders the shared frame, a header (`"Guided writing"` + subtitle `"Pick a method to begin."`), `BackButton` to `/journal/text`, and a vertical list of `GuidedMethodCard` components.

## Shell and visual design

All three new pages (picker, runner, coming-soon) use the existing frame pattern already shared by `/journal/text` and freeform:

```tsx
<main className="flex min-h-screen items-center justify-center bg-neutral-100">
  <div className="relative flex h-[844px] w-[390px] flex-col overflow-hidden rounded-[40px] bg-[#FCFAF7]">
    ...
  </div>
</main>
```

Type and color tokens reused from existing pages:

- `text-[26px] font-bold leading-[1.15] tracking-[-1px] text-[#1A1A1A]` for titles
- `text-[13px] text-[#8A8172]` for subtitles and meta
- `text-[#B8B0A7]` for placeholders
- `bg-[#1A1A1A] text-white` for primary buttons

No new design language. The step indicator is a small muted line of text, not a progress bar — matches the calm tone of the freeform experience.

## Error handling

| Situation | Behavior |
|---|---|
| Unknown method slug | `notFound()` |
| User not signed in | Finish button disabled, inline message "Please sign in to save." |
| Network / 5xx on submit | Inline error below textarea; Finish re-enabled for retry |
| Empty answer | Next/Finish disabled until non-whitespace content typed |
| `intent === "crisis"` in reply | `InsightsDialog` already renders crisis content; no additional handling needed since user cannot continue editing after submit |

## Testing

**Unit test** (`tests/guided/transcript.test.ts`):

- `buildGuidedTranscript` with empty answers produces the labeled blocks with blank content under each label.
- With real answers produces the exact expected string: three label/answer pairs separated by blank lines.
- Trims each answer (leading/trailing whitespace) but preserves internal newlines.

**Manual verification checklist** (executed after implementation, captured in the plan):

1. `/journal/text/guided` renders exactly four cards; only 1-1-1 lacks a "Coming soon" pill.
2. Tapping 1-1-1 opens the runner showing "Step 1 of 3" and the gratitude prompt.
3. Next button is disabled while textarea is empty; enabling occurs on first non-whitespace character.
4. Advancing to step 2, going Back, and returning forward preserves the step 1 answer in memory.
5. Back from step 1 returns to the picker.
6. Finish submits, `InsightsDialog` opens with AI reply, dismiss lands on `/dashboard`.
7. Tapping any "Coming soon" card shows the placeholder view with a working Back button.
8. Visiting `/journal/text/guided/foo` renders Next.js 404.

## Out of scope

- Per-method drafts in `sessionStorage`
- Cross-method analytics or streaks
- Customizable prompts
- Activating the other three methods (each will be its own future spec)

## Files touched

**New:**

- `src/app/journal/text/guided/[method]/page.tsx`
- `src/components/guided-methods.ts`
- `src/components/guided-method-card.tsx`
- `src/components/guided-prompt-runner.tsx`
- `tests/guided/transcript.test.ts`

**Replaced:**

- `src/app/journal/text/guided/page.tsx` (stub → real picker)

**Untouched but depended on:**

- `/api/journal` POST endpoint (no changes)
- `src/components/insights-dialog.tsx` (reused)
- `src/components/back-button.tsx` (reused)
- `src/lib/session.ts` (`loadUser`)
- `src/lib/types.ts` (`JournalApiResponse`)
