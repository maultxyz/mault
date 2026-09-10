import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { db } from "../../db";
import { orgSettings } from "../../db/schema";
import type { AppEnv } from "../../middleware/auth";
import { getOrgName } from "./shared";

export const botLinkRoute = new Hono<AppEnv>().post("/link", async (c) => {
  const body = await c.req.json<{
    guildId?: string;
    code?: string;
    confirm?: boolean;
  }>();
  const guildId = body.guildId;
  const code = body.code?.toUpperCase();
  const confirm = body.confirm ?? false;
  if (!guildId || !code) {
    return c.json(
      { success: false, message: "guildId and code are required." },
      400,
    );
  }

  const rows = await db
    .select({
      orgId: orgSettings.orgId,
      discordLinkCodeExpiresAt: orgSettings.discordLinkCodeExpiresAt,
    })
    .from(orgSettings)
    .where(eq(orgSettings.discordLinkCode, code))
    .limit(1);
  const row = rows[0];

  if (
    !row ||
    !row.discordLinkCodeExpiresAt ||
    row.discordLinkCodeExpiresAt < new Date()
  ) {
    return c.json({ success: false, message: "Invalid or expired code." }, 400);
  }

  const existingRows = await db
    .select({ orgId: orgSettings.orgId })
    .from(orgSettings)
    .where(eq(orgSettings.discordGuildId, guildId))
    .limit(1);
  const existingOrgId = existingRows[0]?.orgId;
  const relinking = !!existingOrgId && existingOrgId !== row.orgId;

  if (relinking && !confirm) {
    return c.json({
      success: false,
      message: "already_linked",
      data: { currentOrgName: await getOrgName(existingOrgId) },
    });
  }

  if (relinking) {
    await db
      .update(orgSettings)
      .set({ discordGuildId: null, updatedAt: new Date() })
      .where(eq(orgSettings.orgId, existingOrgId));
  }

  await db
    .update(orgSettings)
    .set({
      discordGuildId: guildId,
      discordLinkCode: null,
      discordLinkCodeExpiresAt: null,
      updatedAt: new Date(),
    })
    .where(eq(orgSettings.orgId, row.orgId));

  return c.json({
    success: true,
    message: "Linked.",
    data: { orgName: await getOrgName(row.orgId) },
  });
});
