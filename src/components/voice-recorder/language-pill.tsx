type Props = {
  language: string;
};

export function LanguagePill({ language }: Props) {
  return (
    <div className="flex h-9 items-center gap-2 rounded-full bg-[#F5F2ED] px-4">
      <span className="h-1.5 w-1.5 rounded-full bg-[#8B5CF6]" aria-hidden />
      <span className="text-[13px] text-[#1A1A1A]">{language}</span>
    </div>
  );
}
