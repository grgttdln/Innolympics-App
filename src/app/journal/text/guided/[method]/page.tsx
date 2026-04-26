import { notFound } from "next/navigation";

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

  return <GuidedPromptRunner title={method.title} prompts={method.prompts} />;
}
