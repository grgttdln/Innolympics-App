const BAR_COUNT = 30;
const RESTING_PX = 12;
const MAX_PX = 96;
const CENTER = (BAR_COUNT - 1) / 2;

// Pre-baked spindle envelope + per-bar color, computed once.
const ENVELOPE: readonly number[] = Array.from({ length: BAR_COUNT }, (_, i) => {
  const dist = Math.abs(i - CENTER) / CENTER;
  const eased = 1 - dist * dist;
  return Math.max(0.15, eased);
});

const COLORS: readonly string[] = Array.from({ length: BAR_COUNT }, (_, i) => {
  const dist = Math.abs(i - CENTER) / CENTER;
  const lightness = 50 + dist * 28;
  return `hsl(265, 85%, ${lightness.toFixed(0)}%)`;
});

type Props = {
  amplitude: number;
  paused?: boolean;
};

export function RecordingWaveform({ amplitude, paused = false }: Props) {
  const effective = paused ? 0 : Math.min(1, Math.max(0, amplitude));

  return (
    <div className="flex h-32 items-center justify-center gap-1">
      {ENVELOPE.map((env, i) => {
        const height = RESTING_PX + (MAX_PX - RESTING_PX) * effective * env;
        return (
          <span
            key={i}
            className="rounded-full transition-[height] duration-75 ease-out"
            style={{
              width: 6,
              height,
              backgroundColor: COLORS[i],
            }}
            aria-hidden
          />
        );
      })}
    </div>
  );
}
