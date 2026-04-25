import { BottomNav } from "@/components/bottom-nav";
import { WellnessPageHeader } from "@/components/wellness-page-header";
import { WellnessTechniqueCard } from "@/components/wellness-technique-card";
import { WELLNESS_TECHNIQUES } from "@/components/wellness-techniques";

export default function WellnessPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-100">
      <div className="relative flex h-[844px] w-[390px] flex-col overflow-hidden rounded-[40px] bg-[#FCFAF7]">
        <div className="h-[50px] shrink-0" aria-hidden />

        <WellnessPageHeader title="Wellness" />

        <div className="flex items-center justify-between px-5 pb-4 pt-6">
          <h2 className="text-[17px] font-bold leading-tight text-[#2A2A2A]">
            Daily wellness tips
          </h2>
        </div>

        <p className="px-5 pb-8 text-[14px] leading-normal text-[#B8B0A7]">
          Pick a technique to ease your mind.
        </p>

        <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-5 pb-32 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {WELLNESS_TECHNIQUES.map((technique) => (
            <WellnessTechniqueCard key={technique.slug} technique={technique} />
          ))}
        </div>

        <BottomNav />
      </div>
    </main>
  );
}
