import {
  GAME_ABBREVIATION_FALLBACK_LENGTH,
  GAME_ABBREVIATIONS,
} from "./constants/game-abbreviation.constant";

export function gameAbbreviation(gameKey: string): string {
  return (
    GAME_ABBREVIATIONS[gameKey] ??
    gameKey.slice(0, GAME_ABBREVIATION_FALLBACK_LENGTH).toUpperCase()
  );
}
