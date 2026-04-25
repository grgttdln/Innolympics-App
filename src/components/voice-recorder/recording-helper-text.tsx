type Props = {
  status: "idle" | "recording" | "paused";
};

const IDLE_TEXT = "I-tap ang pindutan para magsimula.";
const RECORDING_TEXT = "Magsalita ka lang, nakikinig ako.";
const PAUSED_TEXT = "Naka-pause. I-tap ang Resume para magpatuloy.";

export function RecordingHelperText({ status }: Props) {
  const text = status === "idle" ? IDLE_TEXT : status === "paused" ? PAUSED_TEXT : RECORDING_TEXT;
  return (
    <p className="text-center text-[14px] italic text-[#8A8A8A]">{text}</p>
  );
}
