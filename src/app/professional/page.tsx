"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, ShieldAlert, BookOpen, AlertCircle, CheckCircle2, Clock, ArrowLeft } from "lucide-react";

const DEMO_ID  = "MMCL-C001";
const DEMO_PWD = "tala2026";

/* ── Types ────────────────────────────────────────────────────── */

type Severity = "critical" | "high" | "moderate" | "low";

type JournalCase = {
  id: string;
  anonymousId: string;
  date: string;
  aiSummary: string;
  severity: Severity;
  journalText: string;
  isReviewed: boolean;
  counselorComment?: string;
};

/* ── Severity config ──────────────────────────────────────────── */

const SEVERITY: Record<Severity, { label: string; bg: string; text: string; dot: string }> = {
  critical: { label: "Critical", bg: "#FEE2E2", text: "#991B1B", dot: "#EF4444" },
  high:     { label: "High",     bg: "#FEF3C7", text: "#92400E", dot: "#F59E0B" },
  moderate: { label: "Moderate", bg: "#EDE9FE", text: "#5B21B6", dot: "#8B5CF6" },
  low:      { label: "Low",      bg: "#DCFCE7", text: "#166534", dot: "#22C55E" },
};

/* ── Mock data ────────────────────────────────────────────────── */

const INITIAL_CASES: JournalCase[] = [
  {
    id: "1",
    anonymousId: "Student 402",
    date: "Apr 25, 2026",
    aiSummary: "Crisis Risk — Monitor",
    severity: "critical",
    isReviewed: false,
    journalText:
      "I don't know how to keep going. Everything feels pointless right now. I haven't told anyone but I've been thinking about what it would feel like to just disappear. I'm not okay and I don't know who to talk to.",
  },
  {
    id: "2",
    anonymousId: "Student 118",
    date: "Apr 24, 2026",
    aiSummary: "High Academic Stress",
    severity: "high",
    isReviewed: false,
    journalText:
      "Thesis defense is in two weeks and I feel completely unprepared. I've been sleeping maybe 3–4 hours a night and can barely eat. My adviser barely responds and I feel completely alone in this. I'm scared I'm going to fail and disappoint everyone.",
  },
  {
    id: "3",
    anonymousId: "Student 273",
    date: "Apr 23, 2026",
    aiSummary: "Anxiety & Social Isolation",
    severity: "high",
    isReviewed: false,
    journalText:
      "I've stopped going to most of my classes because I have a panic attack every time I try to leave my room. My roommates have stopped talking to me. I eat alone and I don't remember the last time I had a real conversation with anyone. I feel like I'm disappearing.",
  },
  {
    id: "4",
    anonymousId: "Student 056",
    date: "Apr 22, 2026",
    aiSummary: "Burnout & Emotional Exhaustion",
    severity: "moderate",
    isReviewed: false,
    journalText:
      "I used to love studying. Now I dread every single day. I submitted my report late for the third time this month. My professors keep emailing me. I know I should care but I just... don't feel anything. It's like I'm running on empty and someone removed the fuel tank.",
  },
  {
    id: "5",
    anonymousId: "Student 331",
    date: "Apr 21, 2026",
    aiSummary: "Moderate Sadness — Possible Grief",
    severity: "moderate",
    isReviewed: false,
    journalText:
      "My grandmother passed away last month and I haven't been able to process it. My family expected me to be strong during the wake and just go back to school right after. Some days are okay. Other days I'll be in the middle of a lecture and just start crying silently. I miss her.",
  },
  {
    id: "6",
    anonymousId: "Student 089",
    date: "Apr 20, 2026",
    aiSummary: "Low-Level Stress — Routine Check",
    severity: "low",
    isReviewed: true,
    counselorComment:
      "Acknowledged. Student appears to be managing adequately. Recommended continued journaling and scheduled a follow-up session for next week to assess coping strategies.",
    journalText:
      "Midterms went okay. Not great, but okay. I've been stressed but I'm using the breathing exercises. I still feel a bit anxious about the future but today was better than yesterday.",
  },
];

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
  onSubmit: (id: string, comment: string) => void;
}) {
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (!comment.trim()) return;
    onSubmit(item.id, comment.trim());
    setSubmitted(true);
  };

  return (
    <div className="flex flex-col gap-4 rounded-[16px] bg-white p-5 shadow-sm ring-1 ring-slate-100">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="text-[15px] font-bold text-slate-800">{item.anonymousId}</span>
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
        <p className="text-[13px] leading-relaxed text-slate-600">{item.journalText}</p>
      </div>

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
            disabled={submitted}
            className="w-full resize-none rounded-[10px] border border-slate-200 bg-white px-4 py-3 text-[13px] leading-relaxed text-slate-700 outline-none placeholder:text-slate-300 focus:border-[#A881C2] focus:ring-2 focus:ring-[#A881C2]/20 disabled:opacity-50 transition-all"
          />
          <div className="flex items-center justify-between">
            <p className="text-[12px] text-slate-400">
              {submitted ? "Response submitted. Moving to Reviewed…" : "Submitting will mark this case as reviewed."}
            </p>
            <button
              onClick={handleSubmit}
              disabled={!comment.trim() || submitted}
              className="rounded-[10px] px-5 py-2.5 text-[13px] font-semibold text-white transition-all active:scale-[0.97] disabled:opacity-40"
              style={{ backgroundColor: "#A881C2" }}
            >
              Submit Comment
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
  const [staffId, setStaffId]   = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

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
}: {
  cases: JournalCase[];
  onSubmit: (id: string, comment: string) => void;
  onLogout: () => void;
}) {
  const [activeTab, setActiveTab] = useState<"attention" | "reviewed">("attention");

  const attentionCases = cases.filter(c => !c.isReviewed);
  const reviewedCases  = cases.filter(c => c.isReviewed);
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
            { id: "reviewed",  label: "Reviewed",        count: reviewedCases.length },
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
              <CaseCard key={item.id} item={item} onSubmit={onSubmit} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

/* ── Page ─────────────────────────────────────────────────────── */

export default function ProfessionalPage() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [cases, setCases]       = useState<JournalCase[]>(INITIAL_CASES);

  const handleSubmit = (id: string, comment: string) => {
    setCases(prev =>
      prev.map(c =>
        c.id === id ? { ...c, isReviewed: true, counselorComment: comment } : c
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
    />
  );
}
