import {
  IconAlertTriangle,
  IconBrandDiscord,
  IconChartBar,
  IconKey,
  IconLink,
  IconMoodSmile,
  IconPhotoCog,
  IconSettingsBolt,
} from "@tabler/icons-react";

export const DISCORD_BOT_COMMANDS = ["link", "stats"] as const;

export const DISCORD_BOT_FEATURE_ICONS = [
  IconPhotoCog,
  IconAlertTriangle,
  IconChartBar,
  IconMoodSmile,
] as const;

export const DISCORD_BOT_SETUP_STEP_ICONS = [IconBrandDiscord, IconKey, IconLink, IconSettingsBolt];
