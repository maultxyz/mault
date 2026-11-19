export function formatDay(date: string, locale?: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString(locale, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function formatDateTime(value: string | number | Date, locale?: string): string {
  return new Date(value).toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" });
}

export function formatShortDate(value: string | number | Date, locale?: string): string {
  return new Date(value).toLocaleDateString(locale, { month: "short", day: "numeric" });
}
