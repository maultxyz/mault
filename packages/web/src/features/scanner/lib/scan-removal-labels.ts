import { DEFAULT_CARD_CONDITION, type ScannedCard } from "@magic-vault/shared";
import type { TFunction } from "i18next";

export function describeRemovalCopy(
  copy: ScannedCard,
  t: TFunction<"scanner">,
): string {
  const finish = copy.isFoil
    ? (copy.foilType ?? t("scanRemoval.foil"))
    : t("scanRemoval.nonFoil");
  const place = copy.storageLocation
    ? t("scanRemoval.storage", {
        name: copy.storageLocation.name,
        position: copy.storageLocation.position,
      })
    : copy.binNumber != null
      ? t("scanRemoval.bin", { number: copy.binNumber })
      : t("scanRemoval.unsorted");
  return [finish, copy.condition ?? DEFAULT_CARD_CONDITION, place].join(" · ");
}
