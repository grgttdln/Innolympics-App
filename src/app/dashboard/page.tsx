"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { DashboardHeader } from "@/components/dashboard-header";
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
    setUser(stored);
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-100">
      <div className="relative flex h-[844px] w-[390px] flex-col overflow-hidden bg-white">
        <div className="h-[62px] shrink-0" aria-hidden />

        <div className="flex flex-1 flex-col gap-6 px-6 pb-6">
          {user ? <DashboardHeader name={user.name} /> : null}
        </div>
      </div>
    </main>
  );
}
