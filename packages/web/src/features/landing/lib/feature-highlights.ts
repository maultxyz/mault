import { DemoCollectionValue } from "@/features/landing/components/demo-collection-value";
import { DemoIntake } from "@/features/landing/components/demo-intake";
import { DemoRuleBuilder } from "@/features/landing/components/demo-rule-builder";
import { DemoStorage } from "@/features/landing/components/demo-storage";
import type {
  LandingFeatureGroup,
  LandingFeatureSpotlight,
} from "@/lib/interfaces/landing";
import {
  IconApi,
  IconArchive,
  IconArrowsShuffle,
  IconArrowsSort,
  IconArrowsSplit2,
  IconBellRinging,
  IconBrandDiscord,
  IconBroadcast,
  IconBuildingStore,
  IconCash,
  IconChartBar,
  IconCoin,
  IconCpu,
  IconFilter,
  IconLanguage,
  IconLayoutGrid,
  IconListCheck,
  IconListSearch,
  IconLock,
  IconPackages,
  IconPlugConnected,
  IconScan,
  IconSortAZ,
  IconTextRecognition,
  IconTruckDelivery,
  IconUsers,
  IconVolume,
  IconWand,
} from "@tabler/icons-react";

export const LANDING_FEATURE_SPOTLIGHTS: LandingFeatureSpotlight[] = [
  {
    key: "rules",
    icon: IconFilter,
    demo: DemoRuleBuilder,
    isInteractive: true,
  },
  {
    key: "storage",
    icon: IconArchive,
    demo: DemoStorage,
    isInteractive: true,
    isFullWidth: true,
    isNew: true,
  },
  { key: "intake", icon: IconCash, demo: DemoIntake, isNew: true },
  { key: "insights", icon: IconChartBar, demo: DemoCollectionValue },
];

export const LANDING_FEATURE_GROUPS: LandingFeatureGroup[] = [
  {
    key: "sorting",
    icon: IconArrowsSort,
    items: [
      { key: "recognition", icon: IconScan },
      { key: "ocr", icon: IconTextRecognition },
      { key: "autoAssign", icon: IconWand },
      { key: "alphabet", icon: IconSortAZ },
      { key: "repack", icon: IconPackages },
      { key: "pickList", icon: IconListCheck },
      { key: "chaos", icon: IconArrowsShuffle },
    ],
  },
  {
    key: "stores",
    icon: IconBuildingStore,
    items: [
      { key: "picks", icon: IconTruckDelivery },
      { key: "pricing", icon: IconCoin },
      { key: "accuracy", icon: IconListSearch },
      { key: "staff", icon: IconUsers },
      { key: "permissions", icon: IconLock },
      { key: "api", icon: IconApi },
      { key: "fleet", icon: IconBellRinging },
    ],
  },
  {
    key: "setup",
    icon: IconPlugConnected,
    items: [
      { key: "hardware", icon: IconCpu },
      { key: "stations", icon: IconLayoutGrid },
      { key: "overflow", icon: IconArrowsSplit2 },
      { key: "languages", icon: IconLanguage },
      { key: "monitor", icon: IconBroadcast },
      { key: "discord", icon: IconBrandDiscord },
      { key: "sounds", icon: IconVolume },
    ],
  },
];
