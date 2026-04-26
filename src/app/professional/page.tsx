"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, ShieldAlert, BookOpen, AlertCircle, CheckCircle2, Clock, ArrowLeft, Loader2 } from "lucide-react";

const DEMO_ID = "MMCL-C001";
const DEMO_PWD = "tala2026";

/* ── Types ────────────────────────────────────────────────────── */

type Severity = "critical" | "high" | "moderate" | "low";

type JournalCase = {
  reviewId: string;
  entryId: string;
  date: string;
  aiSummary: string;
  severity: Severity;
  journalText: string;
  aiResponse: string | null;
  isReviewed: boolean;
  counselorComment?: string;
};

type ApiCase = {
  reviewId: string;
  entryId: string;
  comment: string | null;
  reviewed: boolean;
  reviewCreatedAt: string;
  transcript: string;
  aiResponse: string | null;
  intent: string;
  severity: number;
  moodScore: number;
  emotions: string[];
  flagged: boolean;
  inputType: string;
  entryCreatedAt: string;
};

/* ── Severity config ──────────────────────────────────────────── */

const SEVERITY: Record<Severity, { label: string; bg: string; text: string; dot: string }> = {
  critical: { label: "Critical", bg: "#FEE2E2", text: "#991B1B", dot: "#EF4444" },
  high: { label: "High", bg: "#FEF3C7", text: "#92400E", dot: "#F59E0B" },
  moderate: { label: "Moderate", bg: "#EDE9FE", text: "#5B21B6", dot: "#8B5CF6" },
  low: { label: "Low", bg: "#DCFCE7", text: "#166534", dot: "#22C55E" },
};

/* ── Helpers ──────────────────────────────────────────────────── */

function deriveSeverity(severity: number, intent: string): Severity {
  if (intent === "crisis" || severity >= 8) return "critical";
  if (intent === "distress" || severity >= 5) return "high";
  if (severity >= 3) return "moderate";
  return "low";
}

function deriveAiSummary(intent: string, emotions: string[]): string {
  const labels: Record<string, string> = {
    crisis: "Crisis Risk — Monitor",
    distress: "Emotional Distress",
    reflection: "Self-Reflection",
    growth: "Positive Growth",
  };
  const base = labels[intent] || intent;
  if (emotions.length > 0) {
    return `${base} · ${emotions.slice(0, 2).join(", ")}`;
  }
  return base;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function toDisplayCase(c: ApiCase): JournalCase {
  return {
    reviewId: c.reviewId,
    entryId: c.entryId,
    date: formatDate(c.entryCreatedAt),
    aiSummary: deriveAiSummary(c.intent, c.emotions),
    severity: deriveSeverity(c.severity, c.intent),
    journalText: c.transcript,
    aiResponse: c.aiResponse,
    isReviewed: c.reviewed,
    counselorComment: c.comment ?? undefined,
  };
}

/* ── Sub-components ───────────────────────────────────────────── */

function SeverityBadge({ severity, summary }: { severity: Severity; summary: string }) {
  const cfg = SEVERITY[severity];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold"
      style={{ backgroundColor: cfg.bg, color: cfg.text }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: cfg.dot }} />
      {summary}
    </span>
  );
}

function CaseCard({
  item,
  onSubmit,
}: {
  item: JournalCase;
  onSubmit: (reviewId: string, comment: string) => void;
}) {
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!comment.trim() || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/professional/cases/${item.reviewId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment: comment.trim() }),
      });
      if (res.ok) {
        onSubmit(item.reviewId, comment.trim());
        setSubmitted(true);
      }
    } catch {
      /* silent */
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 rounded-[16px] bg-white p-5 shadow-sm ring-1 ring-slate-100">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="text-[15px] font-bold text-slate-800">Anonymous Student</span>
            <SeverityBadge severity={item.severity} summary={item.aiSummary} />
          </div>
          <div className="flex items-center gap-1.5 text-[12px] text-slate-400">
            <Clock size={12} />
            {item.date}
          </div>
        </div>

        {item.isReviewed && (
          <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700">
            <CheckCircle2 size={12} /> Reviewed
          </span>
        )}
      </div>

      {/* Divider */}
      <div className="h-px bg-slate-100" />

      {/* Journal text */}
      <div className="rounded-[10px] bg-slate-50 px-4 py-3">
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-slate-400">Journal Entry</p>
        <p className="text-[13px] leading-relaxed text-slate-600">{item.journalText}</p>
      </div>

      {/* AI Response */}
      {item.aiResponse && (
        <div className="rounded-[10px] border border-purple-100 bg-purple-50 px-4 py-3">
          <div className="mb-1 flex items-center gap-1.5">
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#7B5EA7] text-[9px] font-bold text-white">T</div>
            <span className="text-[10px] font-semibold uppercase tracking-widest text-[#7B5EA7]">Tala&apos;s Response</span>
          </div>
          <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-slate-600">{item.aiResponse}</p>
        </div>
      )}

      {/* Action area */}
      {!item.isReviewed ? (
        <div className="flex flex-col gap-2">
          <label className="text-[12px] font-semibold text-slate-500 uppercase tracking-wide">
            Professional Response
          </label>
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder="Type a professional response or note for this case…"
            rows={3}
            disabled={submitted || submitting}
            className="w-full resize-none rounded-[10px] border border-slate-200 bg-white px-4 py-3 text-[13px] leading-relaxed text-slate-700 outline-none placeholder:text-slate-300 focus:border-[#A881C2] focus:ring-2 focus:ring-[#A881C2]/20 disabled:opacity-50 transition-all"
          />
          <div className="flex items-center justify-between">
            <p className="text-[12px] text-slate-400">
              {submitted ? "Response submitted. Moving to Reviewed…" : "Submitting will mark this case as reviewed."}
            </p>
            <button
              onClick={() => void handleSubmit()}
              disabled={!comment.trim() || submitted || submitting}
              className="rounded-[10px] px-5 py-2.5 text-[13px] font-semibold text-white transition-all active:scale-[0.97] disabled:opacity-40"
              style={{ backgroundColor: "#A881C2" }}
            >
              {submitting ? "Submitting…" : "Submit Comment"}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          <label className="text-[12px] font-semibold uppercase tracking-wide text-emerald-600">
            Counselor Note
          </label>
          <p className="rounded-[10px] border border-emerald-100 bg-emerald-50 px-4 py-3 text-[13px] leading-relaxed text-slate-700">
            {item.counselorComment}
          </p>
        </div>
      )}
    </div>
  );
}

/* ── Login ────────────────────────────────────────────────────── */

function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const router = useRouter();
  const [staffId, setStaffId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    setTimeout(() => {
      if (staffId === DEMO_ID && password === DEMO_PWD) {
        onLogin();
      } else {
        setError("Invalid credentials. Please try again.");
        setLoading(false);
      }
    }, 600);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4">
      {/* Logo */}
      <div className="mb-8 flex flex-col items-center gap-3">
        <div
          className="flex h-14 w-14 items-center justify-center rounded-[16px] text-white"
          style={{ backgroundColor: "#A881C2" }}
        >
          <ShieldAlert size={28} strokeWidth={1.75} />
        </div>
        <div className="text-center">
          <p className="text-[13px] font-semibold uppercase tracking-[2px] text-[#A881C2]">Tala</p>
          <h1 className="text-[22px] font-bold text-slate-800">Professional Portal</h1>
          <p className="mt-1 text-[13px] text-slate-400">Restricted access — authorized personnel only</p>
        </div>
      </div>

      {/* Card */}
      <form
        onSubmit={handleSubmit}
        className="flex w-full max-w-[380px] flex-col gap-4 rounded-[20px] bg-white p-7 shadow-sm ring-1 ring-slate-100"
      >
        <div className="flex flex-col gap-1.5">
          <label className="text-[12px] font-semibold uppercase tracking-wide text-slate-500">
            Staff ID
          </label>
          <input
            type="text"
            value={staffId}
            onChange={e => setStaffId(e.target.value)}
            placeholder="e.g. MMCL-C001"
            autoComplete="username"
            className="rounded-[10px] border border-slate-200 px-4 py-3 text-[14px] text-slate-800 outline-none placeholder:text-slate-300 focus:border-[#A881C2] focus:ring-2 focus:ring-[#A881C2]/20 transition-all"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[12px] font-semibold uppercase tracking-wide text-slate-500">
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Enter password"
            autoComplete="current-password"
            className="rounded-[10px] border border-slate-200 px-4 py-3 text-[14px] text-slate-800 outline-none placeholder:text-slate-300 focus:border-[#A881C2] focus:ring-2 focus:ring-[#A881C2]/20 transition-all"
          />
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-[10px] bg-red-50 px-4 py-2.5 text-[13px] text-red-600">
            <AlertCircle size={14} /> {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !staffId || !password}
          className="mt-1 flex items-center justify-center gap-2 rounded-[12px] py-3.5 text-[14px] font-semibold text-white transition-all disabled:opacity-50"
          style={{ backgroundColor: "#A881C2" }}
        >
          {loading ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : "Sign In"}
        </button>

        <button
          type="button"
          onClick={() => { setStaffId(DEMO_ID); setPassword(DEMO_PWD); setError(""); }}
          className="text-center text-[12px] text-slate-400 underline underline-offset-2 transition-colors hover:text-[#A881C2]"
        >
          Use demo credentials
        </button>
      </form>

      <button
        type="button"
        onClick={() => router.push("/login")}
        className="mt-5 flex items-center gap-1.5 text-[13px] text-slate-400 transition-colors hover:text-[#A881C2]"
      >
        <ArrowLeft size={13} /> Back to student login
      </button>
    </div>
  );
}

/* ── Dashboard ────────────────────────────────────────────────── */

function Dashboard({
  cases,
  onSubmit,
  onLogout,
  loading,
  fetchError,
  onRetry,
}: {
  cases: JournalCase[];
  onSubmit: (reviewId: string, comment: string) => void;
  onLogout: () => void;
  loading: boolean;
  fetchError: boolean;
  onRetry: () => void;
}) {
  const [activeTab, setActiveTab] = useState<"attention" | "reviewed">("attention");

  const attentionCases = cases.filter(c => !c.isReviewed);
  const reviewedCases = cases.filter(c => c.isReviewed);
  const feed = activeTab === "attention" ? attentionCases : reviewedCases;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <header className="sticky top-0 z-10 border-b border-slate-100 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-[10px] text-white"
              style={{ backgroundColor: "#A881C2" }}
            >
              <BookOpen size={18} strokeWidth={1.75} />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#A881C2]">Tala</p>
              <h1 className="text-[16px] font-bold leading-none text-slate-800">Professional Portal</h1>
            </div>
          </div>

          <button
            onClick={onLogout}
            className="flex items-center gap-2 rounded-[10px] border border-slate-200 px-4 py-2 text-[13px] font-medium text-slate-600 transition-all hover:bg-slate-50 active:scale-[0.97]"
          >
            <LogOut size={14} /> Logout
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-4xl px-6 py-8">
        {loading ? (
          <div className="flex flex-col items-center gap-3 py-20">
            <Loader2 size={28} className="animate-spin text-[#A881C2]" />
            <p className="text-[14px] text-slate-400">Loading cases...</p>
          </div>
        ) : fetchError ? (
          <div className="flex flex-col items-center gap-3 rounded-[16px] bg-white py-16 text-center shadow-sm ring-1 ring-slate-100">
            <AlertCircle size={40} color="#EF4444" strokeWidth={1.5} />
            <p className="text-[16px] font-semibold text-slate-700">Failed to load cases</p>
            <button onClick={onRetry} className="rounded-full bg-[#A881C2] px-5 py-2 text-[13px] font-semibold text-white">
              Retry
            </button>
          </div>
        ) : (
          <>
            {/* Summary stats */}
            <div className="mb-6 grid grid-cols-3 gap-4">
              {[
                { label: "Total Cases", value: cases.length, color: "text-slate-800" },
                { label: "Needs Attention", value: attentionCases.length, color: "text-amber-600" },
                { label: "Reviewed", value: reviewedCases.length, color: "text-emerald-600" },
              ].map(stat => (
                <div
                  key={stat.label}
                  className="flex flex-col gap-1 rounded-[14px] bg-white px-5 py-4 shadow-sm ring-1 ring-slate-100"
                >
                  <span className="text-[12px] font-medium text-slate-400">{stat.label}</span>
                  <span className={`text-[28px] font-bold leading-none ${stat.color}`}>{stat.value}</span>
                </div>
              ))}
            </div>

            {/* Tabs */}
            <div className="mb-5 flex items-center gap-1 rounded-[12px] bg-slate-100 p-1 w-fit">
              {([
                { id: "attention", label: "Needs Attention", count: attentionCases.length },
                { id: "reviewed", label: "Reviewed", count: reviewedCases.length },
              ] as const).map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="flex items-center gap-2 rounded-[9px] px-4 py-2 text-[13px] font-semibold transition-all"
                  style={
                    activeTab === tab.id
                      ? { backgroundColor: "white", color: "#A881C2", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }
                      : { color: "#94a3b8" }
                  }
                >
                  {tab.label}
                  <span
                    className="rounded-full px-2 py-0.5 text-[11px] font-bold"
                    style={{
                      backgroundColor: activeTab === tab.id ? "#A881C2" : "#cbd5e1",
                      color: "white",
                    }}
                  >
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Feed */}
            {feed.length === 0 ? (
              <div className="flex flex-col items-center gap-3 rounded-[16px] bg-white py-16 text-center shadow-sm ring-1 ring-slate-100">
                <CheckCircle2 size={40} color="#22C55E" strokeWidth={1.5} />
                <p className="text-[16px] font-semibold text-slate-700">
                  {activeTab === "attention" ? "All caught up!" : "No reviewed cases yet."}
                </p>
                <p className="text-[13px] text-slate-400">
                  {activeTab === "attention"
                    ? "No cases require attention right now."
                    : "Reviewed cases will appear here after submission."}
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {feed.map(item => (
                  <CaseCard key={item.reviewId} item={item} onSubmit={onSubmit} />
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

/* ── Page ─────────────────────────────────────────────────────── */

export default function ProfessionalPage() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [cases, setCases] = useState<JournalCase[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState(false);

  const fetchCases = useCallback(async () => {
    setLoading(true);
    setFetchError(false);
    try {
      const res = await fetch("/api/professional/cases");
      if (!res.ok) throw new Error("fetch failed");
      const data = (await res.json()) as { cases: ApiCase[] };
      setCases(data.cases.map(toDisplayCase));
    } catch {
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (loggedIn) {
      void fetchCases();
    }
  }, [loggedIn, fetchCases]);

  const handleSubmit = (reviewId: string, comment: string) => {
    setCases(prev =>
      prev.map(c =>
        c.reviewId === reviewId ? { ...c, isReviewed: true, counselorComment: comment } : c
      )
    );
  };

  if (!loggedIn) {
    return <LoginScreen onLogin={() => setLoggedIn(true)} />;
  }

  return (
    <Dashboard
      cases={cases}
      onSubmit={handleSubmit}
      onLogout={() => setLoggedIn(false)}
      loading={loading}
      fetchError={fetchError}
      onRetry={fetchCases}
    />
  );
}
