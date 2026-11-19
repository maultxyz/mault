import {
  applyPickListFound,
  type PickListFoundInput,
} from "@magic-vault/shared";
import { Hono } from "hono";
import { authQuery } from "../../db";
import { updateBinPickList } from "../../lib/scan-pick-list";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";
import { resetPickList } from "./shared";

export const pickListFoundRoute = new Hono<AppEnv>()
  .post(
    "/bins/:binGuid/pick-list/found",
    requireAuth,
    requireOrg,
    async (c) => {
      const orgId = c.get("orgId");
      const binGuid = c.req.param("binGuid");
      const body = await c.req.json<Partial<PickListFoundInput>>();
      const { name, delta } = body;
      if (typeof name !== "string" || (delta !== 1 && delta !== -1)) {
        return c.json({ success: false, message: "Invalid request." }, 400);
      }
      const printing = {
        setCode: typeof body.setCode === "string" ? body.setCode : undefined,
        collectorNumber:
          typeof body.collectorNumber === "string"
            ? body.collectorNumber
            : undefined,
        isFoil: typeof body.isFoil === "boolean" ? body.isFoil : undefined,
      };
      const data = await authQuery(c.get("jwtClaims"), (tx) =>
        updateBinPickList(tx, orgId, binGuid, (current) =>
          applyPickListFound(current, { name, ...printing }, delta),
        ),
      );
      if (!data) {
        return c.json({ success: false, message: "Bin not found." }, 404);
      }
      return c.json({ success: true, data });
    },
  )
  .post(
    "/bins/:binGuid/pick-list/reset",
    requireAuth,
    requireOrg,
    async (c) => {
      const orgId = c.get("orgId");
      const binGuid = c.req.param("binGuid");
      const data = await authQuery(c.get("jwtClaims"), (tx) =>
        updateBinPickList(tx, orgId, binGuid, resetPickList),
      );
      if (!data) {
        return c.json({ success: false, message: "Bin not found." }, 404);
      }
      return c.json({ success: true, data });
    },
  );
