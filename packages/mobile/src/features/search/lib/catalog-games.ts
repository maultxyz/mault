import type { Collection } from "@magic-vault/shared";
import type { CatalogGame } from "@/lib/interfaces/search";

export function catalogGamesOf(collections: Collection[], preferredCollectionGuid?: string): CatalogGame[] {
  const ordered = [...collections].sort((a, b) =>
    a.guid === preferredCollectionGuid ? -1 : b.guid === preferredCollectionGuid ? 1 : 0,
  );
  const byGameKey = new Map<string, CatalogGame>();
  for (const collection of ordered) {
    const game = collection.game;
    if (!game || byGameKey.has(game.key)) continue;
    byGameKey.set(game.key, {
      gameKey: game.key,
      gameName: game.name,
      lang: collection.lang || "en",
      collectionGuid: collection.guid,
    });
  }
  return [...byGameKey.values()];
}
