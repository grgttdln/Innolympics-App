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
  prompts: readonly Prompt[];
};

export const GUIDED_METHODS: readonly GuidedMethod[] = [
  {
    key: "one-one-one",
    title: "1-1-1 Method",
    blurb: "One gratitude, one accomplishment, one thing ahead.",
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
    prompts: [
      { label: "1st thing I'm grateful for", placeholder: "Something close to you…" },
      { label: "2nd thing I'm grateful for", placeholder: "Someone who showed up…" },
      { label: "3rd thing I'm grateful for", placeholder: "A simple comfort…" },
      { label: "4th thing I'm grateful for", placeholder: "Something you're learning…" },
      { label: "5th thing I'm grateful for", placeholder: "Anything at all…" },
    ],
  },
  {
    key: "worry-dump",
    title: "Worry Dump",
    blurb: "Empty the noise, then release one thing.",
    prompts: [
      {
        label: "What's weighing on you?",
        placeholder: "Let it all out — messy is fine.",
      },
      {
        label: "One thing I can release for now",
        placeholder: "You can pick it back up tomorrow if needed.",
      },
    ],
  },
  {
    key: "evening",
    title: "Evening Reflection",
    blurb: "High, low, lesson, and tomorrow's priority.",
    prompts: [
      { label: "High point of today", placeholder: "A moment that stood out…" },
      { label: "Low point of today", placeholder: "Something that was hard…" },
      { label: "One thing I learned", placeholder: "About yourself, others, or the day…" },
      { label: "Tomorrow's one priority", placeholder: "Just one. Keep it kind." },
    ],
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
