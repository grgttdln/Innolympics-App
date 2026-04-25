"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight } from "lucide-react";

import { BackButton } from "@/components/back-button";
import { WritingModeCard } from "@/components/writing-mode-card";
import { WRITING_MODES, type WritingModeKey } from "@/components/writing-modes";

export default function TextJournalPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<WritingModeKey>("guided");

  const handleStart = () => {
    const mode = WRITING_MODES.find((m) => m.key === selected);
    if (mode) router.push(mode.href);
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-100">
      <div className="relative flex h-[844px] w-[390px] flex-col overflow-hidden rounded-[40px] bg-[#FCFAF7]">
        <div className="h-[54px] shrink-0" aria-hidden />

        <div className="flex items-center px-5 pb-3 pt-3">
          <BackButton href="/dashboard" />
        </div>

        <header className="flex flex-col items-center gap-2.5 px-7 pb-4 pt-3.5">
          <h1 className="text-center text-[26px] font-bold leading-[1.15] tracking-[-1px] text-[#1A1A1A]">
            How do you want to write?
          </h1>
          <p className="text-center text-[13px] leading-[1.45] tracking-[0.1px] text-[#8A8172]">
            Pick how you&apos;d like to begin typing. You can always switch
            mid-entry.
          </p>
        </header>

        <div className="flex flex-1 flex-col gap-2.5 px-5 pb-4">
          {WRITING_MODES.map((mode) => (
            <WritingModeCard
              key={mode.key}
              mode={mode}
              selected={selected === mode.key}
              onSelect={setSelected}
            />
          ))}
        </div>

        <div className="px-5 pb-6">
          <button
            type="button"
            onClick={handleStart}
            className="flex h-[54px] w-full cursor-pointer items-center justify-center gap-2.5 rounded-full bg-[#1A1A1A] text-[15px] font-semibold tracking-[0.1px] text-white shadow-[0_8px_18px_rgba(26,26,26,0.2)] transition-opacity hover:opacity-90 active:opacity-80"
          >
            Start writing
            <ArrowRight className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>

      </div>
    </main>
  );
}
