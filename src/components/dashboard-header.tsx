"use client";

import { Bell } from "lucide-react";
import { NotificationBell } from "./notification-bell";

import { getGreeting } from "@/lib/greeting";

type DashboardHeaderProps = {
  name: string;
  now?: Date;
};

export function DashboardHeader({ name, now }: DashboardHeaderProps) {
  const trimmed = name.trim();
  const greeting = getGreeting(now ?? new Date());
  const initial = trimmed ? trimmed[0].toUpperCase() : "?";

  return (
    <div className="flex items-start justify-between">
      <div className="flex flex-col gap-1">
        <p className="text-[15px] leading-none text-[#666666]">{greeting}</p>
        {trimmed ? (
          <h1 className="font-[var(--font-geist-sans)] text-[26px] font-bold leading-none tracking-[-0.3px] text-[#1A1A1A]">
            {trimmed}
          </h1>
        ) : null}
      </div>

      <div className="flex items-center gap-3">
        <NotificationBell />
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
