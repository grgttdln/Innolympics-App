"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, ShieldCheck, X, Sparkles } from "lucide-react";
import { Dialog } from "@base-ui/react/dialog";

import { loadUser } from "@/lib/session";

type FeedbackItem = {
    reviewId: string;
    entryId: string;
    comment: string;
    reviewedAt: string;
};

export function NotificationBell() {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [items, setItems] = useState<FeedbackItem[]>([]);
    const [dismissed, setDismissed] = useState<Set<string>>(new Set());

    const fetchFeedback = useCallback(async (userId: number) => {
        try {
            const res = await fetch("/api/professional/feedback", {
                headers: { "x-user-id": String(userId) },
            });
            if (!res.ok) return;
            const data = (await res.json()) as { feedback: FeedbackItem[] };
            setItems(data.feedback);
        } catch {
            /* silent */
        }
    }, []);

    useEffect(() => {
        const stored = loadUser();
        if (!stored) return;

        try {
            const raw = localStorage.getItem("dismissed_pro_notes");
            if (raw) setDismissed(new Set(JSON.parse(raw) as string[]));
        } catch {
            /* ignore */
        }

        void fetchFeedback(stored.id);
    }, [fetchFeedback]);

    const dismiss = (reviewId: string) => {
        setDismissed((prev) => {
            const next = new Set(prev);
            next.add(reviewId);
            localStorage.setItem("dismissed_pro_notes", JSON.stringify([...next]));
            return next;
        });
    };

    const visible = items.filter((fb) => !dismissed.has(fb.reviewId));
    const hasUnread = visible.length > 0;

    return (
        <Dialog.Root open={open} onOpenChange={setOpen}>
            <Dialog.Trigger
                className="relative flex h-11 w-11 items-center justify-center rounded-full bg-[#F5F2ED] text-[#1A1A1A] transition-opacity hover:opacity-90 active:opacity-80"
                aria-label="Notifications"
            >
                <Bell className="h-5 w-5" strokeWidth={1.75} />
                {hasUnread && (
                    <span className="absolute right-3 top-3 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-[#F5F2ED]" />
                )}
            </Dialog.Trigger>

            <Dialog.Portal>
                <Dialog.Backdrop className="absolute inset-0 z-50 bg-black/45 backdrop-blur-[3px] transition-opacity duration-200 ease-out data-[starting-style]:opacity-0 data-[ending-style]:opacity-0" />
                <Dialog.Popup className="absolute left-1/2 top-1/2 z-[60] flex max-h-[86%] w-[92%] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-[28px] bg-[#FCFAF7] shadow-[0_24px_60px_-20px_rgba(26,26,26,0.35)] focus-visible:outline-none sm:w-[342px]">
                    <header className="flex items-center justify-center gap-2 border-b border-[#EFE8E0] px-5 py-4">
                        <span aria-hidden className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-[#A881C2]">
                            <Sparkles className="h-3 w-3 text-white" strokeWidth={2} />
                        </span>
                        <Dialog.Title className="text-[14px] font-semibold tracking-[-0.2px] text-[#1A1A1A]">
                            Notifications
                        </Dialog.Title>
                        <Dialog.Close className="absolute right-4 top-4 text-[#B8B0A7] hover:text-[#1A1A1A]">
                            <X size={18} />
                        </Dialog.Close>
                    </header>

                    <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-5 py-5 [scrollbar-width:thin]">
                        {visible.length === 0 ? (
                            <div className="flex flex-col items-center gap-2 py-8 text-center">
                                <Bell className="h-8 w-8 text-[#D9D2C7]" strokeWidth={1.5} />
                                <p className="text-[13px] text-[#B8B0A7]">No new notifications</p>
                            </div>
                        ) : (
                            visible.map((fb) => (
                                <div
                                    key={fb.reviewId}
                                    className="group relative flex flex-col gap-2 rounded-[20px] border border-[#E9DAF2] bg-white p-4 shadow-sm"
                                >
                                    <div className="flex items-center gap-2">
                                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#4F8A6E] text-white">
                                            <ShieldCheck size={13} />
                                        </div>
                                        <span className="text-[12px] font-bold text-[#2F5C47]">Professional Note</span>
                                    </div>
                                    <p className="text-[13px] leading-relaxed text-[#4B423B]">
                                        {fb.comment}
                                    </p>
                                    <div className="mt-1 flex items-center justify-between">
                                        <button
                                            onClick={() => {
                                                setOpen(false);
                                                router.push("/profile");
                                            }}
                                            className="text-[12px] font-semibold text-[#A881C2] hover:underline"
                                        >
                                            View entry →
                                        </button>
                                        <button
                                            onClick={() => dismiss(fb.reviewId)}
                                            className="text-[11px] font-medium text-[#B8B0A7] hover:text-[#8A8079]"
                                        >
                                            Dismiss
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="shrink-0 border-t border-[#EFE8E0] bg-[#FCFAF7] px-5 py-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
                        <Dialog.Close className="flex h-[48px] w-full cursor-pointer items-center justify-center rounded-full bg-[#1A1A1A] text-[14px] font-semibold tracking-[0.1px] text-[#FCFAF7] shadow-[0_6px_20px_rgba(26,26,26,0.18)] transition-colors hover:bg-[#2A2724]">
                            Close
                        </Dialog.Close>
                    </div>
                </Dialog.Popup>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
