import { ADAPTERS_BY_GAME_KEY } from "./resolve";

export function storedCollectorNumber(
  gameKey: string,
  lang: string,
  cardId: string,
  data: unknown,
): string | null {
  const adapter = ADAPTERS_BY_GAME_KEY[gameKey];
  if (!adapter) return null;
  try {
    const number = adapter.normalizeStored(data, cardId, lang)?.collectorNumber;
    return number ? number.trim() || null : null;
  } catch {
    return null;
  }
}
