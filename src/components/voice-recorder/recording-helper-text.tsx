type Props = {
  paused: boolean;
};

const RECORDING_TEXT = "Magsalita ka lang, nakikinig ako.";
const PAUSED_TEXT = "Naka-pause. I-tap ang Resume para magpatuloy.";

export function RecordingHelperText({ paused }: Props) {
  return (
    <p className="text-center text-[14px] italic text-[#8A8A8A]">
      {paused ? PAUSED_TEXT : RECORDING_TEXT}
    </p>
  );
}
