import {
  FINISH_MATCH_MIN_MARGIN,
  FINISH_PATTERN_SUFFIX_PATTERN,
} from "./constants/card-finish.constant";
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
  if (options.length === 1) return options[0];
  const ranked = (card.finishMatches ?? [])
    .filter((match) => options.includes(match.foilType))
    .sort((a, b) => a.distance - b.distance);
  const [best, runnerUp] = ranked;
  if (!best || !runnerUp) return sessionFoilType;
  return runnerUp.distance - best.distance >= FINISH_MATCH_MIN_MARGIN
    ? best.foilType
    : sessionFoilType;
}
