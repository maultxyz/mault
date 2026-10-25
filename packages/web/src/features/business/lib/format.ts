import i18n from "i18next";

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "-";
  return new Intl.DateTimeFormat(i18n.language, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

export function formatDay(iso: string | null | undefined): string {
  if (!iso) return "-";
  return new Intl.DateTimeFormat(i18n.language, { dateStyle: "medium" }).format(
    new Date(iso),
  );
}

export function formatPercent(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "-";
  return new Intl.NumberFormat(i18n.language, {
    style: "percent",
    maximumFractionDigits: 1,
  }).format(value);
}

export function downloadTextFile(
  filename: string,
  contents: string,
  type = "text/csv;charset=utf-8;",
): void {
  const url = URL.createObjectURL(new Blob([contents], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
