import Link from "next/link";
import { ChevronLeft } from "lucide-react";

type WellnessPageHeaderProps = {
  title: string;
  backHref?: string;
};

export function WellnessPageHeader({ title, backHref = "/dashboard" }: WellnessPageHeaderProps) {
  return (
    <div className="flex items-center justify-between px-5 pb-1 pt-3">
      <Link
        href={backHref}
        aria-label="Back"
        className="flex h-10 w-10 items-center justify-center rounded-full border border-[#E9DAF2] bg-white text-[#2A2A2A] transition-opacity hover:opacity-90 active:opacity-80"
      >
        <ChevronLeft className="h-[22px] w-[22px]" strokeWidth={1.75} />
      </Link>

      <h1 className="text-[18px] font-semibold leading-none text-[#2A2A2A]">
        {title}
      </h1>

      <div aria-hidden className="h-10 w-10" />
    </div>
  );
}
