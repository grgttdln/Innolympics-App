import { ArrowUpRight } from "lucide-react";

import type { WritingMode } from "./writing-modes";

type WritingModeCardProps = {
  mode: WritingMode;
  selected: boolean;
  onSelect: (key: WritingMode["key"]) => void;
};

const SELECTED = {
  card: "bg-[#1A1A1A] shadow-[0_10px_24px_rgba(26,26,26,0.22)]",
  iconWrap: "bg-[#A881C2] shadow-[0_6px_20px_rgba(168,129,194,0.4)] text-white",
  title: "text-white",
  description: "text-[#E8E2D8]",
  arrowWrap: "bg-white/[0.09] text-white",
} as const;

const UNSELECTED = {
  card: "bg-white",
  iconWrap: "bg-[#F2EEE8] text-[#1A1A1A]",
  title: "text-[#1A1A1A]",
  description: "text-[#6B6256]",
  arrowWrap: "bg-[#F2EEE8] text-[#1A1A1A]",
} as const;

export function WritingModeCard({ mode, selected, onSelect }: WritingModeCardProps) {
  const Icon = mode.icon;
  const style = selected ? SELECTED : UNSELECTED;

  return (
    <button
      type="button"
      onClick={() => onSelect(mode.key)}
      aria-pressed={selected}
      className={`flex w-full cursor-pointer flex-col gap-3.5 rounded-[28px] px-[18px] pb-4 pt-[18px] text-left transition-colors duration-200 focus-visible:outline-none ${style.card}`}
    >
      <div className="flex items-center justify-between gap-3.5">
        <div className="flex items-center gap-3.5">
          <span
            aria-hidden
            className={`flex h-12 w-12 items-center justify-center rounded-2xl transition-colors duration-200 ${style.iconWrap}`}
          >
            <Icon className="h-[22px] w-[22px]" strokeWidth={1.75} />
          </span>
          <span
            className={`text-[19px] font-semibold leading-tight tracking-[-0.4px] transition-colors duration-200 ${style.title}`}
          >
            {mode.title}
          </span>
        </div>

        <span
          aria-hidden
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors duration-200 ${style.arrowWrap}`}
        >
          <ArrowUpRight className="h-4 w-4" strokeWidth={2} />
        </span>
      </div>

      <p
        className={`text-[13px] leading-[1.5] tracking-[0.1px] transition-colors duration-200 ${style.description}`}
      >
        {mode.description}
      </p>
    </button>
  );
}
