import { isCardCondition } from "./card-condition";
import { DEFAULT_CARD_CONDITION } from "./constants/card-condition.constant";
import { DEFAULT_PERSISTED_SCAN_SETTINGS } from "./constants/scan-settings.constant";
import type {
  PersistedScanSettings,
  ScanSettingsGame,
} from "./interfaces/scan-settings.interface";

export function parsePersistedScanSettings(
  stored: string | null,
): PersistedScanSettings {
  if (!stored) return DEFAULT_PERSISTED_SCAN_SETTINGS;
  let parsed: unknown;
  try {
    parsed = JSON.parse(stored);
  } catch {
    return DEFAULT_PERSISTED_SCAN_SETTINGS;
  }
  if (!parsed || typeof parsed !== "object") {
    return DEFAULT_PERSISTED_SCAN_SETTINGS;
  }
  const value = parsed as Record<string, unknown>;
  return {
    foilType:
      typeof value.foilType === "string" && value.foilType.length > 0
        ? value.foilType
        : null,
    preferredSetCodes: Array.isArray(value.preferredSetCodes)
      ? value.preferredSetCodes.filter(
          (code): code is string => typeof code === "string" && code.length > 0,
        )
      : [],
    condition: isCardCondition(value.condition)
      ? value.condition
      : DEFAULT_CARD_CONDITION,
    gameKey: typeof value.gameKey === "string" ? value.gameKey : null,
  };
}

export function hasNonDefaultScanSettings(
  settings: Pick<
    PersistedScanSettings,
    "foilType" | "preferredSetCodes" | "condition"
  >,
): boolean {
  return (
    settings.foilType !== null ||
    settings.preferredSetCodes.length > 0 ||
    settings.condition !== DEFAULT_CARD_CONDITION
  );
}

export function serializePersistedScanSettings(
  settings: PersistedScanSettings,
): string | null {
  return hasNonDefaultScanSettings(settings) ? JSON.stringify(settings) : null;
}

export function scanSettingsForGame(
  settings: PersistedScanSettings,
  game: ScanSettingsGame | null | undefined,
): PersistedScanSettings {
  if (!game) return settings;
  if (settings.gameKey === null || settings.gameKey === game.key) {
    return settings.gameKey === game.key
      ? settings
      : { ...settings, gameKey: game.key };
  }
  const keepsFoilType =
    settings.foilType === null ||
    game.foilTypes.length === 0 ||
    game.foilTypes.includes(settings.foilType);
  return {
    ...settings,
    foilType: keepsFoilType ? settings.foilType : null,
    preferredSetCodes: [],
    gameKey: game.key,
  };
}
