import { parseShareLinkUrl } from "@magic-vault/shared";
import { parsePairingLink } from "@/features/scanner/api/phone-camera";
import type { ScannerQrLink } from "@/lib/interfaces/scanner";

export function parseScannerQrLink(text: string): ScannerQrLink | null {
  const shareLink = parseShareLinkUrl(text);
  if (shareLink) return { kind: "share-link", shareLink };
  const desktopCameraCollectionGuid = parsePairingLink(text);
  if (desktopCameraCollectionGuid) return { kind: "desktop-camera", collectionGuid: desktopCameraCollectionGuid };
  return null;
}
