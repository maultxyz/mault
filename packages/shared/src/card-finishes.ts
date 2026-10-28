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
