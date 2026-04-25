"use client";

import { BottomNav } from "@/components/bottom-nav";

export default function ProfilePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-100">
      <div className="relative flex h-[844px] w-[390px] flex-col overflow-hidden bg-white">
        <div className="h-[62px] shrink-0" aria-hidden />

        <div className="flex flex-1 flex-col gap-6 px-6 pb-32">
          <h1 className="font-[var(--font-geist-sans)] text-[26px] font-bold tracking-[-0.3px] text-[#1A1A1A]">
            Profile
          </h1>
          <p className="text-[15px] leading-normal text-[#666666]">
            Manage your account and preferences.
          </p>
        </div>

        <BottomNav />
      </div>
    </main>
  );
}
