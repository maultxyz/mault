import { and, count, eq, max } from "drizzle-orm";
import { Hono } from "hono";
import { authQuery } from "../../db";
import { soundRules } from "../../db/schema";
import {
  getSoundRuleLimit,
  soundRuleLimitMessage,
} from "../../lib/sound-rule-limit";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";
import {
  findClipId,
  findGameId,
  loadSoundRules,
  soundRuleInputSchema,
} from "./shared";

export const addSoundRuleRoute = new Hono<AppEnv>().post(
  "/rules",
  requireAuth,
  requireOrg,
  async (c) => {
    const orgId = c.get("orgId");
    const body = await c.req.json<{ gameGuid?: unknown }>();
    const input = soundRuleInputSchema.safeParse(body);
    if (!input.success || typeof body.gameGuid !== "string") {
      return c.json({ success: false, message: "Invalid sound rule." }, 400);
    }
    const gameGuid = body.gameGuid;
    try {
      const result = await authQuery(c.get("jwtClaims"), async (tx) => {
        const gameId = await findGameId(tx, gameGuid);
        if (gameId === null)
          return { success: false as const, message: "Game not found." };
        const clipId = await findClipId(tx, orgId, input.data.clipGuid);
        if (clipId === undefined)
          return { success: false as const, message: "Clip not found." };

        const limit = await getSoundRuleLimit(tx, orgId);
        if (limit !== null) {
          const [{ total }] = await tx
            .select({ total: count() })
            .from(soundRules)
            .where(
              and(eq(soundRules.orgId, orgId), eq(soundRules.isDeleted, false)),
            );
          if (total >= limit) {
            return {
              success: false as const,
              message: soundRuleLimitMessage(limit),
              soundRuleLimitReached: true,
            };
          }
        }

        const [{ last }] = await tx
          .select({ last: max(soundRules.position) })
          .from(soundRules)
          .where(
            and(
              eq(soundRules.orgId, orgId),
              eq(soundRules.gameId, gameId),
              eq(soundRules.isDeleted, false),
            ),
          );
        await tx.insert(soundRules).values({
          name: input.data.name,
          isEnabled: input.data.isEnabled,
          rules: input.data.rules,
          clipId,
          gameId,
          position: (last ?? -1) + 1,
          orgId,
        });
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
