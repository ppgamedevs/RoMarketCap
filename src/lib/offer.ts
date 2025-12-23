export function normalizeLaunchOfferText(input: string | undefined | null): string {
  const s = (input ?? "").trim();
  if (!s) return "";
  return s.length > 200 ? s.slice(0, 200) : s;
}


