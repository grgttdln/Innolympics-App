type Props = {
  durationMs: number;
};

function format(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const s = (totalSeconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export function RecordingTimer({ durationMs }: Props) {
  return (
    <div
      className="text-center text-[96px] font-medium tabular-nums text-[#1A1A1A]"
      style={{ fontFamily: "var(--font-geist-sans)", letterSpacing: "-0.04em", lineHeight: 1 }}
    >
      {format(durationMs)}
    </div>
  );
}
