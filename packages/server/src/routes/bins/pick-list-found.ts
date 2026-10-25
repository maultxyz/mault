import {
  applyPickListFound,
  toPickList,
  type PickList,
  type PickListFoundInput,
  type PickListFoundResult,
} from "@magic-vault/shared";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { authQuery, type Transaction } from "../../db";
import { bins } from "../../db/schema";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";
import { resetPickList } from "./shared";
import { databaseErrorResponse } from "../../lib/database-error-response";

async function updateBinPickList(
  tx: Transaction,
  orgId: string,
  binGuid: string,
  update: (current: PickList) => PickList | null,
): Promise<PickListFoundResult | null> {
  const [target] = await tx
    .select({ id: bins.id, pickList: bins.pickList })
    .from(bins)
    .where(
      and(
        eq(bins.guid, binGuid),
        eq(bins.orgId, orgId),
        eq(bins.isDeleted, false),
      ),
    )
    .for("update");
  if (!target) return null;
  const current = toPickList(target.pickList);
  const next = current ? update(current) : null;
  if (!next) return { changed: false, pickList: current };
  await tx.update(bins).set({ pickList: next }).where(eq(bins.id, target.id));
  return { changed: true, pickList: next };
}

export const pickListFoundRoute = new Hono<AppEnv>()
  .post(
    "/bins/:binGuid/pick-list/found",
    requireAuth,
    requireOrg,
    async (c) => {
      const orgId = c.get("orgId");
      const binGuid = c.req.param("binGuid");
      const { name, delta } = await c.req.json<Partial<PickListFoundInput>>();
      if (typeof name !== "string" || (delta !== 1 && delta !== -1)) {
        return c.json({ success: false, message: "Invalid request." }, 400);
      }
      try {
        const data = await authQuery(c.get("jwtClaims"), (tx) =>
          updateBinPickList(tx, orgId, binGuid, (current) =>
            applyPickListFound(current, name, delta),
          ),
        );
        if (!data) {
          return c.json({ success: false, message: "Bin not found." }, 404);
        }
        return c.json({ success: true, data });
      } catch (err) {
        return databaseErrorResponse(c, err);
      }
    },
  )
  .post(
    "/bins/:binGuid/pick-list/reset",
    requireAuth,
    requireOrg,
    async (c) => {
      const orgId = c.get("orgId");
      const binGuid = c.req.param("binGuid");
      try {
        const data = await authQuery(c.get("jwtClaims"), (tx) =>
          updateBinPickList(tx, orgId, binGuid, resetPickList),
        );
        if (!data) {
          return c.json({ success: false, message: "Bin not found." }, 404);
        }
        return c.json({ success: true, data });
      } catch (err) {
        return databaseErrorResponse(c, err);
      }
    },
  );
