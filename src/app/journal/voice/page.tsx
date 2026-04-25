import { BackButton } from "@/components/back-button";

export default function VoiceJournalPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-100">
      <div className="relative flex h-[844px] w-[390px] flex-col overflow-hidden bg-white">
        <div className="h-[62px] shrink-0" aria-hidden />

        <div className="flex flex-1 flex-col gap-6 px-6">
          <BackButton />
          <div className="flex flex-col gap-2">
            <h1 className="font-[var(--font-geist-sans)] text-[26px] font-bold tracking-[-0.3px] text-[#1A1A1A]">
              Voice journaling
            </h1>
            <p className="text-[15px] leading-normal text-[#666666]">
              Tap record when you&apos;re ready — we&apos;ll transcribe it for you.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
