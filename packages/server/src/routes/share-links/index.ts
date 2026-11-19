import { Hono } from "hono";
import { authQuery } from "../../db";
import {
  findOrIssueCardShareLink,
  forgetVerifiedCardShareLinks,
  listCollectionCardShareLinks,
} from "../../lib/card-share-links";
import { CARD_NOT_FOUND_MESSAGE } from "../../lib/constants/card-share-links";
import { UUID_PATTERN } from "../../lib/constants/validation";
import { closeMonitorLinkStreams, forgetVerifiedMonitorLinks } from "../../lib/monitor-links";
import { forgetSharedStorageReads } from "../../lib/shared-storage-reads-cache";
import { listSubjectShareLinks, revokeShareLink } from "../../lib/share-links";
import { isShareTokenConfigured } from "../../lib/share-tokens";
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
  .get("/cards", requireAuth, requireOrg, async (c) => {
    const collectionGuid = c.req.query("collectionGuid") ?? "";
    if (!UUID_PATTERN.test(collectionGuid)) {
      return c.json({ success: false, message: "Invalid collection." }, 400);
    }
    const data = await authQuery(c.get("jwtClaims"), (tx) =>
      listCollectionCardShareLinks(tx, c.get("orgId"), collectionGuid),
    );
    return c.json({ success: true, data });
  })
  .post("/cards/:scanId", requireAuth, requireOrg, async (c) => {
    if (!isShareTokenConfigured()) {
      return c.json({ success: false, message: "Share links are not configured." }, 503);
    }
    const scanId = c.req.param("scanId");
    const data = UUID_PATTERN.test(scanId)
      ? await authQuery(c.get("jwtClaims"), (tx) =>
          findOrIssueCardShareLink(tx, c.get("orgId"), scanId, c.get("userId")),
        )
      : null;
    if (!data) {
      return c.json({ success: false, message: CARD_NOT_FOUND_MESSAGE }, 404);
    }
    return c.json({ success: true, message: "Card share link ready.", data });
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
    } else if (revoked.kind === "card") {
      forgetVerifiedCardShareLinks(linkGuid);
    } else {
      forgetVerifiedStorageShareLinks(revoked.subjectGuid);
      forgetSharedStorageReads(revoked.subjectGuid);
    }
    return c.json({ success: true, message: "Revoked share link." });
  });
