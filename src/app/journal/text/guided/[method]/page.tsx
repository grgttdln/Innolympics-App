import { notFound } from "next/navigation";

import { BackButton } from "@/components/back-button";
import { GuidedPromptRunner } from "@/components/guided-prompt-runner";
import {
  GUIDED_METHODS,
  type GuidedMethod,
  type GuidedMethodKey,
} from "@/components/guided-methods";

type PageProps = {
  params: Promise<{ method: string }>;
};

function findMethod(key: string): GuidedMethod | undefined {
  return GUIDED_METHODS.find(
    (m): m is GuidedMethod => m.key === (key as GuidedMethodKey),
  );
}

export default async function GuidedMethodPage({ params }: PageProps) {
  const { method: methodKey } = await params;
  const method = findMethod(methodKey);

  if (!method) {
    notFound();
  }

  if (method.status === "coming-soon") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-neutral-100">
        <div className="relative flex h-[844px] w-[390px] flex-col overflow-hidden rounded-[40px] bg-[#FCFAF7]">
          <div className="h-[54px] shrink-0" aria-hidden />

          <div className="flex items-center px-5 pb-3 pt-3">
            <BackButton href="/journal/text/guided" />
          </div>

          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-7 text-center">
            <span className="rounded-full bg-[#F2EEE8] px-3 py-1 text-[10px] font-semibold uppercase tracking-[1px] text-[#8A8172]">
              Coming soon
            </span>
            <h1 className="text-[26px] font-bold leading-[1.15] tracking-[-1px] text-[#1A1A1A]">
              {method.title}
            </h1>
            <p className="max-w-[280px] text-[14px] leading-[1.5] text-[#8A8172]">
              We&apos;re still building this one. Try the 1-1-1 Method while you
              wait.
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (!method.prompts) {
    notFound();
  }

  return (
    <GuidedPromptRunner title={method.title} prompts={method.prompts} />
  );
}
