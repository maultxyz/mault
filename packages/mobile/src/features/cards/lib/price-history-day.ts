export function formatPriceHistoryDay(day: string, locale: string): string {
  return new Date(`${day}T00:00:00Z`).toLocaleDateString(locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}
