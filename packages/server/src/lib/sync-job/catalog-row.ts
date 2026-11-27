import { createHash } from "node:crypto";
import { catalogColumnsFor } from "../card-catalog";
import { storedCollectorNumber } from "../card-search/collector-number";
import type { SyncSource } from "../interfaces/card-search";
import type {
  CatalogCardRow,
  CatalogCardRowInput,
} from "../interfaces/sync-job";

export function buildCatalogCardRow({
  gameKey,
  lang,
  cardId,
  name,
  setCode,
  data,
}: CatalogCardRowInput): CatalogCardRow {
  return {
    cardId,
    gameKey,
    lang,
    name,
    setCode,
    collectorNumber: storedCollectorNumber(gameKey, lang, cardId, data),
    data,
    ...catalogColumnsFor(gameKey, lang, cardId, data),
  };
}

function withoutKeys(data: unknown, keys: readonly string[]): unknown {
  if (keys.length === 0 || !data || typeof data !== "object") return data;
  if (Array.isArray(data)) return data;
  const kept: Record<string, unknown> = { ...data };
  for (const key of keys) delete kept[key];
  return kept;
}

export function sourceDataHashOf(
  row: CatalogCardRow,
  { volatileDataKeys = [], withoutVolatileData }: Pick<SyncSource, "volatileDataKeys" | "withoutVolatileData">,
): string {
  const stableData = withoutVolatileData ? withoutVolatileData(row.data) : row.data;
  return createHash("sha256")
    .update(
      JSON.stringify([
        row.name,
        row.setCode,
        row.collectorNumber,
        row.setName,
        row.rarity,
        row.colorIdentity,
        row.searchText,
        row.imageSmall,
        withoutKeys(stableData, volatileDataKeys),
      ]),
    )
    .digest("hex");
}
