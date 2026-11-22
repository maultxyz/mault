import { MOBILE_SCAN_PATH } from "@/lib/constants/nav";
import { SCANNER_PATH } from "@/lib/constants/scanner";
import { trimTrailingSlashes } from "@/lib/pathname";

export function isScannerPagePath(pathname: string): boolean {
  const trimmed = trimTrailingSlashes(pathname);
  return (
    trimmed === SCANNER_PATH ||
    trimmed.startsWith(`${SCANNER_PATH}/cards/`) ||
    trimmed === MOBILE_SCAN_PATH
  );
}
