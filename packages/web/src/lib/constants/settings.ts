import {
  IconAdjustments,
  IconBrandDiscord,
  IconBuilding,
  IconBuildingStore,
  IconCreditCard,
  IconCurrencyDollar,
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
  pricing: "/app/settings/pricing",
  business: "/app/settings/business",
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
  { path: "pricing", icon: IconCurrencyDollar, labelKey: "sections.pricing" },
  { path: "business", icon: IconBuildingStore, labelKey: "sections.business" },
  { path: "sounds", icon: IconVolume, labelKey: "sections.sounds" },
  {
    path: "notifications",
    icon: IconBrandDiscord,
    labelKey: "sections.notifications",
  },
  { path: "integrations", icon: IconPlug, labelKey: "sections.integrations" },
] as const;

export const BILLING_RETURN_PARAM = "billing";
