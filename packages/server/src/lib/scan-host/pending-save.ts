import type { PiScanPendingSave } from "@magic-vault/shared";
import { PI_SCAN_PENDING_SAVE_STATUSES, PI_SCAN_PENDING_SAVE_TEXT_MAX_LENGTH } from "../constants/scan-host";

function text(value: unknown): string | null {
  return typeof value === "string" && value.length <= PI_SCAN_PENDING_SAVE_TEXT_MAX_LENGTH ? value : null;
}

export function toPendingSaveEvent(body: unknown, orgId: string): PiScanPendingSave | null {
  const save = body as Partial<PiScanPendingSave> | null;
  const card = save?.card as Partial<PiScanPendingSave["card"]> | undefined;
  const collectionGuid = text(save?.collectionGuid);
  const scanId = text(save?.scanId);
  const cardId = text(card?.id);
  const name = text(card?.name);
  const set = text(card?.set);
  const collectorNumber = text(card?.collectorNumber);
  if (
    !save ||
    typeof save.updatedAt !== "number" ||
    !PI_SCAN_PENDING_SAVE_STATUSES.includes(save.status!) ||
    collectionGuid === null ||
    scanId === null ||
    cardId === null ||
    name === null ||
    set === null ||
    collectorNumber === null
  )
    return null;
  return {
    updatedAt: save.updatedAt,
    orgId,
    collectionGuid,
    scanId,
    status: save.status!,
    card: { id: cardId, name, set, collectorNumber },
  };
}
