import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export function BackButton({ href = "/dashboard", label = "Back" }: { href?: string; label?: string }) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full bg-[#F5F2ED] text-[#1A1A1A] transition-opacity hover:opacity-90 active:opacity-80"
    >
      <ChevronLeft className="h-5 w-5" strokeWidth={1.75} />
    </Link>
  );
}
