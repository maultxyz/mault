import type { BinConfig, PickList } from "@magic-vault/shared";
import type { Hono } from "hono";
import { collectionsRouter } from "../../routes/collections";
import { sortBinsRouter } from "../../routes/bins";
import type { AppEnv } from "../../middleware/auth";

interface RouteJson {
  success?: boolean;
  message?: string;
  data?: { pickList?: PickList | null };
}

async function callJson(
  router: Hono<AppEnv>,
  path: string,
  method: "POST" | "PUT",
  token: string,
  orgId: string,
  body: unknown,
): Promise<{ ok: boolean; body: RouteJson }> {
  const response = await router.request(path, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "X-Org-Id": orgId,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const payload = (await response.json()) as RouteJson;
  return { ok: response.ok && payload.success !== false, body: payload };
}

export async function saveThroughCollectionRoute(
  token: string,
  orgId: string,
  collectionGuid: string,
  kind: "cards" | "unmatched",
  body: unknown,
): Promise<{ success: boolean; message: string }> {
  if (!token) {
    return { success: false, message: "The scan is not signed in." };
  }
  const result = await callJson(
    collectionsRouter,
    `/${collectionGuid}/${kind}`,
    "POST",
    token,
    orgId,
    body,
  );
  if (!result.ok) {
    return {
      success: false,
      message: result.body.message ?? "The card could not be saved.",
    };
  }
  return { success: true, message: result.body.message ?? "" };
}

export async function recordPickFound(
  token: string,
  orgId: string,
  binGuid: string,
  name: string,
): Promise<PickList | null> {
  if (!token) return null;
  const result = await callJson(
    sortBinsRouter,
    `/bins/${binGuid}/pick-list/found`,
    "POST",
    token,
    orgId,
    { name, delta: 1 },
  );
  if (!result.ok) return null;
  return result.body.data?.pickList ?? null;
}

export async function saveBinThroughRoute(
  token: string,
  orgId: string,
  gameGuid: string,
  bin: BinConfig,
): Promise<boolean> {
  if (!token) return false;
  const params = gameGuid
    ? `?${new URLSearchParams({ gameGuid }).toString()}`
    : "";
  const result = await callJson(
    sortBinsRouter,
    `/bins/${bin.binNumber}${params}`,
    "PUT",
    token,
    orgId,
    {
      rules: bin.rules,
      isCatchAll: bin.isCatchAll,
      isOverride: bin.isOverride,
      overridePriority: bin.overridePriority,
      lowMatchPercent: bin.lowMatchPercent,
      cardLimit: bin.cardLimit,
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
