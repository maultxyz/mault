import type { MonitorLinkInfo } from "@magic-vault/shared";
import { Hono, type Context } from "hono";
import { db } from "../../db";
import { verifyMonitorLink } from "../../lib/monitor-links";
import { loadOrgPriceSource } from "../../lib/price-source";
import type { MonitorLinkClaims } from "../../lib/interfaces/monitor-links";
import type { AppEnv } from "../../middleware/auth";
import { MONITOR_LINK_INVALID_MESSAGE } from "../../lib/constants/auth";
import { readCardsPage, readCardsSummary } from "../collections/cards-read";

async function claimsFor(c: Context<AppEnv>): Promise<MonitorLinkClaims | null> {
  const token = c.req.query("token");
  return token ? verifyMonitorLink(token) : null;
}

export const publicMonitorLinkRoute = new Hono<AppEnv>()
  .get("/monitor-link", async (c) => {
    const claims = await claimsFor(c);
    if (!claims) {
      return c.json({ success: false, message: MONITOR_LINK_INVALID_MESSAGE }, 401);
    }
    return c.json({
      success: true,
      message: "Valid monitor link.",
      data: {
        collectionGuid: claims.collectionGuid,
        collectionName: claims.collectionName,
        expiresAt: claims.expiresAt.toISOString(),
        priceSource: await loadOrgPriceSource(db, claims.orgId),
      } satisfies MonitorLinkInfo,
    });
  })
  .get("/monitor-link/cards", async (c) => {
    const claims = await claimsFor(c);
    if (!claims) {
      return c.json({ success: false, message: MONITOR_LINK_INVALID_MESSAGE }, 401);
    }
    try {
      const data = await readCardsPage(
        (fn) => db.transaction(fn),
        claims.collectionGuid,
        claims.orgId,
        c.req.query(),
      );
      if (!data) {
        return c.json({ success: false, message: "Collection not found." });
      }
      return c.json({ success: true, data });
    } catch (err) {
      console.error(err);
      return c.json({ success: false, message: "Database error." }, 500);
    }
  })
  .get("/monitor-link/cards/summary", async (c) => {
    const claims = await claimsFor(c);
    if (!claims) {
      return c.json({ success: false, message: MONITOR_LINK_INVALID_MESSAGE }, 401);
    }
    try {
      const data = await readCardsSummary(
        (fn) => db.transaction(fn),
        claims.collectionGuid,
        claims.orgId,
        c.req.query(),
      );
      if (!data) {
        return c.json({ success: false, message: "Collection not found." });
      }
      return c.json({ success: true, data });
    } catch (err) {
      console.error(err);
      return c.json({ success: false, message: "Database error." }, 500);
    }
  });
