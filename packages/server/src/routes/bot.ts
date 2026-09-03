import { and, count, desc, eq, sql } from "drizzle-orm";
import { Hono } from "hono";
import { authProvider } from "../auth";
import { db } from "../db";
import { collectionCards, collections, orgSettings } from "../db/schema";
import { requireBotSecret, type AppEnv } from "../middleware/auth";

const router = new Hono<AppEnv>();

router.use("*", requireBotSecret);

async function resolveOrgByGuild(guildId: string): Promise<string | null> {
  const rows = await db
    .select({ orgId: orgSettings.orgId })
    .from(orgSettings)
    .where(eq(orgSettings.discordGuildId, guildId))
    .limit(1);
  return rows[0]?.orgId ?? null;
}

const getOrgName = (orgId: string) => authProvider.getOrganisationName(orgId);

router.post("/link", async (c) => {
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

router.post("/set-channel", async (c) => {
  const body = await c.req.json<{
    guildId?: string;
    channelId?: string;
    kind?: string;
  }>();
  const { guildId, channelId, kind } = body;
  if (!guildId || !channelId || (kind !== "scan" && kind !== "error")) {
    return c.json(
      {
        success: false,
        message:
          'guildId, channelId, and kind ("scan" or "error") are required.',
      },
      400,
    );
  }

  const orgId = await resolveOrgByGuild(guildId);
  if (!orgId) {
    return c.json({ success: false, message: "not_linked" }, 404);
  }

  await db
    .update(orgSettings)
    .set(
      kind === "scan"
        ? {
            discordScanChannelId: channelId,
            discordScanThreadId: null,
            updatedAt: new Date(),
          }
        : {
            discordErrorChannelId: channelId,
            discordErrorThreadId: null,
            updatedAt: new Date(),
          },
    )
    .where(eq(orgSettings.orgId, orgId));

  return c.json({ success: true, message: "Channel set." });
});

router.get("/stats", async (c) => {
  const guildId = c.req.query("guildId");
  const collectionGuid = c.req.query("collection");
  if (!guildId) {
    return c.json({ success: false, message: "guildId is required." }, 400);
  }
  const orgId = await resolveOrgByGuild(guildId);
  if (!orgId) {
    return c.json({ success: false, message: "not_linked" }, 404);
  }

  let collectionName: string | undefined;
  if (collectionGuid) {
    const match = await db
      .select({ name: collections.name })
      .from(collections)
      .where(
        and(eq(collections.orgId, orgId), eq(collections.guid, collectionGuid)),
      )
      .limit(1);
    if (!match[0]) {
      return c.json({ success: false, message: "collection_not_found" }, 404);
    }
    collectionName = match[0].name;
  }

  const scopeCondition = collectionGuid
    ? and(eq(collections.orgId, orgId), eq(collections.guid, collectionGuid))
    : eq(collections.orgId, orgId);

  const [row] = await db
    .select({
      collectionCount: sql<number>`count(distinct ${collections.id})`,
      cardCount: count(collectionCards.id),
      totalValue: sql<
        string | null
      >`sum((${collectionCards.card}->>'price')::numeric)`,
    })
    .from(collections)
    .leftJoin(collectionCards, eq(collectionCards.collectionId, collections.id))
    .where(scopeCondition);

  return c.json({
    success: true,
    data: {
      collectionCount: Number(row?.collectionCount ?? 0),
      cardCount: Number(row?.cardCount ?? 0),
      totalValue: row?.totalValue ? Number(row.totalValue) : 0,
      collectionName,
    },
  });
});

router.get("/collections", async (c) => {
  const guildId = c.req.query("guildId");
  if (!guildId) {
    return c.json({ success: false, message: "guildId is required." }, 400);
  }
  const orgId = await resolveOrgByGuild(guildId);
  if (!orgId) {
    return c.json({ success: false, message: "not_linked" }, 404);
  }

  const rows = await db
    .select({
      guid: collections.guid,
      name: collections.name,
      cardCount: count(collectionCards.id),
      updatedAt: collections.updatedAt,
    })
    .from(collections)
    .leftJoin(collectionCards, eq(collectionCards.collectionId, collections.id))
    .where(eq(collections.orgId, orgId))
    .groupBy(
      collections.id,
      collections.guid,
      collections.name,
      collections.updatedAt,
    )
    .orderBy(desc(collections.updatedAt));

  return c.json({
    success: true,
    data: rows.map((r) => ({
      guid: r.guid,
      name: r.name,
      cardCount: Number(r.cardCount),
    })),
  });
});

export { router as botRouter };
