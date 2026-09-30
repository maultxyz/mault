import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { authQuery } from "../../db";
import { soundRules } from "../../db/schema";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";
import { findClipId, loadSoundRules, soundRuleInputSchema } from "./shared";

export const editSoundRuleRoute = new Hono<AppEnv>().put(
  "/rules/:guid",
  requireAuth,
  requireOrg,
  async (c) => {
    const orgId = c.get("orgId");
    const guid = c.req.param("guid");
    const input = soundRuleInputSchema.safeParse(await c.req.json());
    if (!input.success) {
      return c.json({ success: false, message: "Invalid sound rule." }, 400);
    }
    try {
      const result = await authQuery(c.get("jwtClaims"), async (tx) => {
        const clipId = await findClipId(tx, orgId, input.data.clipGuid);
        if (clipId === undefined)
          return { success: false as const, message: "Clip not found." };
        const [updated] = await tx
          .update(soundRules)
          .set({
            name: input.data.name,
            isEnabled: input.data.isEnabled,
            rules: input.data.rules,
            clipId,
            updatedAt: new Date(),
          })
          .where(and(eq(soundRules.guid, guid), eq(soundRules.orgId, orgId)))
          .returning({ gameId: soundRules.gameId });
        if (!updated)
          return { success: false as const, message: "Rule not found." };
        return {
          success: true as const,
          data: await loadSoundRules(tx, orgId, updated.gameId),
        };
      });
      return c.json(result);
    } catch (err) {
      console.error(err);
      return c.json({ success: false, message: "Database error." }, 500);
    }
  },
);
