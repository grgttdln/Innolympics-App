"use client";

import { Bell } from "lucide-react";

import { getTagalogGreeting } from "@/lib/greeting";

type DashboardHeaderProps = {
  name: string;
  now?: Date;
};

export function DashboardHeader({ name, now }: DashboardHeaderProps) {
  const trimmed = name.trim();
  const greeting = getTagalogGreeting(now ?? new Date());
  const initial = trimmed ? trimmed[0].toUpperCase() : "?";

  return (
    <div className="flex items-start justify-between">
      <div className="flex flex-col gap-1">
        <p className="text-[15px] leading-none text-[#666666]">{greeting}</p>
        {trimmed ? (
          <h1 className="font-[var(--font-geist-sans)] text-[32px] font-bold leading-none tracking-[-0.5px] text-[#1A1A1A]">
            {trimmed}
          </h1>
        ) : null}
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label="Notifications"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-[#F5F2ED] text-[#1A1A1A] transition-opacity hover:opacity-90 active:opacity-80"
        >
          <Bell className="h-5 w-5" strokeWidth={1.75} />
        </button>
        <div
          aria-label={`Profile ${trimmed || "user"}`}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-[#A881C2] text-base font-semibold text-white"
        >
          {initial}
        </div>
      </div>
    </div>
  );
}
