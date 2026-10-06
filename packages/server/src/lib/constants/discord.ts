import type { OrgRole } from "@magic-vault/shared";


export const DISCORD_LINK_CODE_LENGTH = 8;
export const DISCORD_GUILD_FETCH_TIMEOUT_MS = 5000;
export const NOTIFICATION_RULE_FOOTER_PREFIX = "Notification rule: ";
export const DISCORD_CHANNEL_EDITOR_ROLES: OrgRole[] = ["owner", "admin"];
export const SCAN_NOTIFICATION_CONCURRENCY = 2;
export const SCAN_NOTIFICATION_QUEUE_LIMIT = 200;

export const DISCORD_TEST_EMBEDS: Record<string, { title: string; description: string }> = {
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
