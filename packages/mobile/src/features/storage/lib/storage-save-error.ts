import { STORAGE_LOCATION_NAME_TAKEN_MESSAGE } from "@magic-vault/shared";
import type { TFunction } from "i18next";

export function storageSaveErrorMessage(error: unknown, t: TFunction): string {
  if (error instanceof Error && error.message === STORAGE_LOCATION_NAME_TAKEN_MESSAGE) return t("storage.nameTaken");
  return t("storage.saveFailed");
}
