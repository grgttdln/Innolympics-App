import Link from "next/link";
import { ArrowRight, Timer, Sparkles, Wind, Anchor, type LucideIcon } from "lucide-react";

export type WellnessTechniqueCategory = "mindfulness" | "breathing" | "grounding";

export type WellnessTechnique = {
  slug: string;
  badge: string;
  title: string;
  description: string;
  duration: string;
  category: WellnessTechniqueCategory;
};

const CATEGORY_STYLES: Record<
  WellnessTechniqueCategory,
  {
    icon: LucideIcon;
    medallionBg: string;
    medallionIcon: string;
    accent: string;
  }
> = {
  mindfulness: {
    icon: Sparkles,
    medallionBg: "bg-[#F3E8FA]",
    medallionIcon: "text-[#A881C2]",
    accent: "text-[#A881C2]",
  },
  breathing: {
    icon: Wind,
    medallionBg: "bg-[#EDE1F4]",
    medallionIcon: "text-[#7B5A94]",
    accent: "text-[#7B5A94]",
  },
  grounding: {
    icon: Anchor,
    medallionBg: "bg-[#E9DAF2]",
    medallionIcon: "text-[#5B3D78]",
    accent: "text-[#5B3D78]",
  },
};

export function WellnessTechniqueCard({ technique }: { technique: WellnessTechnique }) {
  const style = CATEGORY_STYLES[technique.category];
  const Icon = style.icon;

  return (
    <Link
      href={`/wellness/${technique.slug}`}
      className="group flex items-center gap-4 rounded-[24px] border border-[#EFE6D9] bg-white p-4 shadow-[0_1px_2px_rgba(43,30,61,0.04),0_4px_16px_-8px_rgba(43,30,61,0.08)] transition-all active:scale-[0.99] active:shadow-[0_1px_2px_rgba(43,30,61,0.04)]"
    >
      <span
        aria-hidden
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${style.medallionBg}`}
      >
        <Icon className={`h-[22px] w-[22px] ${style.medallionIcon}`} strokeWidth={1.75} />
      </span>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center gap-2">
          <span
            className={`text-[10px] font-bold leading-none tracking-[1px] ${style.accent}`}
          >
            {technique.badge}
          </span>
          <span aria-hidden className="h-1 w-1 rounded-full bg-[#D8CDBE]" />
          <span className="inline-flex items-center gap-1 text-[#8A8274]">
            <Timer className="h-3 w-3" strokeWidth={1.75} />
            <span className="text-[11px] font-semibold leading-none">
              {technique.duration}
            </span>
          </span>
        </div>
        <h3 className="text-[16px] font-bold leading-tight text-[#2A2A2A]">
          {technique.title}
        </h3>
        <p className="truncate text-[13px] leading-[1.4] text-[#8A8274]">
          {technique.description}
        </p>
      </div>

      <span
        aria-hidden
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F5EEE4] text-[#5B3D78] transition-colors group-active:bg-[#E9DAF2]"
      >
        <ArrowRight className="h-[18px] w-[18px]" strokeWidth={2} />
      </span>
    </Link>
  );
}
