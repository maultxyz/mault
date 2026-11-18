import { DEFAULT_CARD_CONDITION, formatStorageSlot, type ScannedCard } from "@magic-vault/shared";
import type { TFunction } from "i18next";

export function describeRemovalCopy(copy: ScannedCard, t: TFunction): string {
  const foilLabel = copy.foilType ?? (copy.isFoil ? t("cardDetail.foil") : t("cardDetail.foilNone"));
  const conditionLabel = t(`cardDetail.conditions.${copy.condition ?? DEFAULT_CARD_CONDITION}`);
  const storageLabel = copy.storageLocation
    ? t("storage.storedIn", {
        name: copy.storageLocation.name,
        position: formatStorageSlot(copy.storageLocation.position, copy.storageLocation.batchSize),
      })
    : t("scan.removal.unsorted");
  return [foilLabel, conditionLabel, storageLabel].join(" · ");
}
