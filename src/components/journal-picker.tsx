import Link from "next/link";
import { ArrowRight, Mic, PenLine, Timer } from "lucide-react";

type Mode = {
  href: string;
  icon: typeof Mic;
  title: string;
  description: string;
  duration: string;
  card: string;
  iconWrap: string;
  accent: string;
  descColor: string;
  metaColor: string;
  ctaBg: string;
};

const MODES: readonly Mode[] = [
  {
    href: "/journal/voice",
    icon: Mic,
    title: "Voice",
    description: "Speak freely, we'll transcribe it.",
    duration: "1–3 min",
    card: "bg-[#A881C2] ring-[1.5px] ring-inset ring-[#FCFAF7]/50",
    iconWrap: "bg-[#FCFAF7]",
    accent: "text-[#5B3D78]",
    descColor: "text-white/80",
    metaColor: "text-white/80",
    ctaBg: "bg-white",
  },
  {
    href: "/journal/text",
    icon: PenLine,
    title: "Text",
    description: "Write it out, at your own pace.",
    duration: "2–5 min",
    card: "bg-[#2A2A2A] ring-1 ring-inset ring-white/10",
    iconWrap: "bg-white/[0.07]",
    accent: "text-[#FCFAF7]",
    descColor: "text-[#B8B0A7]",
    metaColor: "text-[#B8B0A7]",
    ctaBg: "bg-white/[0.07]",
  },
];

const HIGHLIGHT =
  "hover:shadow-[0_0_0_2px_#A881C2] active:shadow-[0_0_0_2px_#A881C2] focus-visible:shadow-[0_0_0_2px_#A881C2] focus-visible:outline-none";

export function JournalPicker() {
  return (
    <section
      aria-labelledby="journal-picker-heading"
      className="flex flex-col gap-4 rounded-[24px] bg-[#1A1A1A] p-5"
    >
      <div className="flex flex-col gap-1.5">
        <h2
          id="journal-picker-heading"
          className="text-[22px] font-bold leading-[1.2] tracking-[-0.3px] text-[#FCFAF7]"
        >
          Tell me what&apos;s on your mind.
        </h2>
        <p className="text-[13px] leading-[1.3] text-[#B8B0A7]">
          Choose how you&apos;d like to journal today.
        </p>
      </div>

      <ul className="grid grid-cols-2 gap-3">
        {MODES.map((mode) => (
          <ModeCard key={mode.href} mode={mode} />
        ))}
      </ul>
    </section>
  );
}

function ModeCard({ mode }: { mode: Mode }) {
  const Icon = mode.icon;

  return (
    <li>
      <Link
        href={mode.href}
        className={`group flex cursor-pointer flex-col gap-4 rounded-[18px] p-4 transition-shadow duration-200 ${HIGHLIGHT} ${mode.card}`}
      >
        <span
          aria-hidden
          className={`flex h-11 w-11 items-center justify-center rounded-full ${mode.iconWrap} ${mode.accent}`}
        >
          <Icon className="h-[22px] w-[22px]" strokeWidth={1.75} />
        </span>

        <div className="flex flex-col gap-1">
          <span className="text-[16px] font-bold leading-[1.2] tracking-[-0.2px] text-white">
            {mode.title}
          </span>
          <span className={`text-[11px] leading-[1.35] ${mode.descColor}`}>
            {mode.description}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span
            className={`flex items-center gap-[5px] text-[11px] font-medium leading-none ${mode.metaColor}`}
          >
            <Timer className="h-[11px] w-[11px]" strokeWidth={1.75} />
            {mode.duration}
          </span>
          <span
            aria-hidden
            className={`flex h-7 w-7 items-center justify-center rounded-full transition-transform group-hover:translate-x-0.5 ${mode.ctaBg} ${mode.accent}`}
          >
            <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
          </span>
        </div>
      </Link>
    </li>
  );
}
