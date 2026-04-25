"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { AuthShell } from "@/components/auth-shell";
import { PasswordField } from "@/components/password-field";
import { saveUser, type StoredUser } from "@/lib/session";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const response = await fetch("/api/signup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, name, password }),
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
      title="Create account"
      subtitle="Join Nova and start organizing your day with intention."
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field label="Full name">
          <input
            type="text"
            required
            autoComplete="name"
            placeholder="Your name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="h-14 w-full bg-[#F5F2ED] px-5 text-base text-[#1A1A1A] placeholder:text-[#999999] focus:outline-none focus:ring-2 focus:ring-[#A881C2]"
          />
        </Field>

        <Field label="Email address">
          <input
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="h-14 w-full bg-[#F5F2ED] px-5 text-base text-[#1A1A1A] placeholder:text-[#999999] focus:outline-none focus:ring-2 focus:ring-[#A881C2]"
          />
        </Field>

        <Field label="Password">
          <PasswordField
            value={password}
            onChange={setPassword}
            autoComplete="new-password"
          />
          <p className="pt-1 text-[12px] font-normal text-[#999999]">
            Minimum 8 characters with a number and symbol.
          </p>
        </Field>

        {error ? (
          <p className="text-[13px] text-red-600">{error}</p>
        ) : null}

        <button
          type="submit"
          disabled={submitting}
          className="flex h-14 w-full items-center justify-center bg-[#A881C2] text-base font-semibold text-white transition-opacity hover:opacity-90 active:opacity-80 disabled:opacity-60"
        >
          {submitting ? "Creating…" : "Register"}
        </button>

        <div className="flex justify-center gap-1 pt-1.5 text-[14px]">
          <span className="text-[#666666]">Already have an account?</span>
          <Link href="/login" className="font-semibold text-[#A881C2]">
            Log in
          </Link>
        </div>
      </form>
    </AuthShell>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-2 text-[13px] font-medium text-[#1A1A1A]">
      {label}
      {children}
    </label>
  );
}
