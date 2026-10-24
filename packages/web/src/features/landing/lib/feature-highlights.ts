import { DemoAlphabetSort } from "@/features/landing/components/demo-alphabet-sort";
import { DemoAutoAssign } from "@/features/landing/components/demo-auto-assign";
import { DemoBinDiagram } from "@/features/landing/components/demo-bin-diagram";
import { DemoCustomSounds } from "@/features/landing/components/demo-custom-sounds";
import { DemoIntake } from "@/features/landing/components/demo-intake";
import { DemoPicks } from "@/features/landing/components/demo-picks";
import { DemoPickList } from "@/features/landing/components/demo-pick-list";
import { DemoPricing } from "@/features/landing/components/demo-pricing";
import { DemoRecognitionPreview } from "@/features/landing/components/demo-recognition-preview";
import { DemoRepack } from "@/features/landing/components/demo-repack";
import { DemoRuleBuilder } from "@/features/landing/components/demo-rule-builder";
import { DemoStatsBreakdown } from "@/features/landing/components/demo-stats-breakdown";
import { DemoStorage } from "@/features/landing/components/demo-storage";
import type { LandingFeatureHighlight } from "@/lib/interfaces/landing";
import {
  IconArchive,
  IconCash,
  IconChartBar,
  IconCoin,
  IconCpu,
  IconFilter,
  IconListCheck,
  IconPackages,
  IconScan,
  IconSortAZ,
  IconTruckDelivery,
  IconVolume,
  IconWand,
} from "@tabler/icons-react";

export const LANDING_FEATURE_HIGHLIGHTS: LandingFeatureHighlight[] = [
  {
    key: "storage",
    icon: IconArchive,
    demo: DemoStorage,
    className: "md:col-span-2 lg:col-span-4",
    isNew: true,
  },
  {
    key: "recognition",
    icon: IconScan,
    demo: DemoRecognitionPreview,
    className: "lg:col-span-2",
  },
  {
    key: "intake",
    icon: IconCash,
    demo: DemoIntake,
    className: "lg:col-span-3",
    isNew: true,
  },
  {
    key: "picks",
    icon: IconTruckDelivery,
    demo: DemoPicks,
    className: "lg:col-span-3",
    isNew: true,
  },
  {
    key: "pickList",
    icon: IconListCheck,
    demo: DemoPickList,
    className: "lg:col-span-3",
    isNew: true,
  },
  {
    key: "rules",
    icon: IconFilter,
    demo: DemoRuleBuilder,
    className: "lg:col-span-3",
  },
  {
    key: "autoAssign",
    icon: IconWand,
    demo: DemoAutoAssign,
    className: "lg:col-span-2",
  },
  {
    key: "repack",
    icon: IconPackages,
    demo: DemoRepack,
    className: "lg:col-span-2",
  },
  {
    key: "alphabet",
    icon: IconSortAZ,
    demo: DemoAlphabetSort,
    className: "lg:col-span-2",
  },
  {
    key: "pricing",
    icon: IconCoin,
    demo: DemoPricing,
    className: "lg:col-span-3",
    isNew: true,
  },
  {
    key: "sounds",
    icon: IconVolume,
    demo: DemoCustomSounds,
    className: "lg:col-span-3",
  },
  {
    key: "insights",
    icon: IconChartBar,
    demo: DemoStatsBreakdown,
    className: "lg:col-span-3",
  },
  {
    key: "hardware",
    icon: IconCpu,
    demo: DemoBinDiagram,
    className: "lg:col-span-3",
  },
];
