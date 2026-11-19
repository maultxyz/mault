import type { StorageLocation } from "@magic-vault/shared";
import type { TFunction } from "i18next";

export function storageLocationFillText(
  location: Pick<StorageLocation, "capacity" | "usedSlots">,
  t: TFunction<"storage">,
): string | null {
  if (location.capacity == null) return null;
  return t("sizes.fill", {
    used: location.usedSlots ?? 0,
    capacity: location.capacity,
  });
}
