"use client";

import { useEffect, useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";

type Props = { userId: number };

export function AiInsightCard({ userId }: Props) {
    const [insight, setInsight] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);

    useEffect(() => {
        let cancelled = false;

        async function fetchInsight() {
            setLoading(true);
            try {
                const res = await fetch("/api/journal/insights", {
                    headers: { "x-user-id": String(userId) },
                });
                if (!res.ok) throw new Error("fetch failed");
                const data = (await res.json()) as { insight: string | null };
                if (!cancelled && data.insight) {
                    setInsight(data.insight);
                    setOpen(true); // auto-open when insight arrives
                }
            } catch {
                /* gracefully ignore */
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        void fetchInsight();
        return () => { cancelled = true; };
    }, [userId]);

    /* Nothing to show */
    if (!loading && !insight) return null;
    if (!open) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="absolute inset-0 z-20 bg-black/40 backdrop-blur-[3px] transition-opacity duration-200"
                onClick={() => setOpen(false)}
                aria-hidden
            />

            {/* Popup card */}
            <div
                className="absolute left-1/2 top-1/2 z-30 flex w-[88%] max-w-[340px] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-[24px] bg-[#FCFAF7] shadow-[0_24px_60px_-20px_rgba(26,26,26,0.35)]"
                style={{ animation: "insightPopIn 0.28s cubic-bezier(0.32,0.72,0,1)" }}
            >
                {/* ── Header ── */}
                <div
                    className="flex items-center justify-center gap-2 px-5 py-4"
                    style={{ background: "linear-gradient(135deg, #EDE0F8 0%, #F5EEFF 100%)" }}
                >
                    <span
                        className="flex h-7 w-7 items-center justify-center rounded-full"
                        style={{ backgroundColor: "#A881C2" }}
                    >
                        <Sparkles className="h-3.5 w-3.5 text-white" strokeWidth={2.2} />
                    </span>
                    <span className="text-[14px] font-bold tracking-[-0.1px] text-[#3B1F5E]">
                        Tala&apos;s Insight
                    </span>
                </div>

                {/* ── Body ── */}
                <div className="px-5 py-5">
                    {loading ? (
                        <div className="flex items-center justify-center py-6">
                            <Loader2 size={22} className="animate-spin text-[#A881C2]" />
                        </div>
                    ) : (
                        <>
                            <p className="text-[13px] leading-[1.75] text-[#3B1F5E]">{insight}</p>
                            <p className="mt-4 text-[10px] font-medium text-[#A881C2]">
                                Based on your recent 3 journal entries
                            </p>
                        </>
                    )}
                </div>

                {/* ── Footer ── */}
                <div className="border-t border-[#EFE8E0] px-5 py-3">
                    <button
                        onClick={() => setOpen(false)}
                        className="flex h-[44px] w-full cursor-pointer items-center justify-center rounded-full bg-[#1A1A1A] text-[13px] font-semibold tracking-[0.1px] text-[#FCFAF7] shadow-[0_6px_20px_rgba(26,26,26,0.18)] transition-colors duration-200 hover:bg-[#2A2724] active:opacity-90"
                    >
                        Got it
                    </button>
                </div>
            </div>

            {/* Pop-in animation */}
            <style jsx>{`
        @keyframes insightPopIn {
          0% {
            opacity: 0;
            transform: translate(-50%, calc(-50% + 12px)) scale(0.96);
          }
          100% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
        }
      `}</style>
        </>
    );
}
