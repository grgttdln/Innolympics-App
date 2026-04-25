import Link from "next/link";
import { ArrowUpRight, Calendar, Mic, PenLine, ShieldCheck } from "lucide-react";

type Mode = {
  href: string;
  icon: typeof Mic;
  title: string;
  description: string;
  card: string;
  iconWrap: string;
  accent: string;
  hoverRing: string;
};

const MODES: readonly Mode[] = [
  {
    href: "/journal/voice",
    icon: Mic,
    title: "Voice",
    description: "Speak freely — we'll transcribe it",
    card: "bg-[#A881C2]",
    iconWrap: "bg-white/[0.15]",
    accent: "text-white/80",
    hoverRing: "hover:ring-[#FCFAF7] active:ring-[#FCFAF7] focus-visible:ring-[#FCFAF7]",
  },
  {
    href: "/journal/text",
    icon: PenLine,
    title: "Text",
    description: "Write it down in your own words",
    card: "bg-[#1A1A1A]",
    iconWrap: "bg-white/[0.10]",
    accent: "text-white/80",
    hoverRing: "hover:ring-[#A881C2] active:ring-[#A881C2] focus-visible:ring-[#A881C2]",
  },
];

export function JournalPicker({ date = new Date() }: { date?: Date } = {}) {
  return (
    <section
      aria-labelledby="journal-picker-heading"
      className="flex flex-col"
    >
      <div className="flex flex-col gap-6">
        <div className="mt-4">
          <DateChip date={date} />
        </div>

        <div className="flex flex-col gap-3">
          <h2
            id="journal-picker-heading"
            className="text-[32px] font-bold leading-[1.15] tracking-[-1px] text-[#1A1A1A]"
          >
            Tell me what&apos;s on your mind.
          </h2>
          <p className="text-[15px] leading-[1.5] text-[#6B6259]">
            Take a moment to check in with yourself. No judgment — just presence, your way.
          </p>
        </div>

        <ul className="flex flex-col gap-3.5">
          {MODES.map((mode) => (
            <ModeCard key={mode.href} mode={mode} />
          ))}
        </ul>
      </div>

      <p className="mt-4 flex items-center justify-center gap-1.5 text-[11px] font-medium text-[#B8B0A7]">
        <ShieldCheck className="h-3 w-3" strokeWidth={1.75} aria-hidden />
        Private — only you can see this
      </p>
    </section>
  );
}

function DateChip({ date }: { date: Date }) {
  const formatted = date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const [weekday, month] = formatted.split(", ");

  return (
    <span className="flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.4px] text-[#B8B0A7]">
      <Calendar className="h-3 w-3" strokeWidth={1.75} aria-hidden />
      {weekday} • {month}
    </span>
  );
}

function ModeCard({ mode }: { mode: Mode }) {
  const Icon = mode.icon;

  return (
    <li>
      <Link
        href={mode.href}
        className={`group flex cursor-pointer items-center gap-5 rounded-[26px] px-6 py-8 ring-2 ring-inset ring-transparent transition-shadow duration-200 focus-visible:outline-none ${mode.hoverRing} ${mode.card}`}
      >
        <span
          aria-hidden
          className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-full ${mode.iconWrap}`}
        >
          <Icon className="h-[30px] w-[30px] text-white" strokeWidth={1.75} />
        </span>

        <div className="flex flex-1 flex-col gap-1.5">
          <span className="text-[26px] font-bold leading-[1.15] tracking-[-0.4px] text-white">
            {mode.title}
          </span>
          <span className={`text-[14px] font-medium leading-snug ${mode.accent}`}>
            {mode.description}
          </span>
        </div>

        <ArrowUpRight
          className="h-5 w-5 shrink-0 text-white transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
          strokeWidth={1.75}
          aria-hidden
        />
      </Link>
    </li>
  );
}
