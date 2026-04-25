"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NotebookPen, User, Users } from "lucide-react";

type NavItem = {
  href: string;
  icon: typeof Users;
  label: string;
};

const SIDE_ITEMS: readonly [NavItem, NavItem] = [
  { href: "/community", icon: Users, label: "Community" },
  { href: "/profile", icon: User, label: "Profile" },
];

const DASHBOARD_HREF = "/dashboard";

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Primary" className="pointer-events-none absolute inset-x-5 bottom-2 h-[92px]">
      <div className="pointer-events-auto relative mx-auto flex h-[68px] w-full items-center justify-between rounded-full bg-[#1A1A1A] px-9 text-[#FCFAF7] shadow-[0_8px_24px_rgba(0,0,0,0.15)]">
        <SideButton item={SIDE_ITEMS[0]} active={pathname === SIDE_ITEMS[0].href} />
        <div aria-hidden className="w-[72px]" />
        <SideButton item={SIDE_ITEMS[1]} active={pathname === SIDE_ITEMS[1].href} />

        <CenterButton active={pathname === DASHBOARD_HREF} />
      </div>
    </nav>
  );
}

function SideButton({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  const color = active ? "#FCFAF7" : "#B8B0A7";

  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className="flex cursor-pointer flex-col items-center gap-1 transition-opacity hover:opacity-90 active:opacity-75"
    >
      <Icon className="h-[22px] w-[22px]" strokeWidth={1.75} color={color} />
      <span
        className="text-[10px] font-semibold leading-none tracking-[0.3px]"
        style={{ color }}
      >
        {item.label}
      </span>
    </Link>
  );
}

function CenterButton({ active }: { active: boolean }) {
  return (
    <Link
      href={DASHBOARD_HREF}
      aria-label="Dashboard"
      aria-current={active ? "page" : undefined}
      className="pointer-events-auto absolute left-1/2 top-1/2 flex h-20 w-20 -translate-x-1/2 -translate-y-[78%] cursor-pointer items-center justify-center rounded-full bg-[#FCFAF7] shadow-[0_12px_28px_rgba(168,129,194,0.55)] transition-transform hover:scale-[1.02] active:scale-95"
    >
      <span
        aria-hidden
        className="absolute h-[92px] w-[92px] rounded-full bg-[#A881C2]/20"
      />
      <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-[#A881C2]">
        <NotebookPen className="h-7 w-7 text-white" strokeWidth={1.75} />
      </span>
    </Link>
  );
}
