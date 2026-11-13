import { Hono } from "hono";
import { authQuery } from "../../db";
import { UUID_PATTERN } from "../../lib/constants/validation";
import { closeMonitorLinkStreams, forgetVerifiedMonitorLinks } from "../../lib/monitor-links";
import { forgetSharedStorageReads } from "../../lib/shared-storage-reads-cache";
import { listSubjectShareLinks, revokeShareLink } from "../../lib/share-links";
import { forgetVerifiedStorageShareLinks } from "../../lib/storage-share-links";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";

export const shareLinksRouter = new Hono<AppEnv>()
  .get("/", requireAuth, requireOrg, async (c) => {
    const subjectGuid = c.req.query("subjectGuid") ?? "";
    if (!UUID_PATTERN.test(subjectGuid)) {
      return c.json({ success: false, message: "Invalid subject." }, 400);
    }
    const data = await authQuery(c.get("jwtClaims"), (tx) =>
      listSubjectShareLinks(tx, c.get("orgId"), subjectGuid),
    );
    return c.json({ success: true, data });
  })
  .post("/:guid/revoke", requireAuth, requireOrg, async (c) => {
    const linkGuid = c.req.param("guid");
    const revoked = UUID_PATTERN.test(linkGuid)
      ? await authQuery(c.get("jwtClaims"), (tx) =>
          revokeShareLink(tx, c.get("orgId"), linkGuid),
        )
      : null;
    if (!revoked) {
      return c.json({ success: false, message: "Share link not found." }, 404);
    }
    if (revoked.kind === "collection") {
      closeMonitorLinkStreams(revoked.subjectGuid);
      forgetVerifiedMonitorLinks(revoked.subjectGuid);
    } else {
      forgetVerifiedStorageShareLinks(revoked.subjectGuid);
      forgetSharedStorageReads(revoked.subjectGuid);
    }
    return c.json({ success: true, message: "Revoked share link." });
  });
