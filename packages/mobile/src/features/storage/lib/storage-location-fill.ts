import type { TFunction } from "i18next";
import type { StorageLocation } from "@magic-vault/shared";

export function storageLocationFillLabel(
  location: Pick<StorageLocation, "cardCount" | "capacity" | "usedSlots">,
  t: TFunction,
  planCount = 0,
): string {
  const cards = t("collection.cardsCount", { count: location.cardCount });
  const fill =
    location.capacity != null
      ? t("storage.fillOfCapacity", { cards, used: location.usedSlots ?? 0, capacity: location.capacity })
      : cards;
  return planCount > 0 ? `${fill} · ${t("storage.inPlans", { count: planCount })}` : fill;
}
