"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Trash2, Phone, LogOut, Loader2, X, Mic, FileText, ShieldCheck,
} from "lucide-react";
import { BottomNav } from "@/components/bottom-nav";
import { TalaInsightDialog } from "@/components/tala-insight-card";
import { AiInsightCard } from "@/components/ai-insight-card";
import { loadUser, clearUser, type StoredUser } from "@/lib/session";
import { getGreeting } from "@/lib/greeting";
import { detectTalaInsight } from "@/lib/profile/tala-insight";

const TALA_INSIGHT_DISMISS_KEY = "tala-insight-dismissed";

/* ── Types ────────────────────────────────────────────────────── */

type Mood = "calm" | "happy" | "anxious" | "sad" | "overwhelmed";

type JournalEntry = {
  id: string;
  date: string;
  excerpt: string;
  fullText: string;
  aiResponse: string | null;
  mood: Mood;
  inputType: "text" | "voice";
  intent: string;
};

type ApiEntry = {
  id: string;
  transcript: string;
  aiResponse: string | null;
  intent: string;
  severity: number;
  moodScore: number;
  emotions: string[];
  flagged: boolean;
  inputType: string;
  createdAt: string;
};

type FeedbackItem = {
  reviewId: string;
  entryId: string;
  comment: string;
  reviewedAt: string;
};

/* ── Config ───────────────────────────────────────────────────── */

const MOOD_COLOR: Record<Mood, string> = {
  calm: "#D4B5E8",
  happy: "#B5E8C8",
  anxious: "#F5D5A8",
  sad: "#B5CCE8",
  overwhelmed: "#F0B5B5",
};

const MOOD_LABEL: Record<Mood, string> = {
  calm: "Calm",
  happy: "Happy",
  anxious: "Anxious",
  sad: "Sad",
  overwhelmed: "Overwhelmed",
};

const HOTLINE_GROUPS = [
  {
    name: "NCMH Crisis Hotline",
    meta: "24/7 · free",
    numbers: [
      { label: "Nationwide landline",  number: "1553",             tel: "1553" },
      { label: "Toll-free",             number: "1800-1888-1553",   tel: "180018881553" },
      { label: "Globe / TM",            number: "0917-899-8727",    tel: "09178998727" },
      { label: "Globe / TM",            number: "0966-351-4518",    tel: "09663514518" },
      { label: "Smart / Sun / TNT",     number: "0908-639-2672",    tel: "09086392672" },
      { label: "Smart / Sun / TNT",     number: "0919-057-1553",    tel: "09190571553" },
    ],
  },
  {
    name: "In Touch Crisis Line",
    meta: "24/7 · free & anonymous",
    numbers: [
      { label: "Landline",  number: "(02) 8893-1893",  tel: "0288931893" },
      { label: "Landline",  number: "(02) 893-7603",   tel: "028937603" },
      { label: "Globe",     number: "0917-800-1123",   tel: "09178001123" },
      { label: "Globe",     number: "0917-863-1136",   tel: "09178631136" },
      { label: "Smart",     number: "0922-893-8944",   tel: "09228938944" },
      { label: "Smart",     number: "0998-841-0053",   tel: "09988410053" },
    ],
  },
  {
    name: "DOH Hopeline",
    meta: "24/7 · suicide prevention",
    numbers: [
      { label: "Globe / TM",  number: "2919",            tel: "2919" },
      { label: "Landline",    number: "(02) 8804-4673",  tel: "0288044673" },
      { label: "Globe",       number: "0917-558-4673",   tel: "09175584673" },
      { label: "Smart",       number: "0918-873-4673",   tel: "09188734673" },
    ],
  },
];

const ENTRIES_PER_PAGE = 3;
const EXCERPT_LENGTH = 120;

/* ── Helpers ──────────────────────────────────────────────────── */

function getInitials(name: string) {
  return name.trim().split(" ").filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join("");
}

function deriveMood(moodScore: number, intent: string): Mood {
  if (intent === "crisis") return "overwhelmed";
  if (moodScore >= 0.4) return "happy";
  if (moodScore >= 0.1) return "calm";
  if (moodScore >= -0.2) return "anxious";
  if (moodScore >= -0.6) return "sad";
  return "overwhelmed";
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function toDisplayEntry(e: ApiEntry): JournalEntry {
  const text = e.transcript.trim();
  return {
    id: e.id,
    date: formatDate(e.createdAt),
    fullText: text,
    excerpt: text.length > EXCERPT_LENGTH ? text.slice(0, EXCERPT_LENGTH) + "…" : text,
    aiResponse: e.aiResponse,
    mood: deriveMood(e.moodScore, e.intent),
    inputType: (e.inputType === "voice" ? "voice" : "text") as "text" | "voice",
    intent: e.intent,
  };
}

/* ── Detail sheet ─────────────────────────────────────────────── */

function JournalDetailSheet({
  entry,
  onClose,
  onDelete,
  deleting,
  feedback,
}: {
  entry: JournalEntry;
  onClose: () => void;
  onDelete: (id: string) => void;
  deleting: boolean;
  feedback?: FeedbackItem;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div
      className="absolute inset-0 z-30 flex flex-col"
      style={{ background: "#FCFAF7" }}
    >
      {/* Colour header bar */}
      <div
        className="shrink-0 px-5 pt-14 pb-5"
        style={{ background: `linear-gradient(160deg, ${MOOD_COLOR[entry.mood]}CC 0%, ${MOOD_COLOR[entry.mood]}44 100%)` }}
      >
        {/* Top row */}
        <div className="flex items-center justify-between">
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/60 backdrop-blur-sm"
            aria-label="Close"
          >
            <X size={17} color="#1A1A1A" />
          </button>

          {confirmDelete ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onDelete(entry.id)}
                disabled={deleting}
                className="flex items-center gap-1.5 rounded-full bg-[#D47B7B] px-3 py-1.5 text-[12px] font-semibold text-white disabled:opacity-60"
              >
                {deleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                Delete
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="rounded-full bg-white/60 px-3 py-1.5 text-[12px] font-medium text-[#555] backdrop-blur-sm"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/60 backdrop-blur-sm text-[#C8C0D0] hover:text-[#D47B7B]"
              aria-label="Delete entry"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>

        {/* Meta */}
        <div className="mt-4 flex items-end gap-3">
          <div
            className="h-12 w-12 shrink-0 rounded-[14px]"
            style={{ backgroundColor: MOOD_COLOR[entry.mood] }}
          />
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-semibold text-[#1A1A1A]">{entry.date}</span>
              <span
                className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                style={{
                  backgroundColor: entry.inputType === "voice" ? "rgba(124,58,237,0.12)" : "rgba(123,94,167,0.12)",
                  color: entry.inputType === "voice" ? "#7C3AED" : "#7B5EA7",
                }}
              >
                {entry.inputType === "voice" ? <Mic size={9} /> : <FileText size={9} />}
                {entry.inputType}
              </span>
            </div>
            <span
              className="text-[12px] font-medium capitalize"
              style={{ color: "#7B5EA7" }}
            >
              {MOOD_LABEL[entry.mood]} · {entry.intent}
            </span>
          </div>
        </div>
      </div>

      {/* Scrollable body */}
      <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-5 py-5 pb-10 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {/* Entry text */}
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-[#B8B0A7]">Your entry</p>
          <p className="whitespace-pre-wrap text-[14px] leading-[1.65] text-[#1A1A1A]">
            {entry.fullText}
          </p>
        </div>

        {/* Tala response */}
        {entry.aiResponse && (
          <div
            className="rounded-[16px] px-4 py-4"
            style={{ background: "linear-gradient(135deg, #EDE0F8 0%, #F5EEFF 100%)" }}
          >
            <div className="mb-2 flex items-center gap-2">
              <div
                className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white"
                style={{ backgroundColor: "#7B5EA7" }}
              >
                T
              </div>
              <span className="text-[12px] font-semibold text-[#7B5EA7]">Tala</span>
            </div>
            <p className="whitespace-pre-wrap text-[13px] leading-[1.65] text-[#3B1F5E]">
              {entry.aiResponse}
            </p>
          </div>
        )}

        {/* Professional's Note */}
        {feedback && (
          <div
            className="rounded-[16px] px-4 py-4"
            style={{ background: "linear-gradient(135deg, #D7F0E0 0%, #EAF7EE 100%)" }}
          >
            <div className="mb-2 flex items-center gap-2">
              <div
                className="flex h-6 w-6 items-center justify-center rounded-full text-white"
                style={{ backgroundColor: "#4F8A6E" }}
              >
                <ShieldCheck size={13} />
              </div>
              <span className="text-[12px] font-semibold text-[#2F5C47]">Professional&apos;s Note</span>
            </div>
            <p className="whitespace-pre-wrap text-[13px] leading-[1.65] text-[#1A3D2E]">
              {feedback.comment}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Main page ────────────────────────────────────────────────── */

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<StoredUser | null>(null);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [feedbackMap, setFeedbackMap] = useState<Record<string, FeedbackItem>>({});
  const [insightDismissed, setInsightDismissed] = useState(false);
  const [insightOpen, setInsightOpen] = useState(false);
  const frameRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = loadUser();
    if (!stored) { router.replace("/login"); return; }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate from localStorage on mount
    setUser(stored);
  }, [router]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate dismissal flag on mount
    setInsightDismissed(
      typeof window !== "undefined" &&
        window.sessionStorage.getItem(TALA_INSIGHT_DISMISS_KEY) === "1",
    );
  }, []);

  const handleInsightOpenChange = (next: boolean) => {
    setInsightOpen(next);
    if (!next) {
      setInsightDismissed(true);
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(TALA_INSIGHT_DISMISS_KEY, "1");
      }
    }
  };

  const fetchEntries = useCallback(async (userId: number) => {
    setLoading(true);
    setFetchError(false);
    try {
      const res = await fetch("/api/journal", {
        headers: { "x-user-id": String(userId) },
      });
      if (!res.ok) throw new Error("fetch failed");
      const data = (await res.json()) as { entries: ApiEntry[] };
      setEntries(data.entries.map(toDisplayEntry));
    } catch {
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchFeedback = useCallback(async (userId: number) => {
    try {
      const res = await fetch("/api/professional/feedback", {
        headers: { "x-user-id": String(userId) },
      });
      if (!res.ok) return;
      const data = (await res.json()) as { feedback: FeedbackItem[] };
      const map: Record<string, FeedbackItem> = {};
      for (const fb of data.feedback) {
        map[fb.entryId] = fb;
      }
      setFeedbackMap(map);
    } catch {
      /* silent */
    }
  }, []);

  useEffect(() => {
    const stored = loadUser();
    if (!stored) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate entries after mount
    void fetchEntries(stored.id);
    void fetchFeedback(stored.id);
  }, [fetchEntries, fetchFeedback]);

  useEffect(() => {
    if (loading || fetchError || insightDismissed) return;
    const detected = detectTalaInsight(entries);
    if (!detected) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- auto-open once entries load and a pattern is present
    setInsightOpen(true);
  }, [loading, fetchError, insightDismissed, entries]);

  /* Pagination */
  const totalPages = Math.ceil(entries.length / ENTRIES_PER_PAGE);
  const pageEntries = entries.slice(page * ENTRIES_PER_PAGE, page * ENTRIES_PER_PAGE + ENTRIES_PER_PAGE);

  const handleLogout = () => {
    clearUser();
    router.replace("/login");
  };

  const handleDelete = async (id: string) => {
    const stored = loadUser();
    if (!stored) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/journal/${id}`, {
        method: "DELETE",
        headers: { "x-user-id": String(stored.id) },
      });
      if (!res.ok) throw new Error("delete failed");
      const next = entries.filter(e => e.id !== id);
      setEntries(next);
      setConfirmId(null);
      setSelectedEntry(null);
      const newTotal = Math.ceil(next.length / ENTRIES_PER_PAGE);
      if (page >= newTotal && page > 0) setPage(p => p - 1);
    } catch {
      /* silently ignore – keep UI consistent */
    } finally {
      setDeletingId(null);
    }
  };

  if (!user) return null;

  const initials = getInitials(user.name);
  const greeting = getGreeting(new Date());

  const insight =
    !loading && !fetchError && !insightDismissed
      ? detectTalaInsight(entries)
      : null;

  const insightChips = insight
    ? insight.contributingEntries
        .map((c) => {
          const full = entries.find((e) => e.id === c.id);
          if (!full) return null;
          return {
            id: full.id,
            date: full.date,
            mood: full.mood,
            moodLabel: MOOD_LABEL[full.mood],
          };
        })
        .filter((c): c is NonNullable<typeof c> => c !== null)
    : [];

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-100">
      <div
        ref={frameRef}
        className="relative flex h-[844px] w-[390px] flex-col overflow-hidden rounded-[40px] bg-[#FCFAF7]"
      >
        <div className="h-[50px] shrink-0" aria-hidden />

        {/* ── Page header ── */}
        <div className="flex items-start justify-between px-6 pb-2 pt-5">
          <div>
            <h1 className="text-[28px] font-bold leading-tight tracking-[-0.3px] text-[#1A1A1A]">
              Profile
            </h1>
            <p className="mt-0.5 text-[14px] text-[#B8B0A7]">
              {greeting} {user.name.split(" ")[0]} ✦
            </p>
          </div>

          <button
            onClick={handleLogout}
            className="mt-1 flex items-center gap-1.5 rounded-[12px] border border-[#EDE5F5] px-3 py-2 text-[12px] font-medium text-[#9B8AB0] transition-all active:scale-[0.96] hover:border-[#C4A8E0] hover:text-[#7B5EA7]"
          >
            <LogOut size={13} />
            Log out
          </button>
        </div>

        {/* ── Scrollable body ── */}
        <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-5 pb-32 pt-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">

          {/* User card */}
          <div
            className="flex items-start gap-4 rounded-[22px] px-5 py-5"
            style={{ background: "linear-gradient(135deg, #D8BFF0 0%, #EDE0F8 100%)" }}
          >
            <div
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-[17px] font-bold text-white"
              style={{ backgroundColor: "#7B5EA7" }}
            >
              {initials}
            </div>

            <div className="flex flex-1 flex-col gap-1">
              <p className="text-[17px] font-bold leading-none text-[#2A1A4A]">{user.name}</p>
              <p className="text-[12px] text-[#7B5EA7]">{user.email}</p>
            </div>
          </div>

          {/* AI Insight card */}
          <AiInsightCard userId={user.id} />

          {/* Journal entries */}
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[16px] font-bold text-[#1A1A1A]">My Journal Entries</h2>
              {!loading && !fetchError && (
                <span className="text-[13px] font-medium" style={{ color: "#A881C2" }}>
                  {entries.length} {entries.length === 1 ? "entry" : "entries"}
                </span>
              )}
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 size={22} className="animate-spin text-[#A881C2]" />
              </div>
            ) : fetchError ? (
              <div
                className="flex flex-col items-center gap-3 rounded-[18px] py-10 text-center"
                style={{ border: "1px dashed #E5DDEF" }}
              >
                <span className="text-[32px]">⚠️</span>
                <p className="text-[14px] text-[#B8B0A7]">Couldn&apos;t load entries.</p>
                <button
                  onClick={() => user && void fetchEntries(user.id)}
                  className="rounded-full bg-[#EDE5F5] px-4 py-2 text-[13px] font-medium text-[#7B5EA7]"
                >
                  Retry
                </button>
              </div>
            ) : entries.length === 0 ? (
              <div
                className="flex flex-col items-center gap-2 rounded-[18px] py-10 text-center"
                style={{ border: "1px dashed #E5DDEF" }}
              >
                <span className="text-[32px]">📖</span>
                <p className="text-[14px] text-[#B8B0A7]">No journal entries yet.</p>
              </div>
            ) : (
              <>
                <div
                  className="flex flex-col overflow-hidden rounded-[18px] bg-white"
                  style={{ border: "1px solid #EDE5F5", boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}
                >
                  {pageEntries.map((entry, i) => (
                    <div key={entry.id}>
                      <div className="flex items-start gap-3 px-4 py-3.5">
                        {/* Mood square with input-type badge */}
                        <div
                          className="relative mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px]"
                          style={{ backgroundColor: MOOD_COLOR[entry.mood] }}
                        >
                          <span
                            aria-label={entry.inputType === "voice" ? "Voice entry" : "Text entry"}
                            className="flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-[#5B3D78] shadow-[0_1px_3px_rgba(0,0,0,0.08)]"
                          >
                            {entry.inputType === "voice" ? (
                              <Mic size={13} strokeWidth={2} />
                            ) : (
                              <FileText size={13} strokeWidth={2} />
                            )}
                          </span>
                        </div>

                        {/* Tappable text area → opens detail */}
                        <button
                          className="flex flex-1 flex-col gap-0.5 text-left"
                          onClick={() => setSelectedEntry(entry)}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-[12px] font-medium" style={{ color: "#A881C2" }}>
                              {entry.date}
                            </span>
                            <span
                              className="flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium capitalize"
                              style={{
                                backgroundColor: entry.inputType === "voice" ? "rgba(139,92,246,0.10)" : "rgba(168,129,194,0.10)",
                                color: entry.inputType === "voice" ? "#7C3AED" : "#7B5EA7",
                              }}
                            >
                              {entry.inputType === "voice" ? <Mic size={8} /> : <FileText size={8} />}
                              {entry.inputType}
                            </span>
                          </div>
                          <span className="line-clamp-2 text-[13px] leading-snug text-[#333333]">
                            {entry.excerpt}
                          </span>
                        </button>

                        {/* Delete action */}
                        <div className="flex shrink-0 items-center gap-1 pt-1">
                          {confirmId === entry.id ? (
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => void handleDelete(entry.id)}
                                disabled={deletingId === entry.id}
                                className="flex items-center gap-1 rounded-[8px] bg-[#D47B7B] px-2.5 py-1 text-[11px] font-semibold text-white disabled:opacity-60"
                              >
                                {deletingId === entry.id && <Loader2 size={11} className="animate-spin" />}
                                Delete
                              </button>
                              <button
                                onClick={() => setConfirmId(null)}
                                className="rounded-[8px] px-2 py-1 text-[11px] text-[#999]"
                                style={{ border: "1px solid #E5DDEF" }}
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmId(entry.id)}
                              className="flex h-8 w-8 items-center justify-center rounded-full text-[#C8C0D0] transition-colors hover:text-[#D47B7B]"
                              aria-label="Delete"
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      </div>

                      {i < pageEntries.length - 1 && (
                        <div className="mx-4 h-px" style={{ backgroundColor: "#F0E8F8" }} />
                      )}
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-3 flex items-center justify-between px-1">
                    <button
                      onClick={() => setPage(p => p - 1)}
                      disabled={page === 0}
                      className="rounded-[12px] px-4 py-2 text-[13px] font-medium transition-all disabled:opacity-30"
                      style={{ backgroundColor: "rgba(168,129,194,0.1)", color: "#7B5EA7" }}
                    >
                      ← Prev
                    </button>
                    <span className="text-[12px] text-[#B8B0A7]">{page + 1} / {totalPages}</span>
                    <button
                      onClick={() => setPage(p => p + 1)}
                      disabled={page >= totalPages - 1}
                      className="rounded-[12px] px-4 py-2 text-[13px] font-medium transition-all disabled:opacity-30"
                      style={{ backgroundColor: "rgba(168,129,194,0.1)", color: "#7B5EA7" }}
                    >
                      Next →
                    </button>
                  </div>
                )}
              </>
            )}
          </section>

          {/* Mental Health Hotlines */}
          <section>
            <h2 className="mb-3 text-[16px] font-bold text-[#1A1A1A]">Mental Health Hotlines</h2>

            <div className="flex flex-col gap-3">
              {HOTLINE_GROUPS.map((group) => (
                <div
                  key={group.name}
                  className="flex flex-col overflow-hidden rounded-[18px] bg-white"
                  style={{ border: "1px solid #EDE5F5", boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}
                >
                  <div className="flex items-center gap-3 px-4 pb-2 pt-4">
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                      style={{ backgroundColor: "rgba(168,129,194,0.12)" }}
                    >
                      <Phone size={16} color="#A881C2" />
                    </div>
                    <div className="flex flex-1 flex-col gap-0.5">
                      <p className="text-[13px] font-semibold leading-none text-[#1A1A1A]">{group.name}</p>
                      <p className="text-[11px]" style={{ color: "#A881C2" }}>{group.meta}</p>
                    </div>
                  </div>

                  <ul className="flex flex-col">
                    {group.numbers.map((n, ni) => (
                      <li key={n.tel}>
                        <div className="flex items-center gap-3 px-4 py-2.5">
                          <div className="flex flex-1 flex-col">
                            <span className="text-[13px] font-semibold leading-tight text-[#1A1A1A]">
                              {n.number}
                            </span>
                            <span className="text-[11px] text-[#B8B0A7]">{n.label}</span>
                          </div>
                          <a
                            href={`tel:${n.tel}`}
                            aria-label={`Call ${group.name} at ${n.number}`}
                            className="rounded-full px-3.5 py-1.5 text-[12px] font-semibold text-white transition-all active:scale-[0.97]"
                            style={{ backgroundColor: "#7B5EA7" }}
                          >
                            Call
                          </a>
                        </div>
                        {ni < group.numbers.length - 1 ? (
                          <div className="mx-4 h-px" style={{ backgroundColor: "#F0E8F8" }} />
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        </div>

        <BottomNav />

        {/* ── Journal detail overlay ── */}
        {selectedEntry && (
          <JournalDetailSheet
            entry={selectedEntry}
            onClose={() => setSelectedEntry(null)}
            onDelete={handleDelete}
            deleting={deletingId === selectedEntry.id}
            feedback={feedbackMap[selectedEntry.id]}
          />
        )}

        <TalaInsightDialog
          open={insightOpen}
          onOpenChange={handleInsightOpenChange}
          insight={insight}
          chipEntries={insightChips}
          hotlineGroups={HOTLINE_GROUPS}
          container={frameRef}
        />
      </div>
    </main>
  );
}
