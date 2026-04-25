"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { AuthShell } from "@/components/auth-shell";
import { PasswordField } from "@/components/password-field";
import { saveUser, type StoredUser } from "@/lib/session";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const response = await fetch("/api/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;
      setError(data?.error ?? "Something went wrong");
      setSubmitting(false);
      return;
    }

    const user = (await response.json()) as StoredUser;
    saveUser(user);
    router.push("/dashboard");
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Enter your email to pick up where you left off."
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-2 text-[13px] font-medium text-[#1A1A1A]">
          Email
          <input
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="h-14 w-full rounded-2xl bg-[#F5F2ED] px-5 text-base text-[#1A1A1A] placeholder:text-[#999999] focus:outline-none focus:ring-2 focus:ring-[#A881C2]"
          />
        </label>

        <label className="flex flex-col gap-2 text-[13px] font-medium text-[#1A1A1A]">
          Password
          <PasswordField
            value={password}
            onChange={setPassword}
            autoComplete="current-password"
          />
        </label>

        {error ? (
          <p className="text-[13px] text-red-600">{error}</p>
        ) : null}

        <button
          type="submit"
          disabled={submitting}
          className="flex h-14 w-full items-center justify-center rounded-full bg-[#A881C2] text-base font-semibold text-white transition-opacity hover:opacity-90 active:opacity-80 disabled:opacity-60"
        >
          {submitting ? "Logging in…" : "Log in"}
        </button>

        <div className="flex justify-center gap-1 pt-1.5 text-[14px]">
          <span className="text-[#666666]">New here?</span>
          <Link href="/signup" className="font-semibold text-[#A881C2]">
            Create an account
          </Link>
        </div>

        <div className="flex justify-center pt-1">
          <Link
            href="/professional"
            className="flex items-center gap-1.5 text-[12px] text-[#B8B0A7] transition-colors hover:text-[#A881C2]"
          >
            Are you a counselor?{" "}
            <span className="font-semibold text-[#A881C2]">Professional Portal →</span>
          </Link>
        </div>
      </form>
    </AuthShell>
  );
}
