"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { BottomNav } from "@/components/bottom-nav";
import { DashboardHeader } from "@/components/dashboard-header";
import { JournalPicker } from "@/components/journal-picker";
import { loadUser, type StoredUser } from "@/lib/session";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<StoredUser | null>(null);

  useEffect(() => {
    const stored = loadUser();
    if (!stored) {
      router.replace("/login");
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate from localStorage on mount
    setUser(stored);
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-100">
      <div className="relative flex h-[844px] w-[390px] flex-col overflow-hidden bg-[#FCFAF7]">
        <div className="h-[54px] shrink-0" aria-hidden />

        <div className="flex flex-1 flex-col gap-4 px-5 pb-32 pt-2">
          {user ? <DashboardHeader name={user.name} /> : null}
          <JournalPicker />
        </div>

        <BottomNav />
      </div>
    </main>
  );
}
