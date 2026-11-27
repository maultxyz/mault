import { PI_SCAN_SESSION_PATH, type PiLinkScanAction } from "@magic-vault/shared";
import { Hono, type Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { isPiHost } from "../lib/pi-host";
import { runPiScanAction } from "../lib/pi-scan/actions";
import {
  rejectWhileImpersonating,
  requireAuth,
  requireOrg,
  type AppEnv,
} from "../middleware/auth";

export { PI_SCAN_SESSION_PATH };

async function respondWithPiScanAction(
  c: Context<AppEnv>,
  action: PiLinkScanAction,
  body?: unknown,
) {
  const result = await runPiScanAction(
    { orgId: c.get("orgId"), userId: c.get("userId"), jwtClaims: c.get("jwtClaims") },
    action,
    body,
  );
  return c.json(result.body, result.status as ContentfulStatusCode);
}

const readBody = (c: Context<AppEnv>) => c.req.json<unknown>();

export const piScanRouter = new Hono<AppEnv>()
  .use("*", async (c, next) => (isPiHost() ? next() : c.notFound()))
  .get("/", requireAuth, requireOrg, (c) => respondWithPiScanAction(c, "state"))
  .post("/", requireAuth, requireOrg, rejectWhileImpersonating, async (c) =>
    respondWithPiScanAction(c, "start", await readBody(c)),
  )
  .post("/pause", requireAuth, requireOrg, rejectWhileImpersonating, (c) =>
    respondWithPiScanAction(c, "pause"),
  )
  .post("/emergency-stop", requireAuth, requireOrg, rejectWhileImpersonating, (c) =>
    respondWithPiScanAction(c, "emergencyStop"),
  )
  .post("/resume", requireAuth, requireOrg, rejectWhileImpersonating, (c) =>
    respondWithPiScanAction(c, "resume"),
  )
  .post("/settings", requireAuth, requireOrg, rejectWhileImpersonating, async (c) =>
    respondWithPiScanAction(c, "settings", await readBody(c)),
  )
  .post("/removal", requireAuth, requireOrg, rejectWhileImpersonating, async (c) =>
    respondWithPiScanAction(c, "removal", await readBody(c)),
  )
  .post("/feed", requireAuth, requireOrg, rejectWhileImpersonating, (c) =>
    respondWithPiScanAction(c, "feed"),
  )
  .post("/reset-stats", requireAuth, requireOrg, rejectWhileImpersonating, (c) =>
    respondWithPiScanAction(c, "resetStats"),
  )
  .delete("/", requireAuth, requireOrg, rejectWhileImpersonating, (c) =>
    respondWithPiScanAction(c, "stop"),
  );
