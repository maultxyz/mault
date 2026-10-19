import { Hono } from "hono";
import { BROWSER_SYNC_BATCH_SIZE } from "@magic-vault/shared";
import type {
  BrowserSyncWorkFailure,
  BrowserSyncWorkResult,
} from "@magic-vault/shared";
import { claimSyncWork, submitSyncWork } from "../../lib/sync-job";
import { requireAuth, requireRole, type AppEnv } from "../../middleware/auth";

function failureMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Sync work failed.";
}

export const syncWorkRoute = new Hono<AppEnv>()
  .post("/sync/work/claim", requireAuth, requireRole("admin"), async (c) => {
    let limit = BROWSER_SYNC_BATCH_SIZE;
    try {
      const body = await c.req.json<{ limit?: number }>();
      if (typeof body.limit === "number" && Number.isFinite(body.limit)) {
        limit = body.limit;
      }
    } catch {}
    try {
      const cards = await claimSyncWork(limit);
      return c.json({ success: true, data: cards });
    } catch (err) {
      return c.json({ success: false, message: failureMessage(err) }, 409);
    }
  })
  .post("/sync/work", requireAuth, requireRole("admin"), async (c) => {
    let results: BrowserSyncWorkResult[] = [];
    let failures: BrowserSyncWorkFailure[] = [];
    try {
      const body = await c.req.json<{
        results?: BrowserSyncWorkResult[];
        failures?: BrowserSyncWorkFailure[];
      }>();
      if (Array.isArray(body.results)) results = body.results;
      if (Array.isArray(body.failures)) failures = body.failures;
    } catch {}
    try {
      await submitSyncWork(results, failures);
      return c.json({ success: true });
    } catch (err) {
      return c.json({ success: false, message: failureMessage(err) }, 409);
    }
  });
