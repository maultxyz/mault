import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { Hono, type Context } from "hono";
import { streamSSE } from "hono/streaming";
import { authProvider } from "../auth";
import { authQuery, db } from "../db";
import { collections } from "../db/schema";
import {
  MAX_TIMER_DELAY_MS,
  MONITOR_LINK_GUEST_NAME,
} from "../lib/constants/auth";
import {
  trackMonitorLinkStream,
  verifyMonitorLink,
} from "../lib/monitor-links";
import { DEPLOY_STATUS_EVENT } from "@magic-vault/shared";
import {
  loadActiveDeployNotice,
  subscribeDeployNotice,
} from "../lib/deploy-notice";
import { getLocksForGuids, subscribeOrgLocks } from "../lib/scan-lock";
import {
  getAllSessionViewers,
  getLiveCountsForGuids,
  getSessionViewers,
  subscribeOrgLiveCounts,
  subscribeSession,
} from "../lib/session-stream";
import { subscribeSSE } from "../lib/sync-job";
import {
  getUserDisplayName,
  verifyRequestToken,
  type AppEnv,
} from "../middleware/auth";
import { loadSessionInit } from "./session-init";

async function streamMonitorLink(c: Context<AppEnv>, shareToken: string) {
  const claims = await verifyMonitorLink(shareToken);
  if (!claims) return c.json({ success: false, message: "Unauthorized" }, 401);
  const { collectionGuid: guid, orgId } = claims;

  return streamSSE(c, async (stream) => {
    let close: () => void = () => {};
    const closed = new Promise<void>((resolve) => {
      close = resolve;
      stream.onAbort(resolve);
    });
    const write = (event: string, data: unknown) => {
      stream.writeSSE({ event, data: JSON.stringify(data) }).catch(() => {});
    };
    const sessionWrite = (event: string, data: unknown) => {
      if (event === "viewers_updated") return;
      write(`session:${guid}:${event}`, data);
    };

    const unsubs = [
      subscribeSession(
        guid,
        orgId,
        `guest:${randomUUID()}`,
        MONITOR_LINK_GUEST_NAME,
        sessionWrite,
      ),
      trackMonitorLinkStream(guid, () => close()),
    ];
    const expiryTimer = setTimeout(
      () => close(),
      Math.min(
        Math.max(0, claims.expiresAt.getTime() - Date.now()),
        MAX_TIMER_DELAY_MS,
      ),
    );

    try {
      const initial = await loadSessionInit(
        (fn) => db.transaction(fn),
        guid,
        orgId,
        [],
      );
      if (initial) write(`session:${guid}:session_init`, initial);
    } catch (err) {
      console.error(`[stream] Failed to load shared session ${guid}:`, err);
    }

    await closed;
    clearTimeout(expiryTimer);
    for (const unsub of unsubs) unsub();
  });
}

// GET /stream — single SSE connection multiplexing everything the app used to
// open separate connections for: org-wide scan locks, org-wide live viewer
// counts, the global admin sync job, and (via ?guids=) per-collection scan
// session events. Session-scoped events are namespaced "session:<guid>:<event>"
// so one connection can safely watch several collections at once.
export const streamRoute = new Hono<AppEnv>().get("/", async (c) => {
  const shareToken = c.req.query("share");
  if (shareToken) return streamMonitorLink(c, shareToken);

  const token = c.req.query("token");
  const orgId = c.req.query("orgId");
  const guidsParam = c.req.query("guids");
  const watchGuids = guidsParam ? guidsParam.split(",").filter(Boolean) : [];

  if (!token) return c.json({ success: false, message: "Unauthorized" }, 401);

  const payload = await verifyRequestToken(token);
  if (!payload?.sub)
    return c.json({ success: false, message: "Unauthorized" }, 401);
  const userId = payload.sub;

  if (orgId) {
    const member = await authProvider.resolveOrgMembership(userId, orgId);
    if (!member) return c.json({ success: false, message: "Forbidden" }, 403);
  }

  const jwtClaims = orgId
    ? JSON.stringify({ sub: userId, role: "authenticated", org_id: orgId })
    : null;
  const displayName = await getUserDisplayName(userId);

  return streamSSE(c, async (stream) => {
    const aborted = new Promise<void>((resolve) => stream.onAbort(resolve));
    const write = (event: string, data: unknown) => {
      stream.writeSSE({ event, data: JSON.stringify(data) }).catch(() => {});
    };

    const unsubs: Array<() => void> = [
      subscribeSSE((event, data) =>
        write(event === "error" ? "sync_error" : event, data),
      ),
      subscribeDeployNotice(write),
    ];

    loadActiveDeployNotice()
      .then((notice) => write(DEPLOY_STATUS_EVENT, notice))
      .catch((err) => console.error("[stream] Failed to load deploy notice:", err));

    if (orgId) {
      unsubs.push(subscribeOrgLocks(orgId, write));
      unsubs.push(subscribeOrgLiveCounts(orgId, write));

      try {
        const guids = await authQuery(jwtClaims!, async (tx) =>
          tx
            .select({ guid: collections.guid })
            .from(collections)
            .where(
              and(
                eq(collections.orgId, orgId),
                eq(collections.isDeleted, false),
              ),
            ),
        );
        const orgGuids = guids.map((r) => r.guid!).filter(Boolean);
        write("lock_init", { locks: getLocksForGuids(orgGuids) });
        write("live_init", {
          counts: getLiveCountsForGuids(orgGuids),
          viewers: getAllSessionViewers(),
        });
      } catch {
        // non-fatal — subscribers still receive live lock/count events
      }

      for (const guid of watchGuids) {
        const sessionWrite = (event: string, data: unknown) =>
          write(`session:${guid}:${event}`, data);

        unsubs.push(
          subscribeSession(guid, orgId, userId, displayName, sessionWrite),
        );

        try {
          const initial = await loadSessionInit(
            (fn) => authQuery(jwtClaims!, fn),
            guid,
            orgId,
            getSessionViewers(guid),
          );
          if (!initial) {
            console.warn(`[stream] Session ${guid} not found in org ${orgId}`);
          } else {
            write(`session:${guid}:session_init`, initial);
          }
        } catch (err) {
          console.error(`[stream] Failed to load session ${guid}:`, err);
        }
      }
    }

    await aborted;
    for (const unsub of unsubs) unsub();
  });
});
