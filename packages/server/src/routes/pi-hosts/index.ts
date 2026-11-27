import {
  PI_HOST_UPDATE_SEGMENT,
  piHostClaimFormSchema,
  piHostNameFormSchema,
} from "@magic-vault/shared";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { Hono } from "hono";
import { authQuery } from "../../db";
import {
  PI_HOST_CLAIM_RATE_LIMIT_REQUESTS,
  PI_HOST_CLAIM_RATE_LIMIT_WINDOW_MS,
  PI_HOST_MANAGER_ROLES,
  PI_HOST_MANAGERS_ONLY_MESSAGE,
  PI_HOST_NOT_FOUND_MESSAGE,
  PI_LINK_PAIRING_NOT_FOUND_MESSAGE,
  PI_LINK_RATE_LIMIT_SWEEP_SIZE,
  PI_LINK_RATE_LIMITED_MESSAGE,
} from "../../lib/constants/pi-hosts";
import { createRateLimiter } from "../../lib/public-api/rate-limit";
import { UUID_PATTERN } from "../../lib/constants/validation";
import {
  claimPiLinkPairing,
  findPiHostActiveScanUser,
  listPiHosts,
  renamePiHost,
  revokePiHost,
} from "../../lib/pi-hosts";
import {
  disconnectPiLinkDevice,
  sendPiLinkCommand,
  withPiHostLiveStatus,
} from "../../lib/pi-link-relay";
import {
  rejectAccountChangesWhileImpersonating,
  rejectWhileImpersonating,
  requireAuth,
  requireOrg,
  type AppEnv,
} from "../../middleware/auth";
import { piHostScanSessionRouter } from "./scan-session";

const consumeClaimRateLimit = createRateLimiter({
  requests: PI_HOST_CLAIM_RATE_LIMIT_REQUESTS,
  windowMs: PI_HOST_CLAIM_RATE_LIMIT_WINDOW_MS,
  sweepSize: PI_LINK_RATE_LIMIT_SWEEP_SIZE,
});

export const piHostsRouter = new Hono<AppEnv>()
  .get("/", requireAuth, requireOrg, async (c) => {
    const orgId = c.get("orgId");
    const data = withPiHostLiveStatus(
      await authQuery(c.get("jwtClaims"), (tx) => listPiHosts(tx, orgId)),
    );
    return c.json({
      success: true,
      data,
      canManage: PI_HOST_MANAGER_ROLES.includes(c.get("orgRole")),
    });
  })
  .post("/claim", requireAuth, rejectAccountChangesWhileImpersonating, requireOrg, async (c) => {
    if (!PI_HOST_MANAGER_ROLES.includes(c.get("orgRole")))
      return c.json({ success: false, message: PI_HOST_MANAGERS_ONLY_MESSAGE });
    if (!consumeClaimRateLimit(c.get("userId")).allowed)
      return c.json({ success: false, message: PI_LINK_RATE_LIMITED_MESSAGE }, 429);
    const parsed = piHostClaimFormSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success)
      return c.json({ success: false, message: PI_LINK_PAIRING_NOT_FOUND_MESSAGE }, 400);
    const claimed = await claimPiLinkPairing(
      c.get("orgId"),
      c.get("userId"),
      parsed.data.code,
      parsed.data.name,
    );
    if (!claimed.ok)
      return c.json({ success: false, message: PI_LINK_PAIRING_NOT_FOUND_MESSAGE }, 404);
    const orgId = c.get("orgId");
    const data = withPiHostLiveStatus(
      await authQuery(c.get("jwtClaims"), (tx) => listPiHosts(tx, orgId)),
    );
    return c.json({ success: true, data, guid: claimed.guid });
  })
  .put("/:guid", requireAuth, requireOrg, async (c) => {
    if (!PI_HOST_MANAGER_ROLES.includes(c.get("orgRole")))
      return c.json({ success: false, message: PI_HOST_MANAGERS_ONLY_MESSAGE });
    const parsed = piHostNameFormSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ success: false, message: "Enter a name." }, 400);
    const orgId = c.get("orgId");
    const guid = c.req.param("guid");
    if (!UUID_PATTERN.test(guid)) return c.json({ success: false, message: "Pi not found." }, 404);
    const renamed = await authQuery(c.get("jwtClaims"), (tx) =>
      renamePiHost(tx, orgId, guid, parsed.data.name),
    );
    if (!renamed) return c.json({ success: false, message: "Pi not found." }, 404);
    return c.json({ success: true });
  })
  .delete("/:guid", requireAuth, rejectAccountChangesWhileImpersonating, requireOrg, async (c) => {
    if (!PI_HOST_MANAGER_ROLES.includes(c.get("orgRole")))
      return c.json({ success: false, message: PI_HOST_MANAGERS_ONLY_MESSAGE });
    const orgId = c.get("orgId");
    const guid = c.req.param("guid");
    if (!UUID_PATTERN.test(guid)) return c.json({ success: false, message: "Pi not found." }, 404);
    const revoked = await authQuery(c.get("jwtClaims"), (tx) => revokePiHost(tx, orgId, guid));
    if (!revoked) return c.json({ success: false, message: "Pi not found." }, 404);
    disconnectPiLinkDevice(guid);
    return c.json({ success: true });
  })
  .post(`/:guid${PI_HOST_UPDATE_SEGMENT}`, requireAuth, rejectWhileImpersonating, requireOrg, async (c) => {
    if (!PI_HOST_MANAGER_ROLES.includes(c.get("orgRole")))
      return c.json({ success: false, message: PI_HOST_MANAGERS_ONLY_MESSAGE });
    const orgId = c.get("orgId");
    const guid = c.req.param("guid");
    if (!UUID_PATTERN.test(guid)) return c.json({ success: false, message: PI_HOST_NOT_FOUND_MESSAGE }, 404);
    const host = await authQuery(c.get("jwtClaims"), (tx) => findPiHostActiveScanUser(tx, orgId, guid));
    if (!host) return c.json({ success: false, message: PI_HOST_NOT_FOUND_MESSAGE }, 404);
    const result = await sendPiLinkCommand(guid, c.get("userId"), "update");
    return c.json(result.body, result.status as ContentfulStatusCode);
  })
  .route("/:guid/scan-session", piHostScanSessionRouter);
