import type { OrgRole } from "@magic-vault/shared";


export const DISCORD_LINK_CODE_LENGTH = 8;
export const LINKED_ACCOUNT_ROLE_KEY = "linked-account";
export const DISCORD_GUILD_FETCH_TIMEOUT_MS = 5000;
export const NOTIFICATION_RULE_FOOTER_PREFIX = "Notification rule: ";
export const DISCORD_CHANNEL_EDITOR_ROLES: OrgRole[] = ["owner", "admin"];
export const SCAN_NOTIFICATION_CONCURRENCY = 2;
export const SCAN_NOTIFICATION_QUEUE_LIMIT = 200;

export const DISCORD_TEST_EMBEDS: Record<string, { title: string; description: string }> = {
  "sorter-error": {
    title: "Mault: Sorter Error [TEST]",
    description:
      "**Card:** Lightning Bolt\n**Bin:** 3\n**Error:** No response from the device in time.",
  },
  "feeder-empty": {
    title: "Mault: Feeder Empty [TEST]",
    description:
      "No cards remaining in the hopper. Add more cards to continue.",
  },
  "card-jam": {
    title: "Mault: Card Jam Detected [TEST]",
    description:
      "Card stuck at module 2 (heading to bin 5). Check the sorter and resume.",
  },
  "card-search-error": {
    title: "Mault: Card Search Error [TEST]",
    description: "A database error occurred while searching for a card.",
  },
  "sync-failure": {
    title: "Mault: Sync Failed [TEST]",
    description:
      "The card database sync job encountered a fatal error.\n\n**Error:** Scryfall catalog fetch failed: 503",
  },
};

export const PRICE_SYNC_EMBED_COLORS = {
  success: 0x57f287,
  partial: 0xfee75c,
  failed: 0xed4245,
} as const;
export const DISCORD_SELECT_MENU_MAX_OPTIONS = 25;
