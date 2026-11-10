import { buildScanSaveRequest, type BinConfig, type PickList } from "@magic-vault/shared";
import type { Hono } from "hono";
import { collectionsRouter } from "../../routes/collections";
import { sortBinsRouter } from "../../routes/bins";
import type { AppEnv } from "../../middleware/auth";
import { SERVER_SCAN_ACTOR } from "../constants/scan-actor";
import type { ServerScanActor } from "../interfaces/scan-actor";
import type { PiScanRouteJson } from "../interfaces/pi-scan";

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
  const payload = (await response.json()) as PiScanRouteJson;
  return {
    ok: response.ok && payload.success !== false,
    body: payload,
    status: response.status,
  };
}

export async function saveThroughCollectionRoute(
  actor: ServerScanActor,
  collectionGuid: string,
  kind: "cards" | "unmatched" | "cards/sorted",
  body: { scanId: string; [key: string]: unknown },
): Promise<{ success: boolean; message: string }> {
  const result = await callJson(
    collectionsRouter,
    `/${collectionGuid}/${kind}`,
    "POST",
    actor,
    buildScanSaveRequest(body),
  );
  return {
    success: result.ok,
    message: result.body.message ?? (result.ok ? "" : "The card could not be saved."),
  };
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
