import type { AnnouncementSeverity, SyncState } from "@magic-vault/shared";

export type ThemeColor = {
  name: string;
  value: string;
  fg: string;
};

export const THEME_COLORS: ThemeColor[] = [
  { name: "Red", value: "#ef4444", fg: "#ffffff" },
  { name: "Orange", value: "#f97316", fg: "#ffffff" },
  { name: "Amber", value: "#f59e0b", fg: "#1c1917" },
  { name: "Yellow", value: "#eab308", fg: "#1c1917" },
  { name: "Lime", value: "#84cc16", fg: "#1c1917" },
  { name: "Green", value: "#22c55e", fg: "#ffffff" },
  { name: "Emerald", value: "#10b981", fg: "#ffffff" },
  { name: "Teal", value: "#14b8a6", fg: "#ffffff" },
  { name: "Cyan", value: "#06b6d4", fg: "#ffffff" },
  { name: "Sky", value: "#0ea5e9", fg: "#ffffff" },
  { name: "Blue", value: "#3b82f6", fg: "#ffffff" },
  { name: "Indigo", value: "#6366f1", fg: "#ffffff" },
  { name: "Violet", value: "#8b5cf6", fg: "#ffffff" },
  { name: "Purple", value: "#a855f7", fg: "#ffffff" },
  { name: "Fuchsia", value: "#d946ef", fg: "#ffffff" },
  { name: "Pink", value: "#ec4899", fg: "#ffffff" },
  { name: "Rose", value: "#f43f5e", fg: "#ffffff" },
];

export const SYNC_STATUS_COLORS: Record<SyncState["status"], string> = {
  idle: "var(--muted-foreground)",
  running: "oklch(0.623 0.214 259.815)",
  completed: "oklch(0.696 0.17 162.48)",
  failed: "oklch(0.637 0.237 25.331)",
  cancelled: "oklch(0.795 0.184 86.047)",
};

export const ALERT_SEVERITY_BANNER_CLASS: Record<AnnouncementSeverity, string> = {
  info: "border-blue-500/30 bg-blue-400/20 text-blue-900 dark:bg-blue-400/10 dark:text-blue-200",
  warning:
    "border-amber-500/30 bg-amber-400/20 text-amber-900 dark:bg-amber-400/10 dark:text-amber-200",
  danger:
    "border-red-500/30 bg-red-500/20 text-red-900 dark:bg-red-500/10 dark:text-red-300",
};

export const ALERT_SEVERITY_ICON_CLASS: Record<AnnouncementSeverity, string> = {
  info: "text-blue-800 dark:text-blue-400",
  warning: "text-amber-800 dark:text-amber-400",
  danger: "text-red-600 dark:text-red-400",
};

export const CARD_COLOR_ACTIVE_CLASS: Record<string, string> = {
  W: "bg-amber-100 text-amber-900 border-amber-400",
  U: "bg-blue-700 text-white border-blue-800",
  B: "bg-neutral-900 text-white border-neutral-700",
  R: "bg-red-700 text-white border-red-800",
  G: "bg-green-700 text-white border-green-800",
  C: "bg-gray-600 text-white border-gray-700",
};

export const CARD_COLOR_SWATCHES: Record<string, { label: string; bg: string }> = {
  W: { label: "White", bg: "#F9FAF4" },
  U: { label: "Blue", bg: "#0E68AB" },
  B: { label: "Black", bg: "#150B00" },
  R: { label: "Red", bg: "#D3202A" },
  G: { label: "Green", bg: "#00733E" },
  C: { label: "Colorless", bg: "#94979A" },
};
