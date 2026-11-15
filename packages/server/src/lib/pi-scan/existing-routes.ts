import {
  buildScanSaveRequest,
  type BinConfig,
  type PickList,
  type ScannedCard,
} from "@magic-vault/shared";
import { Hono } from "hono";
import { authQuery, type Transaction } from "../../db";
import { requireAuth, requireOrg } from "../../middleware/auth";
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

export class PiScanActionError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

async function callJson(
  router: Hono<AppEnv>,
  path: string,
  method: "POST" | "PUT" | "GET",
  actor: ServerScanActor,
  body: unknown,
): Promise<{ ok: boolean; body: PiScanRouteJson; status: number }> {
  const response = await router.request(
    path,
    {
      method,
      headers: { "X-Org-Id": actor.orgId, "Content-Type": "application/json" },
      body: method === "GET" ? undefined : JSON.stringify(body),
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
  delta = 1,
): Promise<PickList | null> {
  const result = await callJson(
    sortBinsRouter,
    `/bins/${binGuid}/pick-list/found`,
    "POST",
    actor,
    { name, delta },
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
      maxCards: bin.maxCards,
      overflowBin: bin.overflowBin,
      isDisabled: bin.isDisabled,
      pickList: bin.pickList,
      repackPriority: bin.repackPriority,
    },
  );
  return result.ok;
}

export async function loadRemovalCopiesThroughRoute(
  actor: ServerScanActor,
  collectionGuid: string,
  cardIds: string[],
): Promise<ScannedCard[]> {
  const query = new URLSearchParams({ cardIds: cardIds.join(",") });
  const response = await collectionsRouter.request(
    `/${collectionGuid}/cards/copies?${query}`,
    { headers: { "X-Org-Id": actor.orgId } },
    { [SERVER_SCAN_ACTOR]: actor },
  );
  const result = (await response.json()) as {
    success: boolean;
    data?: ScannedCard[];
    message?: string;
  };
  if (!response.ok || !result.success)
    throw new PiScanActionError(
      result.message ?? "Removal lookup failed.",
      response.status,
    );
  return result.data ?? [];
}

export async function removeQueuedCardsThroughRoute(
  actor: ServerScanActor,
  collectionGuid: string,
  scanIds: string[],
): Promise<boolean> {
  return (
    await callJson(
      collectionsRouter,
      `/${collectionGuid}/cards/remove-bulk`,
      "POST",
      actor,
      { scanIds },
    )
  ).ok;
}

export async function withScanActorTransaction<T>(
  actor: ServerScanActor,
  work: (tx: Transaction) => Promise<T>,
): Promise<T> {
  let value: T | undefined;
  let workError: unknown;
  const router = new Hono<AppEnv>()
    .post("/", requireAuth, requireOrg, async (c) => {
      value = await authQuery(c.get("jwtClaims"), work);
      return c.json({ success: true });
    })
    .onError((error, c) => {
      workError = error;
      return c.json({ success: false, message: error.message }, 500);
    });
  const result = await callJson(router, "/", "POST", actor, {});
  if (workError) throw workError;
  if (!result.ok)
    throw new PiScanActionError(
      result.body.message ?? "The scan action could not be completed.",
      result.status,
    );
  return value as T;
}
