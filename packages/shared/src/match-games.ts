import type { BinSet, FieldOption } from "./interfaces/sort-bins.interface";

export function presetMatchGameKeys(binSet: BinSet | null | undefined): string[] {
  return binSet?.matchGameKeys ?? [];
}

export function presetMatchedGameOptions(
  binSet: BinSet | null | undefined,
  games: { key: string; name: string }[],
): FieldOption[] {
  const matchGameKeys = presetMatchGameKeys(binSet);
  if (!binSet?.game || matchGameKeys.length === 0) return [];
  const gameName = (gameKey: string) =>
    games.find((game) => game.key === gameKey)?.name ?? gameKey;
  return [binSet.game.key, ...matchGameKeys].map((gameKey) => ({
    value: gameKey,
    label: gameName(gameKey),
  }));
}

export function isCardFromOtherGame(
  card: { gameKey?: string },
  collectionGameKey: string | null | undefined,
): boolean {
  return !!card.gameKey && !!collectionGameKey && card.gameKey !== collectionGameKey;
}
