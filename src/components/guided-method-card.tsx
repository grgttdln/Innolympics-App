import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import type { GuidedMethod } from "./guided-methods";

type Props = {
  method: GuidedMethod;
};

export function GuidedMethodCard({ method }: Props) {
  return (
    <Link
      href={`/journal/text/guided/${method.key}`}
      className="flex w-full flex-col gap-2.5 rounded-[28px] bg-white px-[18px] pb-4 pt-[18px] text-left transition-opacity duration-200 active:opacity-80"
    >
      <div className="flex items-center justify-between gap-3.5">
        <span className="text-[19px] font-semibold leading-tight tracking-[-0.4px] text-[#1A1A1A]">
          {method.title}
        </span>
        <span
          aria-hidden
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F2EEE8] text-[#1A1A1A]"
        >
          <ArrowUpRight className="h-4 w-4" strokeWidth={2} />
        </span>
      </div>
      <p className="text-[13px] leading-[1.5] tracking-[0.1px] text-[#6B6256]">
        {method.blurb}
      </p>
    </Link>
  );
}
