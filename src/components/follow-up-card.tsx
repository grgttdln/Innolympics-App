import Link from "next/link";
import { HeartHandshake, Plus, Sparkles } from "lucide-react";

type FollowUpCardProps = {
  question: string;
  onUse: () => void;
  onDismiss: () => void;
};

export function FollowUpCard({ question, onUse, onDismiss }: FollowUpCardProps) {
  return (
    <div className="flex flex-col gap-2.5 rounded-[20px] border border-[#E9DAF2] bg-[#F4EEF9] p-3.5">
      <div className="flex items-center gap-1.5">
        <span
          aria-hidden
          className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-[#A881C2]"
        >
          <Sparkles className="h-3 w-3 text-white" strokeWidth={2} />
        </span>
        <span className="text-[11px] font-bold uppercase tracking-[1px] text-[#5B3D78]">
          Follow-up Question
        </span>
      </div>

      <p className="text-[15px] font-medium leading-[1.45] text-[#1A1A1A]">
        {question}
      </p>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onUse}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-[#1A1A1A] px-3 py-2 text-[12px] font-semibold text-white transition-opacity hover:opacity-90 active:opacity-80"
        >
          <Plus className="h-3 w-3" strokeWidth={2.5} />
          Use this
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="cursor-pointer rounded-full bg-white px-3 py-2 text-[12px] font-semibold text-[#6B6259] transition-opacity hover:opacity-90 active:opacity-80"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}

export function SupportCard() {
  return (
    <div className="flex flex-col gap-3 rounded-[20px] border border-[#F3D6D0] bg-[#FBEDE9] p-4">
      <div className="flex items-center gap-1.5">
        <span
          aria-hidden
          className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-[#C06B5D]"
        >
          <HeartHandshake className="h-3 w-3 text-white" strokeWidth={2} />
        </span>
        <span className="text-[11px] font-bold uppercase tracking-[1px] text-[#8A3A2E]">
          Support
        </span>
      </div>

      <div className="flex flex-col gap-1">
        <p className="text-[15px] font-semibold leading-[1.35] text-[#1A1A1A]">
          It sounds like this is heavy.
        </p>
        <p className="text-[13px] leading-[1.5] text-[#6B4A43]">
          You don&apos;t have to sit with this alone. Reaching out can help.
        </p>
      </div>

      <ul className="flex flex-col gap-1 text-[13px] text-[#1A1A1A]">
        <li>
          <span className="font-semibold">NCMH Crisis Hotline</span>
          <span className="text-[#6B4A43]"> · 1553 (toll-free PH)</span>
        </li>
        <li>
          <span className="font-semibold">Hopeline PH</span>
          <span className="text-[#6B4A43]"> · (02) 8804-HOPE (4673)</span>
        </li>
      </ul>

      <Link
        href="/dashboard"
        className="mt-1 inline-flex w-fit cursor-pointer items-center gap-1.5 rounded-full bg-[#1A1A1A] px-3 py-2 text-[12px] font-semibold text-white transition-opacity hover:opacity-90 active:opacity-80"
      >
        Leave and return later
      </Link>
    </div>
  );
}
