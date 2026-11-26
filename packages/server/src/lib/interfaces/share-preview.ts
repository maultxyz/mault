import type { PublicCardGame } from "@magic-vault/shared";
import type { OpenGraphImageContent } from "./open-graph-image";

export type SharePreviewLinkKind = "collection" | "storage" | "card" | "shopCatalog" | "profile";

export interface SharePreviewRequest {
  kind: SharePreviewLinkKind;
  subjectKey: string;
  token: string | null;
  pathWithQuery: string;
}

export interface SharePreview {
  title: string;
  description: string;
  pathWithQuery: string;
  isIndexable: boolean;
  openGraphImage: OpenGraphImageContent | null;
  itemCount: number | null;
  topics: string[];
}

export interface SharePreviewCardSummary {
  name: string;
  setName: string | null;
  collectorNumber: string | null;
  condition: string | null;
  isFoil: boolean;
  foilType: string | null;
  formattedPrice: string | null;
}

export interface SharePreviewListSummary {
  subjectName: string;
  cardCount: number;
  games: PublicCardGame[];
  isTradeLink: boolean;
}

export interface SharePreviewCardArt {
  name: string;
  imageUrl: string;
}
