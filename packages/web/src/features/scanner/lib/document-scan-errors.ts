import type {
  DesktopDocumentScanDriver,
  DesktopDocumentScanErrorReason,
} from "@magic-vault/shared";
import type { TFunction } from "i18next";

export function documentScanErrorMessage(
  t: TFunction<"cards">,
  reason: DesktopDocumentScanErrorReason,
  driver: DesktopDocumentScanDriver | null,
) {
  if (reason === "scanner_offline" && driver === "twain") {
    return t("importScans.documentScan.errors.scanner_offline_twain");
  }
  return t(`importScans.documentScan.errors.${reason}`);
}
