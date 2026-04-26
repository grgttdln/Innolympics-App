import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-100">
      <div className="relative flex h-[844px] w-[390px] flex-col overflow-hidden bg-white">
        <div className="h-[62px] shrink-0" aria-hidden />

        <div className="flex flex-1 flex-col gap-7 px-6 pb-6">
          <div className="relative h-[360px] w-full overflow-hidden rounded-2xl bg-[linear-gradient(135deg,#E8D5F0_0%,#A881C2_100%)]">
            <span
              className="absolute h-[220px] w-[220px] rounded-full bg-[#FFD700] opacity-55"
              style={{ left: -50, top: 210 }}
              aria-hidden
            />
            <span
              className="absolute h-[170px] w-[170px] rounded-full bg-[#FCFAF7] opacity-35"
              style={{ left: 210, top: -50 }}
              aria-hidden
            />
            <span
              className="absolute h-[130px] w-[130px] origin-top-left rounded-[28px] bg-white opacity-[0.22]"
              style={{ left: 185, top: 200, transform: "rotate(-12deg)" }}
              aria-hidden
            />
            <span
              className="absolute h-[60px] w-[60px] rounded-full bg-[#1A1A1A] opacity-15"
              style={{ left: 75, top: 70 }}
              aria-hidden
            />
            <span
              className="absolute h-[18px] w-[18px] rounded-full bg-white opacity-70"
              style={{ left: 250, top: 180 }}
              aria-hidden
            />
          </div>

          <div className="flex flex-col gap-2.5">
            <h1 className="font-[var(--font-geist-sans)] text-[36px] font-bold leading-none tracking-[-1px] text-[#1A1A1A]">
              Tala
            </h1>
            <p className="text-[15px] leading-[1.45] text-[#666666]">
              A gentle companion for your thoughts. Journal by voice or text,
              and let Tala listen, reflect, and ground you when things feel
              heavy.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <Link
              href="/signup"
              className="flex h-14 w-full items-center justify-center rounded-full bg-[#A881C2] text-base font-semibold text-white transition-opacity hover:opacity-90 active:opacity-80"
            >
              Create account
            </Link>
            <Link
              href="/login"
              className="flex h-14 w-full items-center justify-center rounded-full bg-[#F5F2ED] text-base font-semibold text-[#1A1A1A] transition-opacity hover:opacity-90 active:opacity-80"
            >
              Log in
            </Link>
          </div>

          <div className="flex justify-center">
            <p className="text-center text-[11px] leading-[1.5] text-[#999999]">
              By continuing, you agree to our Terms of Service and Privacy
              Policy
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
