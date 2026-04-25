import { notFound } from "next/navigation";

import { BottomNav } from "@/components/bottom-nav";
import { WellnessPageHeader } from "@/components/wellness-page-header";
import {
  WELLNESS_TECHNIQUES,
  findTechniqueBySlug,
} from "@/components/wellness-techniques";

export function generateStaticParams() {
  return WELLNESS_TECHNIQUES.map((technique) => ({ slug: technique.slug }));
}

export default async function WellnessTechniquePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const technique = findTechniqueBySlug(slug);

  if (!technique) {
    notFound();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-100">
      <div className="relative flex h-[844px] w-[390px] flex-col overflow-hidden rounded-[40px] bg-[#FCFAF7]">
        <div className="h-[50px] shrink-0" aria-hidden />

        <WellnessPageHeader title={technique.title} backHref="/wellness" />

        <div className="flex flex-1 flex-col gap-4 px-6 pb-32 pt-6">
          <span className="self-start rounded-[10px] bg-[#5B3D78] px-2.5 py-1 text-[10px] font-bold leading-none tracking-[1px] text-white">
            {technique.badge}
          </span>
          <h2 className="text-[24px] font-bold leading-tight text-[#2A2A2A]">
            {technique.title}
          </h2>
          <p className="text-[15px] leading-relaxed text-[#666666]">
            {technique.description}
          </p>
          <p className="text-[14px] leading-relaxed text-[#B8B0A7]">
            Guided {technique.duration} session coming soon.
          </p>
        </div>

        <BottomNav />
      </div>
    </main>
  );
}
