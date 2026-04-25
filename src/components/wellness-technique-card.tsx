import Link from "next/link";
import { ArrowRight, Timer } from "lucide-react";

export type WellnessTechniqueVariant = "lavender" | "dark" | "plum";

export type WellnessTechnique = {
  slug: string;
  badge: string;
  title: string;
  description: string;
  duration: string;
  variant: WellnessTechniqueVariant;
};

const THEMES: Record<
  WellnessTechniqueVariant,
  {
    card: string;
    badge: string;
    badgeText: string;
    title: string;
    description: string;
    timeBadge: string;
    timeIcon: string;
    timeText: string;
    cta: string;
  }
> = {
  lavender: {
    card: "bg-[#E9DAF2]",
    badge: "bg-[#5B3D78]",
    badgeText: "text-white",
    title: "text-[#2A2A2A]",
    description: "text-[#4A3F36]",
    timeBadge: "bg-white",
    timeIcon: "text-[#5B3D78]",
    timeText: "text-[#5B3D78]",
    cta: "bg-[#5B3D78] text-white",
  },
  dark: {
    card: "bg-[#1A1A1A]",
    badge: "bg-[#A881C2]",
    badgeText: "text-white",
    title: "text-[#FCFAF7]",
    description: "text-[#B8B0A7]",
    timeBadge: "bg-[#2A2A2A]",
    timeIcon: "text-[#A881C2]",
    timeText: "text-[#E9DAF2]",
    cta: "bg-[#A881C2] text-white",
  },
  plum: {
    card: "bg-[#5B3D78]",
    badge: "bg-[#E9DAF2]",
    badgeText: "text-[#5B3D78]",
    title: "text-[#FCFAF7]",
    description: "text-[#E9DAF2]",
    timeBadge: "bg-[#FCFAF7]",
    timeIcon: "text-[#5B3D78]",
    timeText: "text-[#5B3D78]",
    cta: "bg-[#A881C2] text-white",
  },
};

export function WellnessTechniqueCard({ technique }: { technique: WellnessTechnique }) {
  const theme = THEMES[technique.variant];

  return (
    <Link
      href={`/wellness/${technique.slug}`}
      className={`flex items-center gap-3 rounded-[24px] py-[18px] pl-5 pr-[18px] transition-transform active:scale-[0.99] ${theme.card}`}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <span
          className={`self-start rounded-[10px] px-2.5 py-1 text-[10px] font-bold leading-none tracking-[1px] ${theme.badge} ${theme.badgeText}`}
        >
          {technique.badge}
        </span>
        <h3 className={`text-[18px] font-bold leading-tight ${theme.title}`}>
          {technique.title}
        </h3>
        <p className={`text-[13px] leading-[1.4] ${theme.description}`}>
          {technique.description}
        </p>
        <div className="pt-0.5">
          <span
            className={`inline-flex items-center gap-1 rounded-xl py-1 pl-2 pr-2.5 ${theme.timeBadge}`}
          >
            <Timer
              className={`h-3 w-3 ${theme.timeIcon}`}
              strokeWidth={1.75}
            />
            <span className={`text-[11px] font-semibold leading-none ${theme.timeText}`}>
              {technique.duration}
            </span>
          </span>
        </div>
      </div>

      <span
        aria-hidden
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${theme.cta}`}
      >
        <ArrowRight className="h-5 w-5" strokeWidth={2} />
      </span>
    </Link>
  );
}
