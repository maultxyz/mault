import { and, eq } from "drizzle-orm";
import { db } from "../db";
import { games, tcgplayerSkus } from "../db/schema";
import { adapterEntriesForGameKeys } from "./card-search/resolve";
import {
  TCGPLAYER_EDITION_VARIANT_PREFIX_PATTERN,
  TCGPLAYER_FOIL_VARIANT_PATTERN,
} from "./constants/tcgtracking";
import type { TcgplayerPricing } from "./interfaces/card-search";

export function tcgplayerFoilTypes(
  tcgplayer: TcgplayerPricing,
  variants: string[],
): string[] {
  const foilTypes = variants
    .filter((variant) => TCGPLAYER_FOIL_VARIANT_PATTERN.test(variant))
    .map((variant) => {
      const variantWithoutEdition = variant.replace(
        TCGPLAYER_EDITION_VARIANT_PREFIX_PATTERN,
        "",
      );
      return (
        tcgplayer.foilTypeOfVariant?.(variantWithoutEdition) ??
        variantWithoutEdition
      );
    });
  return [...new Set(foilTypes)].sort();
}

export async function syncGameFoilTypesFromTcgplayer({
  gameKeys,
  log,
}: {
  gameKeys?: string[];
  log: (msg: string) => void;
}): Promise<void> {
  for (const [gameKey, adapter] of adapterEntriesForGameKeys(gameKeys)) {
    const tcgplayer = adapter.tcgplayer;
    if (!tcgplayer) continue;
    const variantRows = await db
      .selectDistinct({ variant: tcgplayerSkus.variant })
      .from(tcgplayerSkus)
      .where(eq(tcgplayerSkus.categoryId, tcgplayer.categoryId));
    if (variantRows.length === 0) continue;
    const foilTypes = tcgplayerFoilTypes(
      tcgplayer,
      variantRows.map((row) => row.variant),
    );
    const gameRows = await db
      .select({ id: games.id, foilTypes: games.foilTypes })
      .from(games)
      .where(and(eq(games.key, gameKey), eq(games.isDeleted, false)));
    for (const game of gameRows) {
      const currentFoilTypes = (game.foilTypes as string[] | null) ?? [];
      if (JSON.stringify(currentFoilTypes) === JSON.stringify(foilTypes)) continue;
      await db
        .update(games)
        .set({ foilTypes, updatedAt: new Date() })
        .where(eq(games.id, game.id));
      log(`Foil types for ${gameKey}: ${foilTypes.join(", ") || "none"}.`);
    }
  }
}
