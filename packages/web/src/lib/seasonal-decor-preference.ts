import {
  DEFAULT_SEASONAL_DECOR_PREFERENCE,
  SEASONAL_DECOR_PREFERENCES,
  SEASONAL_DECOR_STORAGE_KEY,
} from "@/lib/constants/seasonal";
import type { SeasonalDecorPreference } from "@/lib/interfaces/seasonal";

const preferenceListeners = new Set<() => void>();
let preferenceSetThisPage: SeasonalDecorPreference | null = null;

function isSeasonalDecorPreference(value: unknown): value is SeasonalDecorPreference {
  return SEASONAL_DECOR_PREFERENCES.includes(value as SeasonalDecorPreference);
}

function readStoredSeasonalDecorPreference(): SeasonalDecorPreference {
  try {
    const stored = window.localStorage.getItem(SEASONAL_DECOR_STORAGE_KEY);
    return isSeasonalDecorPreference(stored) ? stored : DEFAULT_SEASONAL_DECOR_PREFERENCE;
  } catch {
    return DEFAULT_SEASONAL_DECOR_PREFERENCE;
  }
}

export function currentSeasonalDecorPreference(): SeasonalDecorPreference {
  return preferenceSetThisPage ?? readStoredSeasonalDecorPreference();
}

function storeSeasonalDecorPreference(preference: SeasonalDecorPreference): boolean {
  try {
    window.localStorage.setItem(SEASONAL_DECOR_STORAGE_KEY, preference);
    return true;
  } catch {
    return false;
  }
}

export function saveSeasonalDecorPreference(preference: SeasonalDecorPreference): void {
  preferenceSetThisPage = preference;
  storeSeasonalDecorPreference(preference);
  preferenceListeners.forEach((listener) => listener());
}

export function subscribeToSeasonalDecorPreference(listener: () => void): () => void {
  const handleStorageChange = (event: StorageEvent) => {
    if (event.key !== SEASONAL_DECOR_STORAGE_KEY) return;
    preferenceSetThisPage = null;
    listener();
  };
  preferenceListeners.add(listener);
  window.addEventListener("storage", handleStorageChange);
  return () => {
    preferenceListeners.delete(listener);
    window.removeEventListener("storage", handleStorageChange);
  };
}
