import { FINISH_PATTERN_SUFFIX_PATTERN } from "./constants/card-finish.constant";
import type { PlayingCard } from "./interfaces/card.interface";

export function cardFoilTypeOptions(
  gameFoilTypes: string[],
  card: PlayingCard | null | undefined,
  currentFoilType?: string | null,
): string[] {
  const options = card?.foilTypes?.length ? card.foilTypes : gameFoilTypes;
  return currentFoilType && !options.includes(currentFoilType)
    ? [...options, currentFoilType]
    : options;
}

export function finishFamily(foilType: string): string {
  return foilType.replace(FINISH_PATTERN_SUFFIX_PATTERN, "");
}

export function scanFoilType(
  card: PlayingCard,
  sessionFoilType: string | null,
): string | null {
  if (!sessionFoilType) return sessionFoilType;
  const family = finishFamily(sessionFoilType);
  if (sessionFoilType !== family) return sessionFoilType;
  const options = (card.foilTypes ?? []).filter(
    (foilType) => finishFamily(foilType) === family,
  );
  return options.length === 1 ? options[0] : sessionFoilType;
}
