import { useEffect, useId, useSyncExternalStore } from "react";
import type { SeasonalDecorPreference, SeasonalTheme } from "@/lib/interfaces/seasonal";
import { seasonalThemeOf } from "@/lib/seasonal";
import {
  currentSeasonalDecorPreference,
  saveSeasonalDecorPreference,
  subscribeToSeasonalDecorPreference,
} from "@/lib/seasonal-decor-preference";
import {
  registerSeasonalDecorInstance,
  subscribeToSeasonalDecorInstances,
  topmostSeasonalDecorId,
} from "@/lib/seasonal-decor-instances";

function serverSeasonalDecorPreference(): SeasonalDecorPreference {
  return "off";
}

export function useSeasonalDecorPreference() {
  const preference = useSyncExternalStore(
    subscribeToSeasonalDecorPreference,
    currentSeasonalDecorPreference,
    serverSeasonalDecorPreference,
  );
  return {
    preference,
    setPreference: saveSeasonalDecorPreference,
  };
}

export function useSeasonalTheme(): SeasonalTheme | null {
  const { preference } = useSeasonalDecorPreference();
  if (preference === "off") return null;
  if (preference === "auto") return seasonalThemeOf();
  return preference;
}

function serverTopmostSeasonalDecorId(): string | null {
  return null;
}

export function useIsTopmostSeasonalDecor(): boolean {
  const decorId = useId();
  useEffect(() => registerSeasonalDecorInstance(decorId), [decorId]);
  const topmostDecorId = useSyncExternalStore(
    subscribeToSeasonalDecorInstances,
    topmostSeasonalDecorId,
    serverTopmostSeasonalDecorId,
  );
  return topmostDecorId === decorId;
}
