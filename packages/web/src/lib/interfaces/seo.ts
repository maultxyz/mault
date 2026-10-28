import type { ComponentType } from "react";

export interface PageMeta {
  title: string;
  description: string;
  path: string;
  noIndex?: boolean;
}

export interface MarketingPageModule {
  default: ComponentType;
}

export interface MarketingRouteProps {
  path: string;
}
