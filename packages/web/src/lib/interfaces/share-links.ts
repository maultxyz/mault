import type { ShareLinkPurpose, StorageShareLinkInfo } from "@magic-vault/shared";
import type { ReactElement } from "react";

export interface CreatedShareLink {
  url: string;
  expiresAt: string;
}

export interface ShareLinkOptions {
  purpose: ShareLinkPurpose;
  expiresInDays: number;
  showPrices: boolean;
}

export interface ShareLinkDialogProps {
  title: string;
  description: string;
  trigger: ReactElement;
  revokedMessage: string;
  createLink: (options: ShareLinkOptions) => Promise<CreatedShareLink>;
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


