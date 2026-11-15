export const NOTIFICATION_TEST_TYPES = [
  "sorter-error",
  "feeder-empty",
  "card-jam",
  "card-search-error",
  "sync-failure",
] as const;

export const ROLE_PICKERS = {
  "scan-role": { field: "scanRoleId", titleKey: "settings.discord.channelSettings.scanRole" },
  "error-role": { field: "errorRoleId", titleKey: "settings.discord.channelSettings.errorRole" },
  "trade-role": { field: "tradeRoleId", titleKey: "settings.discord.channelSettings.tradeRole" },
} as const;
