import { NOTIFICATION_RULES_PER_ORG_LIMIT } from "@magic-vault/shared";
import { and, count, eq } from "drizzle-orm";
import { Hono } from "hono";
import { authQuery } from "../../db";
import { notificationRules } from "../../db/schema";
import {
  getNotificationRuleLimit,
  notificationRuleLimitMessage,
} from "../../lib/notification-rule-limit";
import { loadNotificationRules } from "../../lib/notification-rules";
import { findGameId } from "../../lib/rule-groups";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";
import { checkRuleTargets, notificationRuleInputSchema } from "./shared";

export const addNotificationRuleRoute = new Hono<AppEnv>().post(
  "/discord/rules",
  requireAuth,
  requireOrg,
  async (c) => {
    const orgId = c.get("orgId");
    const body = await c.req.json<{ gameGuid?: unknown }>();
    const input = notificationRuleInputSchema.safeParse(body);
    if (!input.success || typeof body.gameGuid !== "string") {
      return c.json(
        { success: false, message: "Invalid notification rule." },
        400,
      );
    }
    const gameGuid = body.gameGuid;
    try {
      const targetError = await checkRuleTargets(
        orgId,
        input.data.channelId,
        input.data.roleId,
      );
      if (targetError) return c.json({ success: false, message: targetError });

      const result = await authQuery(c.get("jwtClaims"), async (tx) => {
        const gameId = await findGameId(tx, gameGuid);
        if (gameId === null)
          return { success: false as const, message: "Game not found." };

        const [{ total }] = await tx
          .select({ total: count() })
          .from(notificationRules)
          .where(
            and(
              eq(notificationRules.orgId, orgId),
              eq(notificationRules.isDeleted, false),
            ),
          );
        const planLimit = await getNotificationRuleLimit(tx, orgId);
        if (planLimit !== null && total >= planLimit) {
          return {
            success: false as const,
            message: notificationRuleLimitMessage(planLimit),
            notificationRuleLimitReached: true,
          };
        }
        if (total >= NOTIFICATION_RULES_PER_ORG_LIMIT) {
          return {
            success: false as const,
            message: `You can have up to ${NOTIFICATION_RULES_PER_ORG_LIMIT} notification rules.`,
          };
        }

        await tx.insert(notificationRules).values({
          name: input.data.name,
          isEnabled: input.data.isEnabled,
          rules: input.data.rules,
          channelId: input.data.channelId,
          roleId: input.data.roleId,
          gameId,
          orgId,
        });
        return {
          success: true as const,
          data: await loadNotificationRules(tx, orgId, gameId),
        };
      });
      return c.json(result);
    } catch (err) {
      console.error(err);
      return c.json({ success: false, message: "Database error." }, 500);
    }
  },
);
