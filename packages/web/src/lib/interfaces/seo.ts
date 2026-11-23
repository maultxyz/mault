import type { MarketingOpenGraphPageKey } from "@magic-vault/shared";
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

export type MarketingStructuredDataKind =
  | "softwareApplication"
  | "howTo"
  | "techArticle"
  | "softwareDownload"
  | "webPage";

export interface MarketingPageDefinition {
  path: string;
  namespace: string;
  metaPath: readonly string[];
  openGraphImageKey: MarketingOpenGraphPageKey;
  structuredDataKind: MarketingStructuredDataKind;
}
