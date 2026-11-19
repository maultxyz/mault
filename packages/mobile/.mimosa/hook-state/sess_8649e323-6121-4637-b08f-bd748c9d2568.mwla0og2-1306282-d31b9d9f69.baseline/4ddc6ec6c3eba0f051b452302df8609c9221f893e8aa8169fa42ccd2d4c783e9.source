import { useState } from "react";
import { readLanguagePreference, saveLanguagePreference } from "@/lib/i18n";
import type { LanguagePreference } from "@/lib/interfaces/i18n";

export function useLanguagePreference(): [LanguagePreference, (preference: LanguagePreference) => void] {
  const [preference, setPreference] = useState<LanguagePreference>(readLanguagePreference);
  const update = (next: LanguagePreference) => {
    setPreference(next);
    saveLanguagePreference(next);
  };
  return [preference, update];
}
