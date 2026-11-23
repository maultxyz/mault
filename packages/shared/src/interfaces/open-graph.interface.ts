import type {
  MARKETING_OPEN_GRAPH_PAGES,
  OPEN_GRAPH_STAT_ICONS,
  OPEN_GRAPH_THEMES,
} from "../constants/open-graph.constant";

export type OpenGraphTheme = (typeof OPEN_GRAPH_THEMES)[number];

export type OpenGraphStatIcon = (typeof OPEN_GRAPH_STAT_ICONS)[number];

export interface OpenGraphStat {
  icon: OpenGraphStatIcon;
  text: string;
}

export interface MarketingOpenGraphPage {
  eyebrow: string;
  headline: string;
  subtitle: string;
  stats: readonly OpenGraphStat[];
}

export type MarketingOpenGraphPageKey = keyof typeof MARKETING_OPEN_GRAPH_PAGES;
