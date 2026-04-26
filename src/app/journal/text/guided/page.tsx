import { BackButton } from "@/components/back-button";
import { GuidedMethodCard } from "@/components/guided-method-card";
import { GUIDED_METHODS } from "@/components/guided-methods";

export default function GuidedWritingPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-100">
      <div className="relative flex h-[844px] w-[390px] flex-col overflow-hidden rounded-[40px] bg-[#FCFAF7]">
        <div className="h-[54px] shrink-0" aria-hidden />

        <div className="flex items-center px-5 pb-3 pt-3">
          <BackButton href="/journal/text" />
        </div>

        <header className="flex flex-col items-center gap-2.5 px-7 pb-4 pt-3.5">
          <h1 className="text-center text-[26px] font-bold leading-[1.15] tracking-[-1px] text-[#1A1A1A]">
            Guided writing
          </h1>
          <p className="text-center text-[13px] leading-[1.45] tracking-[0.1px] text-[#8A8172]">
            Pick a method to begin.
          </p>
        </header>

        <div className="flex flex-1 flex-col gap-2.5 overflow-y-auto px-5 pb-6">
          {GUIDED_METHODS.map((method) => (
            <GuidedMethodCard key={method.key} method={method} />
          ))}
        </div>
      </div>
    </main>
  );
}
