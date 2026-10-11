import {
  IconAdjustments,
  IconBell,
  IconBuilding,
  IconCreditCard,
  IconPlug,
  IconScan,
  IconVolume,
} from "@tabler/icons-react";

export const SETTINGS_PATHS = {
  root: "/app/settings",
  general: "/app/settings/general",
  organization: "/app/settings/organization",
  billing: "/app/settings/billing",
  scanning: "/app/settings/scanning",
  sounds: "/app/settings/sounds",
  notifications: "/app/settings/notifications",
  integrations: "/app/settings/integrations",
} as const;

export const SETTINGS_SECTIONS = [
  { path: "general", icon: IconAdjustments, labelKey: "sections.general" },
  {
    path: "organization",
    icon: IconBuilding,
    labelKey: "sections.organization",
  },
  {
    path: "billing",
    icon: IconCreditCard,
    labelKey: "sections.billing",
    hostedOnly: true,
  },
  { path: "scanning", icon: IconScan, labelKey: "sections.scanning" },
  { path: "sounds", icon: IconVolume, labelKey: "sections.sounds" },
  {
    path: "notifications",
    icon: IconBell,
    labelKey: "sections.notifications",
  },
  { path: "integrations", icon: IconPlug, labelKey: "sections.integrations" },
] as const;

export const BILLING_RETURN_PARAM = "billing";
