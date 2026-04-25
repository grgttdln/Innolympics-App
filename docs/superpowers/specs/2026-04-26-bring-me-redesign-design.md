# Bring Me (Visual Grounding) — UI Redesign

**Date:** 2026-04-26
**Branch:** `feat/ui-improvement`
**Route:** `/wellness/bring-me`
**Component under redesign:** `src/components/grounding-bring-me-game.tsx`
**Page under change:** `src/app/wellness/[slug]/page.tsx`

## Goal

Bring the visual style and state structure of the Bring Me grounding exercise in line with the rest of the wellness experiences — specifically matching the dark-card, three-state (intro → active → complete) shape established by `grounding-visualizer.tsx`, while preserving all existing functionality (camera capture, `/api/grounding-game` analysis, prompt rotation, fallback prompt logic, error messaging).

## Non-Goals

- No changes to `/api/grounding-game` route, request/response contract, or prompt list (`PROMPT_FLOW`).
- No changes to camera permission logic, `MediaStream` handling, canvas capture, or the fallback-prompt generator.
- No changes to other wellness techniques or the `WellnessPageHeader` component.
- No new dependencies, icon libraries, or design tokens.

## Why the `grounding-visualizer` pattern (not `mindfulness-visualizer`)

The Bring Me flow has the same shape as the 5-4-3-2-1 grounding exercise:

- Fixed multi-step loop (5 prompts) with AI validation between each step.
- Match / miss feedback that needs to be readable and dismissible.
- Intro → active → complete progression with a call-to-action on each end.

Mindfulness is a continuous breathing timer with no per-step branching; its purple-halo circular-timer visual doesn't map here. Grounding already owns the vocabulary we need: dark card, elongated pagination dots, slide-up feedback overlay, ghost-pill footer controls. Reusing it gives Bring Me immediate consistency without inventing new components.

## Design

### Container

Full-height dark card (`bg-[#1E1035]`, `rounded-[24px]`), self-stretched inside the existing `flex-1` slot on `/wellness/[slug]/page.tsx`. Matches the grounding container exactly so both grounding techniques render inside the same surface.

### State 1 — Intro

Visible when the user has not yet tapped **Begin**.

- `GROUNDING` pill (purple-tinted, `bg-rgba(168,129,194,0.15) text-[#A881C2]`, `tracking-[2px]`, `uppercase`).
- Title (white, 26px bold, centered): **"Find what you see."**
- Subtext (muted lavender, `rgba(168,129,194,0.55)`): "Point your camera at simple objects. Tala will guide you through five prompts."
- Small meta row: `5 PROMPTS · 2 MIN` (11px, lavender, tracked).
- Primary full-width pill button: **"I'm ready — Begin"**, `bg-[#5B3D78]`, 18px radius, with the grounding shadow recipe (`shadow-[0_4px_20px_rgba(91,61,120,0.35)]`) and `active:scale-[0.97]`.
- Tapping **Begin** switches state to Active and triggers `openCamera()` automatically so the user sees a live viewfinder on the first prompt.

### State 2 — Active (per prompt)

Top region:

- Large faded round-number watermark in the top-right (same treatment as `step.number` in grounding-visualizer: 130px, `opacity: 0.04`, white, negative `top/right`, `aria-hidden`). The number shown equals the current `round`.
- Pill: `ITEM {round} OF 5`.
- Prompt, centered, white 26px bold: e.g. **"Show me something yellow."**
- Hint below in muted lavender: "Point. Hold steady. Tap Check."

Viewfinder:

- 4:3 aspect, `rounded-[18px]`, black background, subtle purple border (`border border-[rgba(168,129,194,0.25)]`).
- Four L-shaped purple corner brackets (SVG, 24px arms, `#A881C2`, 2px stroke) at each corner of the viewfinder — signals "scanner" framing without mimicking a camera chrome.
- When `isAnalyzing` is true, the viewfinder gets a soft outer ring (`box-shadow: 0 0 0 3px rgba(168,129,194,0.25)`) and the "Check" button swaps to a spinner.

Footer controls row (inside the dark card):

- Left: small ghost round button (36×36, `rgba(168,129,194,0.18)` background, purple camera icon) that toggles `isCameraReady` via `openCamera` / `stopCamera`. When camera is off the icon becomes a "camera-off" variant.
- Center / right: primary pill **"Check item"** with a shutter icon, `bg-[#A881C2]`, height 44px. Disabled when `!isCameraReady || isAnalyzing`. Label changes to **"Checking…"** during analysis.

Pagination dots:

- 5 dots at the bottom, active dot elongated to 22×6, inactive 6×6 `rgba(255,255,255,0.18)`, same treatment as grounding.
- Active dot color: `#A881C2` normally; switches to pink `#f472b6` when the feedback overlay is showing a miss (matches grounding's convention).

Feedback overlay (slides up from bottom, dismissible by user action, not tap-outside):

- Panel: `bg-[#2A1848]`, top-radius `[28px]`, top shadow, drag-handle on top.
- Label: `✦ Tala` (match) in purple OR `✦ Tala says` (miss) in pink.
- Body: the `encouragement` string from the API response (or a local fallback if the API omitted it).
- Match: single full-width pill **"Next →"** (purple). On tap: dismiss overlay, advance `round`, load `nextPrompt` into `prompt`, keep camera running.
- Miss: **"Try again"** (pink ghost pill) + subtle text link **"Skip this one"** (advances using the fallback prompt generator).
- If `payload.gameComplete === true` on a match, tapping the primary button switches state to Complete.

Camera error handling:

- Unchanged logic, but rendered inside the dark card: a muted pink banner `rgba(244,114,182,0.12) text-[#f9a8d4]` sitting above the controls when `cameraError && !isCameraReady`.

### State 3 — Complete

Same container as grounding's done screen:

- Centered ✦ glyph, 56px.
- Title: **"You're here."**
- Subtext (muted lavender): "Five small anchors. You grounded yourself — carry this presence with you."
- Full-width pill **"Done"** (`#A881C2`). Tapping returns to `/wellness` via `<a href>` (matches grounding; no router import needed).
- Secondary ghost link **"Play again"** that resets `round`, `prompt`, `usedPrompts`, and `feedback`, stops the camera, and returns to the Intro state (new — a small polish grounding doesn't have, because Bring Me's prompt pool supports replay and users commonly want a second round).

### Motion and Accessibility

- Reuse grounding's `@keyframes slideUp` for the feedback overlay and its `cubic-bezier(0.16, 1, 0.3, 1)` easing.
- Prompt text fade-in reuses the same `opacity + translateY(14px)` pattern already present in grounding (`visible` flag).
- Add `@media (prefers-reduced-motion: reduce)` to neutralize `slideUp` and the fade transforms (this is the one piece grounding itself doesn't yet have — bringing it in here while we touch the file).
- Every interactive element keeps a visible focus ring via existing Tailwind defaults; no `outline: none` without replacement.
- Buttons meet 44×44 touch-target minimum; footer ghost button uses `hitSlop`-equivalent padding.
- `aria-label` on the camera toggle and the corner-bracket SVG wrapper is `aria-hidden`.
- `role="status" aria-live="polite"` on the feedback overlay body so screen readers announce the encouragement without stealing focus.

### Page-level change

`src/app/wellness/[slug]/page.tsx`:

- Add `showGroundingGame` to the set that sets `hideHeroCopy = true`. The intro state inside the new game component already owns the badge + title + copy; keeping the page-level hero would duplicate it.

## Data Flow (unchanged)

```
openCamera()  ─►  MediaStream  ─►  <video>
Tap "Check"   ─►  canvas.drawImage → base64 → POST /api/grounding-game
                  response: { isMatch, encouragement, nextPrompt, gameComplete }
isMatch=true  ─►  show overlay (match) → Next → advance prompt/round/usedPrompts
isMatch=false ─►  show overlay (miss)  → Try again (dismiss) | Skip (advance via fallback)
gameComplete  ─►  switch to Complete state
```

All existing console logging, error branches, and fallback-prompt selection survive the redesign verbatim.

## File-Level Changes

1. `src/components/grounding-bring-me-game.tsx` — full rewrite of the JSX tree and styling; state machine gains a `phase: 'intro' | 'active' | 'done'` variable plus overlay state. Keep existing refs, effects, and async functions byte-identical where possible.
2. `src/app/wellness/[slug]/page.tsx` — extend the `hideHeroCopy` condition to include `showGroundingGame`.
3. No new files. No new dependencies.

## Success Criteria

- Visiting `/wellness/bring-me` shows the dark-card intro with "I'm ready — Begin".
- Tapping Begin requests camera permission; on grant, the active prompt appears with live viewfinder and corner brackets.
- The round indicator ("ITEM 1 OF 5") matches the pagination dot position.
- Successful "Check" produces a purple slide-up overlay with "Next →"; advances prompt/round on tap.
- Unsuccessful "Check" produces a pink slide-up overlay with "Try again" / "Skip".
- On the fifth successful match (or `gameComplete`), the Complete state renders with "You're here." and "Done" / "Play again".
- Camera errors render inside the dark card without breaking layout.
- `prefers-reduced-motion` disables the slide-up and fade motion.
- No regression on any other wellness slug.
