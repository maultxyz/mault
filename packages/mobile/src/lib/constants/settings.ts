import type { SettingsSectionLink, ThemeColorOption } from "@/lib/interfaces/settings";

export const THEME_COLORS: ThemeColorOption[] = [
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

export const SETTINGS_SECTION_LINKS: SettingsSectionLink[] = [
  { path: "/settings/general", key: "general", icon: "adjust" },
  { path: "/settings/scanning", key: "scanning", icon: "scan" },
  { path: "/settings/pricing", key: "pricing", icon: "stats" },
  { path: "/settings/organization", key: "organization", icon: "account" },
  { path: "/settings/billing", key: "billing", icon: "check" },
  { path: "/settings/sounds", key: "sounds", icon: "music" },
  { path: "/settings/notifications", key: "notifications", icon: "bell" },
  { path: "/settings/integrations", key: "integrations", icon: "connection" },
  { path: "/settings/webhooks", key: "webhooks", icon: "external" },
];
