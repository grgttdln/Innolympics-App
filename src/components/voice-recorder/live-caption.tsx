"use client";

export function LiveCaption({ text }: { text: string }) {
  return (
    <p
      className="mx-auto max-w-[320px] min-h-[48px] text-center text-[17px] leading-[24px] text-[#1A1A1A]"
      aria-live="polite"
    >
      {text}
    </p>
  );
}
