"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, Share, Plus, X } from "lucide-react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "innolympics:install-dismissed-at";
// Re-show the prompt 14 days after a dismissal so we don't nag.
const DISMISS_COOLDOWN_MS = 14 * 24 * 60 * 60 * 1000;

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
  return Date.now() - at < DISMISS_COOLDOWN_MS;
}

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIOSHint, setShowIOSHint] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (isStandalone() || recentlyDismissed()) {
      setDismissed(true);
      return;
    }

    const handler = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);

    if (isIOS()) {
      setShowIOSHint(true);
    }

    const installed = () => setDismissed(true);
    window.addEventListener("appinstalled", installed);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installed);
    };
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    if (outcome === "dismissed") {
      window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
    }
    setDeferred(null);
  }, [deferred]);

  const handleDismiss = useCallback(() => {
    window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setDismissed(true);
    setDeferred(null);
    setShowIOSHint(false);
  }, []);

  if (dismissed) return null;

  if (deferred) {
    return (
      <div className="absolute inset-x-4 bottom-[90px] z-50 flex items-center gap-3 rounded-2xl bg-[#1A1A1A] px-4 py-3 text-white shadow-[0_10px_24px_rgba(26,26,26,0.25)]">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10">
          <Download className="h-4 w-4" strokeWidth={2} />
        </div>
        <div className="flex-1">
          <p className="text-[13px] font-semibold leading-tight">Install Innolympics</p>
          <p className="text-[11px] leading-tight text-white/70">
            Add to your home screen for quick access.
          </p>
        </div>
        <button
          type="button"
          onClick={handleInstall}
          className="shrink-0 rounded-full bg-white px-3 py-1.5 text-[12px] font-semibold text-[#1A1A1A] active:opacity-80"
        >
          Install
        </button>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss install prompt"
          className="shrink-0 rounded-full p-1 text-white/60 active:text-white"
        >
          <X className="h-4 w-4" strokeWidth={2} />
        </button>
      </div>
    );
  }

  if (showIOSHint) {
    return (
      <div className="absolute inset-x-4 bottom-[90px] z-50 flex items-start gap-3 rounded-2xl bg-[#1A1A1A] px-4 py-3 text-white shadow-[0_10px_24px_rgba(26,26,26,0.25)]">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10">
          <Share className="h-4 w-4" strokeWidth={2} />
        </div>
        <div className="flex-1 text-[12px] leading-[1.35]">
          <p className="font-semibold">Install Innolympics</p>
          <p className="text-white/75">
            Tap <Share className="inline h-3 w-3 -translate-y-[1px]" strokeWidth={2} /> Share,
            then <span className="inline-flex items-center gap-0.5"><Plus className="h-3 w-3" strokeWidth={2} /> Add to Home Screen</span>.
          </p>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss install hint"
          className="shrink-0 rounded-full p-1 text-white/60 active:text-white"
        >
          <X className="h-4 w-4" strokeWidth={2} />
        </button>
      </div>
    );
  }

  return null;
}
