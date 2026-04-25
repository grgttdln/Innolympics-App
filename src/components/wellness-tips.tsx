import { ArrowRight, Timer } from "lucide-react";

type Variant = "lavender" | "dark" | "plum";

type Tip = {
  badge: string;
  title: string;
  description: string;
  duration: string;
  variant: Variant;
};

const TIPS: readonly Tip[] = [
  {
    badge: "MINDFULNESS",
    title: "Breathe first, friend.",
    description: "A 2-minute grounding exercise to reset your afternoon.",
    duration: "2 min",
    variant: "lavender",
  },
  {
    badge: "BREATHING",
    title: "Box breathing, 4×4.",
    description: "Calm your racing heart with a guided breathing loop.",
    duration: "1 min",
    variant: "dark",
  },
  {
    badge: "GROUNDING",
    title: "5-4-3-2-1, find your now.",
    description: "Anchor your senses when your mind starts to spiral.",
    duration: "3 min",
    variant: "plum",
  },
];

const THEMES: Record<
  Variant,
  {
    card: string;
    badge: string;
    title: string;
    description: string;
    meta: string;
    cta: string;
  }
> = {
  lavender: {
    card: "bg-[#E9DAF2]",
    badge: "bg-white text-[#5B3D78]",
    title: "text-[#1A1A1A]",
    description: "text-[#4A3F36]",
    meta: "text-[#4A3F36]",
    cta: "bg-[#1A1A1A] text-[#FCFAF7]",
  },
  dark: {
    card: "bg-[#1A1A1A]",
    badge: "bg-[#2A2A2A] text-[#A881C2]",
    title: "text-[#FCFAF7]",
    description: "text-[#B8B0A7]",
    meta: "text-[#B8B0A7]",
    cta: "bg-[#A881C2] text-white",
  },
  plum: {
    card: "bg-[#5B3D78]",
    badge: "bg-[#FCFAF7] text-[#5B3D78]",
    title: "text-[#FCFAF7]",
    description: "text-[#E9DAF2]",
    meta: "text-[#E9DAF2]",
    cta: "bg-[#A881C2] text-white",
  },
};

export function WellnessTips() {
  return (
    <section aria-labelledby="wellness-tips-heading" className="flex flex-col gap-4">
      <h2
        id="wellness-tips-heading"
        className="text-[16px] font-bold leading-tight tracking-[-0.2px] text-[#1A1A1A]"
      >
        Daily wellness tips
      </h2>

      <div className="-mx-6 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <ul className="flex w-max gap-3 px-6 pb-1">
          {TIPS.map((tip) => (
            <TipCard key={tip.title} tip={tip} />
          ))}
        </ul>
      </div>
    </section>
  );
}

function TipCard({ tip }: { tip: Tip }) {
  const theme = THEMES[tip.variant];

  return (
    <li
      className={`flex h-[177px] w-[210px] shrink-0 flex-col justify-between rounded-[20px] p-5 ${theme.card}`}
    >
      <div className="flex flex-col gap-2.5">
        <span
          className={`self-start rounded-full px-2.5 py-1 text-[10px] font-bold leading-none tracking-[0.8px] ${theme.badge}`}
        >
          {tip.badge}
        </span>
        <h3
          className={`text-[15px] font-bold leading-[1.25] tracking-[-0.2px] ${theme.title}`}
        >
          {tip.title}
        </h3>
        <p className={`text-[12px] leading-[1.35] ${theme.description}`}>
          {tip.description}
        </p>
      </div>

      <div className="flex items-center justify-between">
        <span
          className={`flex items-center gap-1 text-[11px] font-medium leading-none ${theme.meta}`}
        >
          <Timer className="h-3 w-3" strokeWidth={1.75} />
          {tip.duration}
        </span>
        <span
          aria-hidden
          className={`flex h-7 w-7 items-center justify-center rounded-full ${theme.cta}`}
        >
          <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
        </span>
      </div>
    </li>
  );
}
