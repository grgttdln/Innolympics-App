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
