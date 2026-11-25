import {
  buildScanSaveRequest,
  type BinConfig,
  type BinSet,
  type Collection,
  type PickList,
  type PickListFoundInput,
  type PiScanPendingSave,
  type PiScanSessionStartCode,
  type ScannedCard,
} from "@magic-vault/shared";
import { PI_SCAN_SESSION_START_CODES } from "../constants/pi-scan";
import { SCAN_HOST_PATH } from "../constants/scan-host";
import type { CardMatchSearchResult, CardTextMatchResult } from "../interfaces/card-search";
import type { PiScanApiMethod, PiScanApiResponse } from "../interfaces/pi-scan-api";
import type {
  PiScanRunContext,
  PiScanSaveOptions,
  PiScanSaveResult,
  SendPendingPiScanSave,
} from "../interfaces/pi-scan";
import type {
  ScanHostApplyTargetRequest,
  ScanHostContextPayload,
  ScanHostMatchRequest,
  ScanHostOcrRequest,
} from "../interfaces/scan-host";
import type { ServerScanActor } from "../interfaces/scan-actor";
import { piScanApi } from "./api";
import { contextFromScanHostPayload } from "./context-payload";
import { PiScanActionError, PiScanStartError } from "./errors";
import { recoverPiScanSaves, submitPiScanSave } from "./pending-saves";

export { PiScanActionError };

function isPiScanSessionStartCode(code: unknown): code is PiScanSessionStartCode {
  return typeof code === "string" && (PI_SCAN_SESSION_START_CODES as readonly string[]).includes(code);
}

async function callJson<T = unknown>(
  actor: ServerScanActor,
  method: PiScanApiMethod,
  path: string,
  body?: unknown,
) {
  return (await piScanApi()).request<T>(actor, method, path, body);
}

async function requireData<T>(
  actor: ServerScanActor,
  path: string,
  body: unknown,
  fallbackMessage: string,
): Promise<T> {
  const result = await callJson<T>(actor, "POST", `${SCAN_HOST_PATH}${path}`, body);
  if (!result.ok)
    throw new PiScanActionError(result.body.message ?? fallbackMessage, result.status);
  return result.body.data as T;
}

function scanSaveSender(): SendPendingPiScanSave {
  return async (save, isRetry) => {
    const result = await callJson(
      { userId: save.userId, orgId: save.orgId },
      "POST",
      `/collections/${save.collectionGuid}/${save.kind}`,
      buildScanSaveRequest(save.body, { isRetry }),
    );
    return {
      success: result.ok,
      message: result.body.message ?? "The card could not be saved.",
      status: result.status,
    };
  };
}

export async function saveThroughCollectionRoute(
  orgId: string,
  collectionGuid: string,
  kind: "cards" | "unmatched" | "cards/sorted",
  body: { scanId: string; [key: string]: unknown },
  options: PiScanSaveOptions,
): Promise<PiScanSaveResult> {
  if (kind === "cards/sorted") {
    const result = await callJson(
      { userId: options.userId, orgId },
      "POST",
      `/collections/${collectionGuid}/${kind}`,
      buildScanSaveRequest(body),
    );
    return {
      success: result.ok,
      message: result.body.message ?? "The card could not be saved.",
      status: result.status,
    };
  }
  return submitPiScanSave(
    {
      orgId,
      userId: options.userId,
      collectionGuid,
      kind,
      body,
      queuedAt: Date.now(),
    },
    scanSaveSender(),
    options.stopping,
  );
}

export function recoverSessionScanSaves(
  orgId: string,
  options: PiScanSaveOptions,
) {
  return recoverPiScanSaves(
    orgId,
    options.userId,
    scanSaveSender(),
    options.stopping,
  );
}

export async function recordPickFound(
  actor: ServerScanActor,
  binGuid: string,
  input: PickListFoundInput,
): Promise<PickList | null> {
  const result = await callJson<{ pickList?: PickList | null }>(
    actor,
    "POST",
    `/bins/bins/${binGuid}/pick-list/found`,
    {
      name: input.name,
      setCode: input.setCode,
      collectorNumber: input.collectorNumber,
      isFoil: input.isFoil,
      delta: input.delta,
    },
  );
  return result.ok ? (result.body.data?.pickList ?? null) : null;
}

export async function saveBinThroughRoute(
  actor: ServerScanActor,
  gameGuid: string,
  bin: BinConfig,
): Promise<boolean> {
  const params = gameGuid ? `?${new URLSearchParams({ gameGuid })}` : "";
  const result = await callJson(actor, "PUT", `/bins/bins/${bin.binNumber}${params}`, {
    rules: bin.rules,
    isCatchAll: bin.isCatchAll,
    isOverride: bin.isOverride,
    overridePriority: bin.overridePriority,
    lowMatchPercent: bin.lowMatchPercent,
    maxCopies: bin.maxCopies,
    maxCopiesBy: bin.maxCopiesBy,
    maxCards: bin.maxCards,
    overflowBin: bin.overflowBin,
    isDisabled: bin.isDisabled,
    pickList: bin.pickList,
    repackPriority: bin.repackPriority,
  });
  return result.ok;
}

export async function loadRemovalCopiesThroughRoute(
  actor: ServerScanActor,
  collectionGuid: string,
  cardIds: string[],
): Promise<ScannedCard[]> {
  const query = new URLSearchParams({ cardIds: cardIds.join(",") });
  const result = await callJson<ScannedCard[]>(
    actor,
    "GET",
    `/collections/${collectionGuid}/cards/copies?${query}`,
  );
  if (!result.ok)
    throw new PiScanActionError(
      result.body.message ?? "Removal lookup failed.",
      result.status,
    );
  return result.body.data ?? [];
}

export async function removeQueuedCardsThroughRoute(
  actor: ServerScanActor,
  collectionGuid: string,
  scanIds: string[],
): Promise<boolean> {
  return (
    await callJson(actor, "POST", `/collections/${collectionGuid}/cards/remove-bulk`, { scanIds })
  ).ok;
}

function contextOrStartError(
  result: PiScanApiResponse<ScanHostContextPayload>,
): PiScanRunContext {
  if (result.ok && result.body.data) return contextFromScanHostPayload(result.body.data);
  const message = result.body.message ?? "The scan could not be prepared.";
  if (result.status === 400 || result.status === 404)
    throw new PiScanStartError(message, isPiScanSessionStartCode(result.body.code) ? result.body.code : "invalid", 400);
  throw new PiScanActionError(message, result.status);
}

export async function loadScanContextThroughRoute(
  actor: ServerScanActor,
  collectionGuid: string,
  hardwareId: string,
): Promise<PiScanRunContext> {
  return contextOrStartError(
    await callJson<ScanHostContextPayload>(actor, "POST", `${SCAN_HOST_PATH}/context`, {
      collectionGuid,
      hardwareId,
    }),
  );
}

export async function applyScanTargetThroughRoute(
  actor: ServerScanActor,
  request: ScanHostApplyTargetRequest,
): Promise<PiScanRunContext> {
  return contextOrStartError(
    await callJson<ScanHostContextPayload>(actor, "POST", `${SCAN_HOST_PATH}/apply-target`, request),
  );
}

export function matchThroughRoute(
  actor: ServerScanActor,
  request: ScanHostMatchRequest,
): Promise<CardMatchSearchResult> {
  return requireData(actor, "/match", request, "The card search failed.");
}

export function readTextThroughRoute(
  actor: ServerScanActor,
  request: ScanHostOcrRequest,
): Promise<CardTextMatchResult | null> {
  return requireData(actor, "/ocr", request, "The text search failed.");
}

export function loadControlTargetsThroughRoute(
  actor: ServerScanActor,
): Promise<{ collections: Collection[]; presets: BinSet[] }> {
  return requireData(actor, "/targets", {}, "The scan targets could not be loaded.");
}

export async function lockCollectionThroughRoute(
  actor: ServerScanActor,
  collectionGuid: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const result = await callJson(actor, "POST", `${SCAN_HOST_PATH}/lock`, { collectionGuid });
  if (result.ok) return { ok: true };
  if ([401, 402, 403].includes(result.status))
    throw new PiScanActionError(result.body.message ?? "Not allowed.", result.status);
  return { ok: false, message: result.body.message ?? "The collection could not be locked." };
}

export async function unlockCollectionThroughRoute(
  actor: ServerScanActor,
  collectionGuid: string,
): Promise<void> {
  try {
    await callJson(actor, "POST", `${SCAN_HOST_PATH}/unlock`, { collectionGuid });
  } catch (error) {
    console.error("[pi-scan] could not release the collection lock:", error);
  }
}

export async function publishPendingSaveThroughRoute(
  actor: ServerScanActor,
  pendingSave: PiScanPendingSave,
): Promise<void> {
  await callJson(actor, "POST", `${SCAN_HOST_PATH}/pending-save`, pendingSave);
}

export async function revealGiftThroughRoute(
  actor: ServerScanActor,
  collectionGuid: string,
  record: ScannedCard,
): Promise<void> {
  await callJson(actor, "POST", `${SCAN_HOST_PATH}/gift-reveal`, { collectionGuid, record });
}
