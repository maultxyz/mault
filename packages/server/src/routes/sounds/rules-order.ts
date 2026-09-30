import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { authQuery } from "../../db";
import { soundRules } from "../../db/schema";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";
import { findGameId, loadSoundRules } from "./shared";

export const orderSoundRulesRoute = new Hono<AppEnv>().put(
  "/rules/order",
  requireAuth,
  requireOrg,
  async (c) => {
    const orgId = c.get("orgId");
    const { gameGuid, guids } = await c.req.json<{
      gameGuid?: unknown;
      guids?: unknown;
    }>();
    if (
      typeof gameGuid !== "string" ||
      !Array.isArray(guids) ||
      !guids.every((g) => typeof g === "string")
    ) {
      return c.json({ success: false, message: "Invalid order." }, 400);
    }
    try {
      const result = await authQuery(c.get("jwtClaims"), async (tx) => {
        const gameId = await findGameId(tx, gameGuid);
        if (gameId === null)
          return { success: false as const, message: "Game not found." };
        for (const [position, guid] of (guids as string[]).entries()) {
          await tx
            .update(soundRules)
            .set({ position })
            .where(
              and(
                eq(soundRules.guid, guid),
                eq(soundRules.orgId, orgId),
                eq(soundRules.gameId, gameId),
              ),
            );
        }
        return {
          success: true as const,
          data: await loadSoundRules(tx, orgId, gameId),
        };
      });
      return c.json(result);
    } catch (err) {
      console.error(err);
      return c.json({ success: false, message: "Database error." }, 500);
    }
  },
);
