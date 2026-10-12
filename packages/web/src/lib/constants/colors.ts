import type { CalloutVariant } from "@/lib/interfaces/callout";
import type { AnnouncementSeverity, SyncState } from "@magic-vault/shared";
import type { ThemeColor } from "@/lib/interfaces/colors";

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
  info: "border-info-border bg-info-muted text-info-foreground",
  warning: "border-warning-border bg-warning-muted text-warning-foreground",
  danger: "border-destructive-border bg-destructive-muted text-destructive",
};

export const ALERT_SEVERITY_ICON_CLASS: Record<AnnouncementSeverity, string> = {
  info: "text-info-foreground",
  warning: "text-warning-foreground",
  danger: "text-destructive",
};

export const ALERT_BANNER_ACTION_CLASS =
  "shrink-0 border-warning-border bg-transparent text-warning-foreground hover:bg-warning-border/40";

export const CALLOUT_VARIANT_CLASS: Record<CalloutVariant, string> = {
  neutral: "border-border bg-muted text-foreground/70",
  info: "border-info-border bg-info-muted text-info-foreground",
  success: "border-success-border bg-success-muted text-success-foreground",
  warning: "border-warning-border bg-warning-muted text-warning-foreground",
  error: "border-destructive-border bg-destructive-muted text-destructive",
};

export const CALLOUT_ICON_CLASS: Record<CalloutVariant, string> = {
  neutral: "text-foreground/70",
  info: "text-info-foreground",
  success: "text-success-foreground",
  warning: "text-warning-foreground",
  error: "text-destructive",
};

export const CARD_COLOR_ACTIVE_CLASS: Record<string, string> = {
  W: "bg-amber-100 text-amber-900 border-amber-400",
  U: "bg-blue-700 text-white border-blue-800",
  B: "bg-neutral-900 text-white border-neutral-700",
  R: "bg-red-700 text-white border-red-800",
  G: "bg-green-700 text-white border-green-800",
  C: "bg-gray-600 text-white border-gray-700",
};

export const SWATCH_FALLBACK_PALETTE = [
  "#0EA5E9",
  "#F97316",
  "#10B981",
  "#8B5CF6",
  "#EF4444",
  "#EAB308",
  "#EC4899",
  "#14B8A6",
  "#6366F1",
  "#84CC16",
  "#A16207",
  "#64748B",
];

export const CARD_COLOR_NAME_SWATCHES: Record<string, string> = {
  white: "#F9FAF4",
  blue: "#0E68AB",
  black: "#150B00",
  red: "#D3202A",
  green: "#00733E",
  colorless: "#94979A",
  yellow: "#EAB308",
  purple: "#7E22CE",
  orange: "#EA7A1E",
  pink: "#EC4899",
  brown: "#8D6E63",
  gray: "#94979A",
  grey: "#94979A",
  gold: "#C9A227",
  silver: "#B8BEC6",
  multicolor: "#C9A227",
  grass: "#3FA129",
  fire: "#E4572E",
  water: "#2980EF",
  lightning: "#FAC000",
  psychic: "#9B4FB4",
  fighting: "#C0612B",
  darkness: "#2F3A40",
  metal: "#8E9AA6",
  dragon: "#B8A038",
  fairy: "#EF70EF",
  amber: "#F4B223",
  amethyst: "#7C4182",
  emerald: "#2A8934",
  ruby: "#D3082F",
  sapphire: "#0094CF",
  steel: "#9FA8B3",
  vigilance: "#2E6FB5",
  command: "#3E8E41",
  aggression: "#C62828",
  cunning: "#E8B923",
  heroism: "#E9E4D4",
  villainy: "#1B1B1B",
  fury: "#D23A2B",
  calm: "#3D9E5A",
  mind: "#2E6DB4",
  body: "#E07B1E",
  chaos: "#7A3FA0",
  order: "#E8C547",
  wind: "#4CAF50",
  norm: "#B0B0B0",
  arcane: "#6A4C93",
  astra: "#F2C14E",
  umbra: "#3B3355",
  crux: "#B03A2E",
  exia: "#E9E9F0",
  luxem: "#F7D774",
  neos: "#48C9B0",
  tera: "#8D6E63",
  dark: "#4B2E83",
  light: "#F4E285",
  earth: "#8B6B3E",
  divine: "#C9A227",
};

export const CARD_COLOR_SWATCHES: Record<string, { label: string; bg: string }> = {
  W: { label: "White", bg: "#F9FAF4" },
  U: { label: "Blue", bg: "#0E68AB" },
  B: { label: "Black", bg: "#150B00" },
  R: { label: "Red", bg: "#D3202A" },
  G: { label: "Green", bg: "#00733E" },
  C: { label: "Colorless", bg: "#94979A" },
};
