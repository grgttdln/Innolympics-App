"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, ChevronRight, Phone, Pencil, Check, LogOut } from "lucide-react";
import { BottomNav } from "@/components/bottom-nav";
import { loadUser, clearUser, type StoredUser } from "@/lib/session";
import { getGreeting } from "@/lib/greeting";

/* ── Types ────────────────────────────────────────────────────── */

type Mood = "calm" | "happy" | "anxious" | "sad" | "overwhelmed";

type JournalEntry = {
  id: string;
  date: string;
  excerpt: string;
  fullText: string;
  mood: Mood;
};

/* ── Config ───────────────────────────────────────────────────── */

const MOOD_COLOR: Record<Mood, string> = {
  calm:        "#D4B5E8",
  happy:       "#B5E8C8",
  anxious:     "#F5D5A8",
  sad:         "#B5CCE8",
  overwhelmed: "#F0B5B5",
};

const HOTLINES = [
  { name: "DOH Mental Health Crisis Line", number: "1553",           tel: "1553" },
  { name: "NCMH Crisis Line (USAP)",       number: "0917-899-8727",  tel: "09178998727" },
  { name: "In Touch Crisis Line",          number: "(02) 8893-7603", tel: "0288937603" },
];

const ENTRIES_PER_PAGE = 3;

/* ── Mock data ────────────────────────────────────────────────── */

const INITIAL_ENTRIES: JournalEntry[] = [
  {
    id: "1", date: "Oct 12, 2025", mood: "calm",
    excerpt: "Today was overwhelming. I found myself unable to focus during the morning...",
    fullText: "Today was overwhelming. I found myself unable to focus during the morning. I tried the box breathing technique and it helped a little. I need to rest more and plan better for tomorrow.",
  },
  {
    id: "2", date: "Oct 8, 2025", mood: "happy",
    excerpt: "Managed to complete my thesis outline. It felt like a small victory even though anxiety is still there...",
    fullText: "Managed to complete my thesis outline. It felt like a small victory even though anxiety is still there. I'm proud of myself for pushing through. Treated myself to a walk after.",
  },
  {
    id: "3", date: "Oct 3, 2025", mood: "anxious",
    excerpt: "Woke up early and did some breathing exercises. The counselor suggested I try journaling...",
    fullText: "Woke up early and did some breathing exercises. The counselor suggested I try journaling as a way to process my thoughts. I think it's helping me see patterns in my mood.",
  },
  {
    id: "4", date: "Sep 28, 2025", mood: "sad",
    excerpt: "Missing home a lot today. Called my mom in the evening and that helped a bit...",
    fullText: "Missing home a lot today. Called my mom in the evening and that helped a bit. It's hard being away during the semester. Going to reach out to a friend tomorrow.",
  },
  {
    id: "5", date: "Sep 22, 2025", mood: "overwhelmed",
    excerpt: "Three deadlines collided today. I almost broke down but used the grounding exercise...",
    fullText: "Three deadlines collided today. I almost broke down but used the 5-4-3-2-1 grounding exercise on my phone and it calmed me down enough to finish. One day at a time.",
  },
];

/* ── Helpers ──────────────────────────────────────────────────── */

function getInitials(name: string) {
  return name
    .trim()
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join("");
}

/* ── Main page ────────────────────────────────────────────────── */

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser]       = useState<StoredUser | null>(null);
  const [entries, setEntries] = useState<JournalEntry[]>(INITIAL_ENTRIES);
  const [confirmId, setConfirmId]   = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [page, setPage]             = useState(0);

  /* Bio edit state */
  const [bio, setBio]         = useState("Add a short bio…");
  const [editingBio, setEditingBio] = useState(false);
  const [bioInput, setBioInput]     = useState("");
  const bioRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const stored = loadUser();
    if (!stored) { router.replace("/login"); return; }
    setUser(stored);
  }, [router]);

  /* Bio edit handlers */
  const startEdit = () => {
    setBioInput(bio === "Add a short bio…" ? "" : bio);
    setEditingBio(true);
    setTimeout(() => bioRef.current?.focus(), 50);
  };
  const saveBio = () => {
    setBio(bioInput.trim() || "Add a short bio…");
    setEditingBio(false);
  };

  /* Pagination */
  const totalPages = Math.ceil(entries.length / ENTRIES_PER_PAGE);
  const pageEntries = entries.slice(page * ENTRIES_PER_PAGE, page * ENTRIES_PER_PAGE + ENTRIES_PER_PAGE);

  const handleLogout = () => {
    clearUser();
    router.replace("/login");
  };

  const handleDelete = (id: string) => {
    const next = entries.filter(e => e.id !== id);
    setEntries(next);
    setConfirmId(null);
    setExpandedId(null);
    /* If deleting last item on the page, step back */
    const newTotal = Math.ceil(next.length / ENTRIES_PER_PAGE);
    if (page >= newTotal && page > 0) setPage(p => p - 1);
  };

  if (!user) return null;

  const initials = getInitials(user.name);
  const greeting = getGreeting(new Date());

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-100">
      <div className="relative flex h-[844px] w-[390px] flex-col overflow-hidden rounded-[40px] bg-[#FCFAF7]">
        <div className="h-[50px] shrink-0" aria-hidden />

        {/* ── Page header ── */}
        <div className="flex items-start justify-between px-6 pb-2 pt-5">
          <div>
            <h1 className="text-[28px] font-bold leading-tight tracking-[-0.3px] text-[#1A1A1A]">
              Profile
            </h1>
            <p className="mt-0.5 text-[14px] text-[#B8B0A7]">
              {greeting}, {user.name.split(" ")[0]} ✦
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
            {/* Avatar */}
            <div
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-[17px] font-bold text-white"
              style={{ backgroundColor: "#7B5EA7" }}
            >
              {initials}
            </div>

            {/* Info */}
            <div className="flex flex-1 flex-col gap-1">
              <p className="text-[17px] font-bold leading-none text-[#2A1A4A]">{user.name}</p>
              <p className="text-[12px] text-[#7B5EA7]">{user.email}</p>

              {/* Editable bio */}
              <div className="mt-2">
                {editingBio ? (
                  <div className="flex flex-col gap-2">
                    <textarea
                      ref={bioRef}
                      value={bioInput}
                      onChange={e => setBioInput(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); saveBio(); } }}
                      rows={2}
                      placeholder="Write something about yourself…"
                      className="w-full resize-none rounded-[10px] bg-white/50 px-3 py-2 text-[12px] leading-relaxed text-[#2A1A4A] outline-none placeholder:text-[#A881C2]/50"
                    />
                    <button
                      onClick={saveBio}
                      className="flex w-fit items-center gap-1 rounded-full bg-[#7B5EA7] px-3 py-1.5 text-[11px] font-semibold text-white"
                    >
                      <Check size={11} /> Save
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={startEdit}
                    className="flex items-start gap-1.5 text-left"
                  >
                    <span
                      className="text-[12px] leading-relaxed"
                      style={{ color: bio === "Add a short bio…" ? "rgba(123,94,167,0.5)" : "#3B1F5E" }}
                    >
                      {bio}
                    </span>
                    <Pencil size={11} className="mt-0.5 shrink-0" color="#7B5EA7" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Journal entries */}
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[16px] font-bold text-[#1A1A1A]">My Journal Entries</h2>
              <span className="text-[13px] font-medium" style={{ color: "#A881C2" }}>
                {entries.length} {entries.length === 1 ? "entry" : "entries"}
              </span>
            </div>

            {entries.length === 0 ? (
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
                        {/* Mood square */}
                        <div
                          className="mt-0.5 h-11 w-11 shrink-0 rounded-[12px]"
                          style={{ backgroundColor: MOOD_COLOR[entry.mood] }}
                        />

                        {/* Text */}
                        <button
                          className="flex flex-1 flex-col gap-0.5 text-left"
                          onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                        >
                          <span className="text-[12px] font-medium" style={{ color: "#A881C2" }}>
                            {entry.date}
                          </span>
                          <span className="text-[13px] leading-snug text-[#333333] line-clamp-2">
                            {expandedId === entry.id ? entry.fullText : entry.excerpt}
                          </span>
                        </button>

                        {/* Actions */}
                        <div className="flex shrink-0 items-center gap-1 pt-1">
                          {confirmId === entry.id ? (
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => handleDelete(entry.id)}
                                className="rounded-[8px] bg-[#D47B7B] px-2.5 py-1 text-[11px] font-semibold text-white"
                              >
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
                            <>
                              <button
                                onClick={() => setConfirmId(entry.id)}
                                className="flex h-8 w-8 items-center justify-center rounded-full text-[#C8C0D0] transition-colors hover:text-[#D47B7B]"
                                aria-label="Delete"
                              >
                                <Trash2 size={15} />
                              </button>
                              <button
                                onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                                className="flex h-8 w-8 items-center justify-center rounded-full text-[#C8C0D0]"
                                aria-label="View"
                              >
                                <ChevronRight size={16} />
                              </button>
                            </>
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
                      style={{
                        backgroundColor: "rgba(168,129,194,0.1)",
                        color: "#7B5EA7",
                      }}
                    >
                      ← Prev
                    </button>

                    <span className="text-[12px] text-[#B8B0A7]">
                      {page + 1} / {totalPages}
                    </span>

                    <button
                      onClick={() => setPage(p => p + 1)}
                      disabled={page >= totalPages - 1}
                      className="rounded-[12px] px-4 py-2 text-[13px] font-medium transition-all disabled:opacity-30"
                      style={{
                        backgroundColor: "rgba(168,129,194,0.1)",
                        color: "#7B5EA7",
                      }}
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

            <div
              className="flex flex-col overflow-hidden rounded-[18px] bg-white"
              style={{ border: "1px solid #EDE5F5", boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}
            >
              {HOTLINES.map((h, i) => (
                <div key={h.tel}>
                  <div className="flex items-center gap-3 px-4 py-4">
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                      style={{ backgroundColor: "rgba(168,129,194,0.12)" }}
                    >
                      <Phone size={16} color="#A881C2" />
                    </div>
                    <div className="flex flex-1 flex-col gap-0.5">
                      <p className="text-[13px] font-semibold leading-none text-[#1A1A1A]">{h.name}</p>
                      <p className="text-[12px]" style={{ color: "#A881C2" }}>{h.number}</p>
                    </div>
                    <a
                      href={`tel:${h.tel}`}
                      className="rounded-full px-4 py-2 text-[13px] font-semibold text-white transition-all active:scale-[0.97]"
                      style={{ backgroundColor: "#7B5EA7" }}
                    >
                      Call
                    </a>
                  </div>
                  {i < HOTLINES.length - 1 && (
                    <div className="mx-4 h-px" style={{ backgroundColor: "#F0E8F8" }} />
                  )}
                </div>
              ))}
            </div>
          </section>
        </div>

        <BottomNav />
      </div>
    </main>
  );
}
