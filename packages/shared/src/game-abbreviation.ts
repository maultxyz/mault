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

export function collectionGameLabel(collection: {
  game?: { key: string } | null;
  lang: string;
}): string {
  const lang = collection.lang.toUpperCase();
  return collection.game ? `${gameAbbreviation(collection.game.key)} · ${lang}` : lang;
}
