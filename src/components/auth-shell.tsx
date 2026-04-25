"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

type AuthShellProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
  backHref?: string;
};

export function AuthShell({
  title,
  subtitle,
  children,
  backHref = "/",
}: AuthShellProps) {
  const router = useRouter();

  function handleBack() {
    if (window.history.length > 1) {
      router.back();
      return;
    }
    router.push(backHref);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-100">
      <div className="relative flex h-[844px] w-[390px] flex-col overflow-hidden bg-white">
        <div className="h-[62px] shrink-0" aria-hidden />

        <div className="flex flex-1 flex-col gap-6 px-6 pb-6">
          <button
            type="button"
            onClick={handleBack}
            aria-label="Go back"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-[#F5F2ED] text-[#1A1A1A] transition-opacity hover:opacity-80 active:opacity-60"
          >
            <ArrowLeft className="h-5 w-5" strokeWidth={2} />
          </button>

          <div className="flex flex-col gap-2.5">
            <h1 className="font-[var(--font-geist-sans)] text-[36px] font-bold leading-none tracking-[-1px] text-[#1A1A1A]">
              {title}
            </h1>
            <p className="text-[15px] leading-[1.45] text-[#666666]">
              {subtitle}
            </p>
          </div>

          {children}

          <div className="mt-auto flex justify-center">
            <p className="text-center text-[11px] leading-[1.5] text-[#999999]">
              By continuing, you agree to our Terms of Service and Privacy
              Policy
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
