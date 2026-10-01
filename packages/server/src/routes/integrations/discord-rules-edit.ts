import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { authQuery } from "../../db";
import { notificationRules } from "../../db/schema";
import { loadNotificationRules } from "../../lib/notification-rules";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";
import { checkRuleTargets, notificationRuleInputSchema } from "./shared";

export const editNotificationRuleRoute = new Hono<AppEnv>().put(
  "/discord/rules/:guid",
  requireAuth,
  requireOrg,
  async (c) => {
    const orgId = c.get("orgId");
    const guid = c.req.param("guid");
    const input = notificationRuleInputSchema.safeParse(await c.req.json());
    if (!input.success) {
      return c.json(
        { success: false, message: "Invalid notification rule." },
        400,
      );
    }
    try {
      const current = await authQuery(c.get("jwtClaims"), (tx) =>
        tx.query.notificationRules.findFirst({
          where: and(
            eq(notificationRules.guid, guid),
            eq(notificationRules.orgId, orgId),
          ),
          columns: { channelId: true, roleId: true },
        }),
      );
      if (!current) {
        return c.json({ success: false, message: "Rule not found." });
      }
      if (
        current.channelId !== input.data.channelId ||
        current.roleId !== input.data.roleId
      ) {
        const targetError = await checkRuleTargets(
          orgId,
          input.data.channelId,
          input.data.roleId,
        );
        if (targetError) {
          return c.json({ success: false, message: targetError });
        }
      }

      const result = await authQuery(c.get("jwtClaims"), async (tx) => {
        const [updated] = await tx
          .update(notificationRules)
          .set({
            name: input.data.name,
            isEnabled: input.data.isEnabled,
            rules: input.data.rules,
            channelId: input.data.channelId,
            roleId: input.data.roleId,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(notificationRules.guid, guid),
              eq(notificationRules.orgId, orgId),
            ),
          )
          .returning({ gameId: notificationRules.gameId });
        if (!updated)
          return { success: false as const, message: "Rule not found." };
        return {
          success: true as const,
          data: await loadNotificationRules(tx, orgId, updated.gameId),
        };
      });
      return c.json(result);
    } catch (err) {
      console.error(err);
      return c.json({ success: false, message: "Database error." }, 500);
    }
  },
);
