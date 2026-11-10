import {
  buildScanSaveRequest,
  type BinConfig,
  type PickList,
} from "@magic-vault/shared";
import type { Hono } from "hono";
import { collectionsRouter } from "../../routes/collections";
import { sortBinsRouter } from "../../routes/bins";
import type { AppEnv } from "../../middleware/auth";
import { SERVER_SCAN_ACTOR } from "../constants/scan-actor";
import type { ServerScanActor } from "../interfaces/scan-actor";
import type {
  PiScanRouteJson,
  PiScanSaveOptions,
  PiScanSaveResult,
  SendPendingPiScanSave,
} from "../interfaces/pi-scan";
import { recoverPiScanSaves, submitPiScanSave } from "./pending-saves";

async function callJson(
  router: Hono<AppEnv>,
  path: string,
  method: "POST" | "PUT",
  actor: ServerScanActor,
  body: unknown,
): Promise<{ ok: boolean; body: PiScanRouteJson; status: number }> {
  const response = await router.request(
    path,
    {
      method,
      headers: { "X-Org-Id": actor.orgId, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
    { [SERVER_SCAN_ACTOR]: actor },
  );
  const payload = (await response
    .json()
    .catch(() => ({ success: false }))) as PiScanRouteJson;
  return {
    ok: response.ok && payload.success !== false,
    body: payload,
    status: response.status,
  };
}

function scanSaveSender(): SendPendingPiScanSave {
  return async (save, isRetry) => {
    const result = await callJson(
      collectionsRouter,
      `/${save.collectionGuid}/${save.kind}`,
      "POST",
      { userId: save.userId, orgId: save.orgId },
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
      collectionsRouter,
      `/${collectionGuid}/${kind}`,
      "POST",
      { userId: options.userId, orgId },
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
  name: string,
): Promise<PickList | null> {
  const result = await callJson(
    sortBinsRouter,
    `/bins/${binGuid}/pick-list/found`,
    "POST",
    actor,
    { name, delta: 1 },
  );
  return result.ok ? (result.body.data?.pickList ?? null) : null;
}

export async function saveBinThroughRoute(
  actor: ServerScanActor,
  gameGuid: string,
  bin: BinConfig,
): Promise<boolean> {
  const params = gameGuid ? `?${new URLSearchParams({ gameGuid })}` : "";
  const result = await callJson(
    sortBinsRouter,
    `/bins/${bin.binNumber}${params}`,
    "PUT",
    actor,
    {
      rules: bin.rules,
      isCatchAll: bin.isCatchAll,
      isOverride: bin.isOverride,
      overridePriority: bin.overridePriority,
      lowMatchPercent: bin.lowMatchPercent,
      maxCopies: bin.maxCopies,
      maxCopiesBy: bin.maxCopiesBy,
      overflowBin: bin.overflowBin,
      isDisabled: bin.isDisabled,
      pickList: bin.pickList,
      repackPriority: bin.repackPriority,
    },
  );
  return result.ok;
}
