import { parseFormValidationMessage } from "@magic-vault/shared";
import type { TFunction } from "i18next";

export function translateFormErrorMessage(t: TFunction, message: string | undefined): string | undefined {
  if (!message) return undefined;
  const parsed = parseFormValidationMessage(message);
  return parsed ? t(parsed.translationKey, parsed.values) : message;
}
