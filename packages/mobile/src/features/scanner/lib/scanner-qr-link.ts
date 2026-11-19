import { parseOrderPickUrl, parseShareLinkUrl, parseShortLinkUrl, parseStorageLabelUrl } from "@magic-vault/shared";
import { parsePairingLink } from "@/features/scanner/api/phone-camera";
import { shortLinkBaseUrl } from "@/lib/short-link-base-url";
import type { ScannerQrLink } from "@/lib/interfaces/scanner";

export function parseScannerQrLink(text: string): ScannerQrLink | null {
  const storageLabel = parseStorageLabelUrl(text);
  if (storageLabel) return { kind: "storage-label", storageLabel };
  const orderPick = parseOrderPickUrl(text);
  if (orderPick) return { kind: "order-pick", orderPick };
  const shareLink = parseShareLinkUrl(text);
  if (shareLink) return { kind: "share-link", shareLink };
  const shortCode = parseShortLinkUrl(text, shortLinkBaseUrl());
  if (shortCode) return { kind: "short-link", shortCode };
  const desktopCameraCollectionGuid = parsePairingLink(text);
  if (desktopCameraCollectionGuid) return { kind: "desktop-camera", collectionGuid: desktopCameraCollectionGuid };
  return null;
}
