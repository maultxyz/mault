import type { PublicCardGame } from "@magic-vault/shared";

export type SharePreviewLinkKind = "collection" | "storage" | "card" | "shopCatalog";

export interface SharePreviewRequest {
  kind: SharePreviewLinkKind;
  subjectGuid: string;
  token: string | null;
  pathWithQuery: string;
}

export interface SharePreviewImage {
  url: string;
  alt: string;
  width: number | null;
  height: number | null;
}

export interface SharePreview {
  title: string;
  description: string;
  pathWithQuery: string;
  isIndexable: boolean;
  image: SharePreviewImage | null;
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
