"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { ArrowUpRight, Share, Plus, Sparkles } from "lucide-react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "innolympics:install-dismissed-at";
const DISMISS_REASON_KEY = "innolympics:install-dismissed-reason";

// Soft dismissal ("Not now") — return in a week, when the user has had a chance to settle in.
const SOFT_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;
// Hard dismissal (declined the native dialog) — back off for a month.
const HARD_COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000;

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const iosStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone;
  return (
    iosStandalone === true ||
    window.matchMedia("(display-mode: standalone)").matches
  );
}

function isIOS(): boolean {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent;
  // iPadOS 13+ reports as Mac — sniff touch support too.
  const isAppleTouch =
    /iPad|iPhone|iPod/.test(ua) ||
    (ua.includes("Mac") && "ontouchend" in document);
  return isAppleTouch && !/CriOS|FxiOS|EdgiOS/.test(ua);
}

function recentlyDismissed(): boolean {
  if (typeof window === "undefined") return false;
  const raw = window.localStorage.getItem(DISMISS_KEY);
  if (!raw) return false;
  const at = Number(raw);
  if (!Number.isFinite(at)) return false;
  const reason = window.localStorage.getItem(DISMISS_REASON_KEY);
  const window_ms = reason === "hard" ? HARD_COOLDOWN_MS : SOFT_COOLDOWN_MS;
  return Date.now() - at < window_ms;
}

function rememberDismiss(reason: "soft" | "hard"): void {
  window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
  window.localStorage.setItem(DISMISS_REASON_KEY, reason);
}

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIOSHint, setShowIOSHint] = useState(false);
  const [dismissed, setDismissed] = useState(true); // start hidden; reveal only after mount checks
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isStandalone() || recentlyDismissed()) {
      setDismissed(true);
      return;
    }
    setDismissed(false);

    const handler = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);

    if (isIOS()) {
      setShowIOSHint(true);
    }

    const installed = () => {
      setDismissed(true);
      setDeferred(null);
      setShowIOSHint(false);
    };
    window.addEventListener("appinstalled", installed);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installed);
    };
  }, []);

  // Slide-in after the first paint so the card animates in rather than pops.
  useEffect(() => {
    if (dismissed) return;
    if (!deferred && !showIOSHint) return;
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, [dismissed, deferred, showIOSHint]);

  const handleInstall = useCallback(async () => {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    if (outcome === "dismissed") {
      rememberDismiss("hard");
    }
    setDeferred(null);
  }, [deferred]);

  const handleDismiss = useCallback(() => {
    rememberDismiss("soft");
    setVisible(false);
    // Let the exit transition finish before unmounting.
    window.setTimeout(() => {
      setDismissed(true);
      setDeferred(null);
      setShowIOSHint(false);
    }, 220);
  }, []);

  if (dismissed) return null;
  if (!deferred && !showIOSHint) return null;

  const isChrome = Boolean(deferred);

  return (
    <div
      role="dialog"
      aria-label="Install Tala"
      className={`pointer-events-none absolute inset-x-3 bottom-[88px] z-50 transition-all duration-300 ease-out motion-reduce:transition-none ${
        visible ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
      }`}
    >
      <div className="pointer-events-auto relative overflow-hidden rounded-3xl border border-[#EFE3F0] bg-[#FCFAF7] shadow-[0_18px_40px_-12px_rgba(123,94,167,0.35),0_4px_14px_rgba(26,26,26,0.08)]">
        {/* Soft purple glow in the corner for warmth */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-[#E9DAF2] opacity-60 blur-2xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -left-10 -bottom-16 h-32 w-32 rounded-full bg-[#F3E9DC] opacity-60 blur-2xl"
        />

        <div className="relative flex items-start gap-3 px-4 pt-4">
          <div className="relative shrink-0">
            <div className="absolute inset-0 -m-0.5 rounded-2xl bg-gradient-to-br from-[#E9DAF2] to-[#F3E9DC] opacity-80 blur-[2px]" />
            <div className="relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-[0_4px_10px_rgba(26,26,26,0.08)]">
              <Image
                src="/icons/icon-192.png"
                alt=""
                width={48}
                height={48}
                className="h-full w-full object-cover"
                priority={false}
              />
            </div>
          </div>

          <div className="flex-1 pt-0.5">
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-3 w-3 text-[#A881C2]" strokeWidth={2} />
              <span className="text-[10px] font-semibold uppercase tracking-[1.4px] text-[#A881C2]">
                Keep Tala close
              </span>
            </div>
            <h3
              className="mt-1 text-[22px] leading-[1.1] tracking-[-0.4px] text-[#1A1A1A]"
              style={{ fontFamily: "var(--font-instrument-serif), serif" }}
            >
              Install Tala
            </h3>
            <p className="mt-1 text-[12px] leading-[1.45] text-[#6B5D52]">
              {isChrome
                ? "A one-tap home for your journaling, breathing, and grounding — always a tap away."
                : "Add Tala to your Home Screen so it's there whenever you need a soft place to land."}
            </p>
          </div>
        </div>

        {isChrome ? (
          <div className="relative mt-3 flex items-center gap-2 px-4 pb-4">
            <button
              type="button"
              onClick={handleInstall}
              className="flex h-11 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-full bg-[#1A1A1A] text-[13px] font-semibold tracking-[0.2px] text-[#FCFAF7] shadow-[0_6px_18px_rgba(26,26,26,0.22)] transition-opacity hover:opacity-90 active:opacity-80"
            >
              Install Tala
              <ArrowUpRight className="h-4 w-4" strokeWidth={2} />
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              className="h-11 cursor-pointer rounded-full px-4 text-[12px] font-medium text-[#8A8172] transition-colors hover:text-[#1A1A1A] active:text-[#1A1A1A]"
            >
              Not now
            </button>
          </div>
        ) : (
          <div className="relative mx-4 mt-3 mb-3 rounded-2xl border border-[#EFE3F0] bg-white/70 px-3.5 py-3">
            <ol className="flex flex-col gap-2 text-[12px] leading-[1.35] text-[#4A3F36]">
              <li className="flex items-start gap-2.5">
                <span className="mt-[2px] flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-[#E9DAF2] text-[10px] font-semibold text-[#7B5EA7]">
                  1
                </span>
                <span className="flex flex-wrap items-center gap-1">
                  Tap the
                  <Share className="h-[14px] w-[14px] text-[#7B5EA7]" strokeWidth={2} />
                  <span className="font-semibold text-[#1A1A1A]">Share</span>
                  button below.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="mt-[2px] flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-[#E9DAF2] text-[10px] font-semibold text-[#7B5EA7]">
                  2
                </span>
                <span className="flex flex-wrap items-center gap-1">
                  Choose
                  <span className="inline-flex items-center gap-1 font-semibold text-[#1A1A1A]">
                    <Plus className="h-[14px] w-[14px]" strokeWidth={2} />
                    Add to Home Screen
                  </span>
                  .
                </span>
              </li>
            </ol>
            <button
              type="button"
              onClick={handleDismiss}
              className="mt-3 block w-full cursor-pointer text-center text-[11px] font-medium text-[#8A8172] transition-colors hover:text-[#1A1A1A] active:text-[#1A1A1A]"
            >
              Maybe later
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
