import type { SerialEventReport } from "@magic-vault/shared";
import { Hono } from "hono";
import { sendDiscordNotification } from "../lib/discord";
import { classifySerialEvent } from "../lib/serial-events";
import { requireAuth, requireOrg, type AppEnv } from "../middleware/auth";

const router = new Hono<AppEnv>();

const TEST_EMBEDS: Record<string, { title: string; description: string }> = {
  "sorter-error": {
    title: "Magic Vault — Sorter Error [TEST]",
    description:
      "**Card:** Lightning Bolt\n**Bin:** 3\n**Error:** No response from the device in time.",
  },
  "feeder-empty": {
    title: "Magic Vault — Feeder Empty [TEST]",
    description:
      "No cards remaining in the hopper. Add more cards to continue.",
  },
  "card-jam": {
    title: "Magic Vault — Card Jam Detected [TEST]",
    description:
      "Card stuck at module 2 (heading to bin 5). Check the sorter and resume.",
  },
  "card-search-error": {
    title: "Magic Vault — Card Search Error [TEST]",
    description: "A database error occurred while searching for a card.",
  },
  "sync-failure": {
    title: "Magic Vault — Sync Failed [TEST]",
    description:
      "The card database sync job encountered a fatal error.\n\n**Error:** Scryfall catalog fetch failed: 503",
  },
};

router.post("/test", requireAuth, requireOrg, async (c) => {
  const { type } = await c.req.json<{ type: string }>();
  const embed = TEST_EMBEDS[type];
  if (!embed) {
    return c.json(
      { success: false, message: "Unknown notification type." },
      400,
    );
  }
  const orgId = c.get("orgId");
  await sendDiscordNotification(
    orgId,
    {
      ...embed,
      color: 0xed4245,
      timestamp: new Date().toISOString(),
    },
    "error",
  );
  return c.json({ success: true, message: "Test notification sent." });
});

router.post("/serial-event", requireAuth, requireOrg, async (c) => {
  const event = await c.req.json<SerialEventReport>();
  const classified = classifySerialEvent(event);
  if (classified) {
    const orgId = c.get("orgId");
    void sendDiscordNotification(
      orgId,
      {
        title: `Magic Vault — ${classified.title}`,
        description: classified.description,
        color: 0xed4245,
        timestamp: new Date().toISOString(),
      },
      "error",
      undefined,
      undefined,
      event.collectionGuid,
    );
  }
  return c.json({ success: true, message: "Serial event reported." });
});

export { router as notificationsRouter };
