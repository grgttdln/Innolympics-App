export function getTagalogGreeting(now: Date): string {
  const hour = now.getHours();
  if (hour >= 5 && hour < 12) return "Magandang umaga,";
  if (hour >= 12 && hour < 18) return "Magandang hapon,";
  return "Magandang gabi,";
}
