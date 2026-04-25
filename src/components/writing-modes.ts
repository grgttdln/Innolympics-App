import { PenLine, PenTool } from "lucide-react";

export type WritingModeKey = "guided" | "freeform";

export type WritingMode = {
  key: WritingModeKey;
  icon: typeof PenLine;
  title: string;
  description: string;
  href: string;
};

export const WRITING_MODES: readonly WritingMode[] = [
  {
    key: "guided",
    icon: PenLine,
    title: "Guided writing",
    description:
      "Gentle prompts help you unpack what's on your mind — one small question at a time to write about.",
    href: "/journal/text/guided",
  },
  {
    key: "freeform",
    icon: PenTool,
    title: "Freeform writing",
    description:
      "Open a blank page and let your thoughts flow — no prompts, no structure, just you.",
    href: "/journal/text/freeform",
  },
];
