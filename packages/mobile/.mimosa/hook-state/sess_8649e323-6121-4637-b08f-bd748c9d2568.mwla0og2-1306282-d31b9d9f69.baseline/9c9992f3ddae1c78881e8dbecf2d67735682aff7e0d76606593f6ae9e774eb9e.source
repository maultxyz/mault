import { Appearance } from "react-native";
import { THEME_PREFERENCE_KEY } from "@/lib/constants/storage-keys";
import { THEME_PREFERENCES } from "@/lib/constants/ui";
import type { ThemePreference } from "@/lib/interfaces/theme";
import { readKv, writeKv } from "@/lib/storage/kv";

export function readThemePreference(): ThemePreference {
  const stored = readKv(THEME_PREFERENCE_KEY);
  return THEME_PREFERENCES.find((value) => value === stored) ?? "system";
}

export function applyThemePreference(preference: ThemePreference): void {
  Appearance.setColorScheme(preference === "system" ? "auto" : preference);
}

export function saveThemePreference(preference: ThemePreference): void {
  writeKv(THEME_PREFERENCE_KEY, preference === "system" ? null : preference);
  applyThemePreference(preference);
}
