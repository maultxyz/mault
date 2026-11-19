import { useState } from "react";
import { readThemePreference, saveThemePreference } from "@/lib/appearance";
import type { ThemePreference } from "@/lib/interfaces/theme";

export function useThemePreference(): [ThemePreference, (preference: ThemePreference) => void] {
  const [preference, setPreference] = useState<ThemePreference>(readThemePreference);
  const update = (next: ThemePreference) => {
    setPreference(next);
    saveThemePreference(next);
  };
  return [preference, update];
}
