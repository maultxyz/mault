import { Hono } from "hono";
import type {
  SyncCardBody,
  SyncStartBody,
} from "../../lib/interfaces/sync-job";
import type { SyncApiKeyEnv } from "../../lib/interfaces/sync-api-keys";
import { SYNC_API_KEY_PERMISSION_DENIED_MESSAGES } from "../../lib/constants/sync-api-keys";
import {
  hasSyncApiKeyPermission,
  syncStartPermissionFor,
} from "../../lib/sync-api-key-permissions";
import { cancelSync, getStatus, SYNC_SOURCES } from "../../lib/sync-job";
import {
  requestSyncStart,
  toSyncStartRequest,
} from "../../lib/sync-job/start-request";
import {
  requireSyncApiKey,
  requireSyncApiKeyPermission,
} from "../../middleware/sync-api-key";
import { syncOneCard } from "../admin/shared";

const router = new Hono<SyncApiKeyEnv>()
  .use(requireSyncApiKey)
  .get("/sync", (c) => c.json({ success: true, data: getStatus() }))
  .get("/sync/sources", (c) =>
    c.json({
      success: true,
      data: Object.values(SYNC_SOURCES).map((source) => ({
        gameKey: source.gameKey,
        label: source.label,
        languages: source.languages,
      })),
    }),
  )
  .post("/sync", async (c) => {
    const body = await c.req.json<SyncStartBody>().catch(() => ({}));
    const request = {
      ...toSyncStartRequest(body),
      vectorizeOn: "server" as const,
    };
    const requiredPermission = syncStartPermissionFor(request.forceResync);
    if (
      !hasSyncApiKeyPermission(
        c.get("syncApiKeyPermissions"),
        requiredPermission,
      )
    ) {
      return c.json(
        {
          success: false,
          message: SYNC_API_KEY_PERMISSION_DENIED_MESSAGES[requiredPermission],
        },
        403,
      );
    }
    if (getStatus().status === "running") {
      return c.json(
        { success: false, message: "A sync is already running." },
        409,
      );
    }
    const outcome = await requestSyncStart(undefined, request);
    if (!outcome.success) {
      return c.json(
        { success: false, message: outcome.message },
        outcome.status,
      );
    }
    console.info(
      `[sync-api] ${c.get("syncApiKeyName")} started a ${request.forceResync ? "force resync" : "sync"} of ${request.gameKey} (${request.lang})`,
    );
    return c.json({ success: true, data: getStatus() });
  })
  .delete("/sync", requireSyncApiKeyPermission("sync_cancel"), (c) => {
    cancelSync();
    return c.json({ success: true, data: getStatus() });
  })
  .post(
    "/cards/sync",
    requireSyncApiKeyPermission("sync_card"),
    async (c) => {
      const body: SyncCardBody = await c.req
        .json<SyncCardBody>()
        .catch(() => ({}));
      const cardId = body.cardId?.trim();
      if (!body.gameKey || !cardId) {
        return c.json(
          { success: false, message: "gameKey and cardId are required." },
          400,
        );
      }
      const result = await syncOneCard(body.gameKey, cardId, body.lang || "en");
      if (!result.success) {
        return c.json(
          { success: false, message: result.message },
          result.status,
        );
      }
      return c.json({ success: true, message: result.message });
    },
  );

export { router as syncApiRouter };
