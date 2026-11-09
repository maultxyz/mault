import type { SharedStorageCard, StorageShareLinkInfo } from "@magic-vault/shared";
import type { ReactElement } from "react";

export interface CreatedShareLink {
  url: string;
  expiresAt: string;
}

export interface ShareLinkDialogProps {
  title: string;
  description: string;
  trigger: ReactElement;
  revokedMessage: string;
  createLink: (expiresInDays: number, showPrices: boolean) => Promise<CreatedShareLink>;
  revokeLinks: () => Promise<void>;
}

export interface ShareStorageLinkDialogProps {
  locationGuid: string;
  trigger: ReactElement;
}

export type SharedStorageLinkState =
  | { status: "checking" }
  | { status: "invalid" }
  | { status: "valid"; info: StorageShareLinkInfo };

export interface SharedStorageCardTileProps {
  entry: SharedStorageCard;
}

export interface SharedStorageCardsProps {
  token: string;
  cardCount: number;
}
