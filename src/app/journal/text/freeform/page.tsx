import { BackButton } from "@/components/back-button";

export default function FreeformWritingPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-100">
      <div className="relative flex h-[844px] w-[390px] flex-col overflow-hidden rounded-[40px] bg-[#FCFAF7]">
        <div className="h-[54px] shrink-0" aria-hidden />

        <div className="flex items-center px-5 pb-3 pt-3">
          <BackButton href="/journal/text" />
        </div>

        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-7 text-center">
          <h1 className="text-[26px] font-bold leading-[1.15] tracking-[-1px] text-[#1A1A1A]">
            Freeform writing
          </h1>
          <p className="text-[14px] leading-[1.5] text-[#8A8172]">
            Blank-page editor coming soon.
          </p>
        </div>

        <div className="flex h-[34px] shrink-0 items-center justify-center" aria-hidden>
          <span className="h-[5px] w-[134px] rounded-full bg-[#1A1A1A]" />
        </div>
      </div>
    </main>
  );
}
