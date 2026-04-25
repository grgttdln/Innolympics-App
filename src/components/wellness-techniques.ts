import type { WellnessTechnique } from "@/components/wellness-technique-card";

export const WELLNESS_TECHNIQUES: readonly WellnessTechnique[] = [
  {
    slug: "mindfulness",
    badge: "MINDFULNESS",
    title: "Breathe first, friend.",
    description: "A gentle 2-minute reset.",
    duration: "2 min",
    variant: "lavender",
  },
  {
    slug: "breathing",
    badge: "BREATHING",
    title: "Box breathing, 4×4.",
    description: "Inhale, hold, exhale, hold.",
    duration: "1 min",
    variant: "dark",
  },
  {
    slug: "grounding",
    badge: "GROUNDING",
    title: "5-4-3-2-1, find your now.",
    description: "Anchor your senses gently.",
    duration: "3 min",
    variant: "plum",
  },
];

export function findTechniqueBySlug(slug: string): WellnessTechnique | undefined {
  return WELLNESS_TECHNIQUES.find((technique) => technique.slug === slug);
}
