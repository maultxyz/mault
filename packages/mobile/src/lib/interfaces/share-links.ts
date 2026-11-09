export type ShareLinkKind = "collection" | "storage";

export interface CreatedShareLink {
  url: string;
  expiresAt: string;
}
