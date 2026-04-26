"use client";

import type { RefObject } from "react";
import { useEffect, useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { ArrowLeft, Phone, Sparkles, X } from "lucide-react";

import type { TalaInsight } from "@/lib/profile/tala-insight";

type Mood = "calm" | "happy" | "anxious" | "sad" | "overwhelmed";

type ChipEntry = {
  id: string;
  date: string;
  mood: Mood;
  moodLabel: string;
};

export type HotlineNumber = {
  label: string;
  number: string;
  tel: string;
};

export type HotlineGroup = {
  name: string;
  meta: string;
  numbers: readonly HotlineNumber[];
};

type TalaInsightDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  insight: TalaInsight | null;
  chipEntries: ChipEntry[];
  hotlineGroups: readonly HotlineGroup[];
  container?: RefObject<HTMLElement | null>;
};

const MOOD_COLOR: Record<Mood, string> = {
  calm: "#D4B5E8",
  happy: "#B5E8C8",
  anxious: "#F5D5A8",
  sad: "#B5CCE8",
  overwhelmed: "#F0B5B5",
};

type View = "insight" | "hotlines";

export function TalaInsightDialog({
  open,
  onOpenChange,
  chipEntries,
  hotlineGroups,
  container,
}: TalaInsightDialogProps) {
  const [view, setView] = useState<View>("insight");

  useEffect(() => {
    if (!open) setView("insight");
  }, [open]);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal container={container}>
        <Dialog.Backdrop
          className={[
            "absolute inset-0 z-10 bg-black/45 backdrop-blur-[3px]",
            "transition-opacity duration-200 ease-out",
            "data-[starting-style]:opacity-0 data-[ending-style]:opacity-0",
            "motion-reduce:transition-none",
          ].join(" ")}
        />
        <Dialog.Popup
          className={[
            "absolute left-1/2 top-1/2 z-20 flex max-h-[86%] w-[92%] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-[28px] bg-[#FCFAF7] shadow-[0_24px_60px_-20px_rgba(26,26,26,0.35)] sm:w-[342px] sm:max-h-[600px]",
            "transition-[transform,opacity] duration-250 ease-[cubic-bezier(0.32,0.72,0,1)]",
            "data-[starting-style]:opacity-0 data-[starting-style]:translate-y-[calc(-50%+12px)] data-[starting-style]:scale-[0.96]",
            "data-[ending-style]:opacity-0 data-[ending-style]:translate-y-[calc(-50%+8px)] data-[ending-style]:scale-[0.97]",
            "motion-reduce:transition-none motion-reduce:transform-none",
            "focus-visible:outline-none",
          ].join(" ")}
        >
          <header className="flex items-center justify-between gap-2 border-b border-[#EFE8E0] px-4 py-3">
            {view === "hotlines" ? (
              <button
                type="button"
                onClick={() => setView("insight")}
                aria-label="Back"
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-[#6B6259] transition-colors hover:bg-[#F5F0E8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A881C2]"
              >
                <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
              </button>
            ) : (
              <span aria-hidden className="h-8 w-8" />
            )}

            <div className="flex items-center gap-2">
              <span
                aria-hidden
                className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-[#A881C2]"
              >
                <Sparkles className="h-3 w-3 text-white" strokeWidth={2} />
              </span>
              <Dialog.Title className="text-[13px] font-semibold tracking-[-0.1px] text-[#1A1A1A]">
                {view === "insight" ? "Tala noticed" : "Talk to a professional"}
              </Dialog.Title>
            </div>

            <Dialog.Close
              aria-label="Close"
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-[#6B6259] transition-colors hover:bg-[#F5F0E8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A881C2]"
            >
              <X className="h-4 w-4" strokeWidth={1.75} />
            </Dialog.Close>
          </header>

          <div className="flex flex-1 flex-col overflow-y-auto px-5 py-5 [scrollbar-color:#D9D2C7_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#D9D2C7] [&::-webkit-scrollbar]:w-1.5">
            {view === "insight" ? (
              <InsightView chipEntries={chipEntries} />
            ) : (
              <HotlinesView groups={hotlineGroups} />
            )}
          </div>

          {view === "insight" ? (
            <div className="shrink-0 border-t border-[#EFE8E0] bg-[#FCFAF7] px-5 py-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
              <div className="flex items-center gap-2">
                <Dialog.Close
                  className={[
                    "flex h-[46px] flex-1 cursor-pointer items-center justify-center rounded-full bg-white text-[13px] font-semibold text-[#6B6259] border border-[#EFE8E0]",
                    "transition-colors duration-200 hover:bg-[#F5F0E8]",
                    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A881C2]",
                  ].join(" ")}
                >
                  Not now
                </Dialog.Close>
                <button
                  type="button"
                  onClick={() => setView("hotlines")}
                  className={[
                    "flex h-[46px] flex-[1.4] cursor-pointer items-center justify-center rounded-full bg-[#1A1A1A] text-[13px] font-semibold text-[#FCFAF7] shadow-[0_6px_20px_rgba(26,26,26,0.18)]",
                    "transition-colors duration-200 hover:bg-[#2A2724] active:opacity-90",
                    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A881C2]",
                  ].join(" ")}
                >
                  Talk to a professional
                </button>
              </div>
            </div>
          ) : (
            <div className="shrink-0 border-t border-[#EFE8E0] bg-[#FCFAF7] px-5 py-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
              <Dialog.Close
                className={[
                  "flex h-[46px] w-full cursor-pointer items-center justify-center rounded-full bg-[#1A1A1A] text-[13px] font-semibold text-[#FCFAF7] shadow-[0_6px_20px_rgba(26,26,26,0.18)]",
                  "transition-colors duration-200 hover:bg-[#2A2724] active:opacity-90",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A881C2]",
                ].join(" ")}
              >
                Done
              </Dialog.Close>
            </div>
          )}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function InsightView({ chipEntries }: { chipEntries: ChipEntry[] }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 rounded-[20px] border border-[#E9DAF2] bg-[#F4EEF9] p-4">
        <span className="text-[11px] font-bold uppercase tracking-[1px] text-[#5B3D78]">
          What I noticed
        </span>
        <p className="text-[15px] font-semibold leading-[1.4] text-[#1A1A1A]">
          I&apos;ve been noticing your entries this week.
        </p>
        <p className="text-[13px] leading-[1.55] text-[#4B423B]">
          I think it&apos;s time to talk to someone who can really help.
        </p>
      </div>

      {chipEntries.length > 0 ? (
        <div className="flex flex-col gap-2">
          <span className="text-[11px] font-bold uppercase tracking-[1px] text-[#6B6259]">
            Recent entries
          </span>
          <ul className="flex flex-wrap items-center gap-1.5">
            {chipEntries.map((entry) => (
              <li
                key={entry.id}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#EFE8E0] bg-white px-2.5 py-1 text-[11px] font-medium text-[#5B3D78]"
              >
                <span
                  aria-hidden
                  className="h-3 w-3 rounded-[4px]"
                  style={{ backgroundColor: MOOD_COLOR[entry.mood] }}
                />
                <span className="text-[#1A1A1A]">{entry.date}</span>
                <span aria-hidden className="text-[#B8B0A7]">
                  ·
                </span>
                <span>{entry.moodLabel}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function HotlinesView({ groups }: { groups: readonly HotlineGroup[] }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-[13px] leading-[1.55] text-[#4B423B]">
        You don&apos;t have to sit with this alone. These lines are free and
        confidential.
      </p>
      <ul className="flex flex-col gap-3">
        {groups.map((group) => (
          <li
            key={group.name}
            className="flex flex-col overflow-hidden rounded-[16px] border border-[#EFE8E0] bg-white"
          >
            <div className="flex items-center gap-3 px-3.5 pb-2 pt-3">
              <span
                aria-hidden
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F4EEF9]"
              >
                <Phone className="h-4 w-4 text-[#5B3D78]" strokeWidth={2} />
              </span>
              <div className="flex min-w-0 flex-1 flex-col">
                <p className="truncate text-[13px] font-semibold leading-tight text-[#1A1A1A]">
                  {group.name}
                </p>
                <p className="text-[11px] text-[#5B3D78]">{group.meta}</p>
              </div>
            </div>
            <ul className="flex flex-col">
              {group.numbers.map((n, ni) => (
                <li key={n.tel}>
                  <div className="flex items-center gap-3 px-3.5 py-2">
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-[13px] font-semibold leading-tight text-[#1A1A1A]">
                        {n.number}
                      </span>
                      <span className="text-[11px] text-[#B8B0A7]">{n.label}</span>
                    </div>
                    <a
                      href={`tel:${n.tel}`}
                      aria-label={`Call ${group.name} at ${n.number}`}
                      className="inline-flex cursor-pointer items-center rounded-full bg-[#5B3D78] px-3 py-1.5 text-[12px] font-semibold text-white transition-opacity active:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A881C2]"
                    >
                      Call
                    </a>
                  </div>
                  {ni < group.numbers.length - 1 ? (
                    <div className="mx-3.5 h-px bg-[#F0E8F8]" />
                  ) : null}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
}
