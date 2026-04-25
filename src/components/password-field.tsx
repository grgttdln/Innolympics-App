"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";

type PasswordFieldProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoComplete?: "new-password" | "current-password";
  required?: boolean;
};

export function PasswordField({
  value,
  onChange,
  placeholder = "••••••••",
  autoComplete = "current-password",
  required = true,
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        type={visible ? "text" : "password"}
        required={required}
        autoComplete={autoComplete}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-14 w-full rounded-2xl bg-[#F5F2ED] px-5 pr-12 text-base text-[#1A1A1A] placeholder:text-[#999999] focus:outline-none focus:ring-2 focus:ring-[#A881C2]"
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        className="absolute right-4 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center text-[#666666] transition-opacity hover:opacity-70"
      >
        {visible ? (
          <EyeOff className="h-5 w-5" strokeWidth={1.75} />
        ) : (
          <Eye className="h-5 w-5" strokeWidth={1.75} />
        )}
      </button>
    </div>
  );
}
