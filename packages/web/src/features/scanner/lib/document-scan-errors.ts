import type { DesktopDocumentScanErrorReason } from "@magic-vault/shared";
import type { TFunction } from "i18next";

export function documentScanErrorMessage(
  t: TFunction<"cards">,
  reason: DesktopDocumentScanErrorReason,
) {
  return t(`importScans.documentScan.errors.${reason}`);
}
