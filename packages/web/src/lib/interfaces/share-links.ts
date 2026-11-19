import type {
  OrgShareLink,
  ShareLinkPurpose,
  StorageShareLinkInfo,
  CardShareLinkInfo,
  SharedCardLink,
} from "@magic-vault/shared";
import type { MonitorLinkFormValues } from "@/schemas/monitor-link.schema";
import type { Button } from "@/components/ui/button";
import type { ComponentProps, ReactElement, ReactNode } from "react";
import type { UseFormReturn } from "react-hook-form";

export interface CreatedShareLink {
  guid: string;
  url: string;
  expiresAt: string;
}

export interface ShareLinkOptions {
  purpose: ShareLinkPurpose;
  expiresInDays: number;
  showPrices: boolean;
  requireGuestContact: boolean;
}

export interface ShareLinkDialogProps {
  subjectGuid: string;
  title: string;
  description: string;
  renderTrigger?: (activeLinkCount: number) => ReactElement;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  revokedMessage: string;
  createLink: (options: ShareLinkOptions) => Promise<CreatedShareLink>;
  revokeLinks: () => Promise<void>;
  sharedCardsCollectionGuid?: string;
  startsWithNewTradeLink?: boolean;
}

export interface ShareStorageLinkDialogProps {
  locationGuid: string;
  renderTrigger?: (activeLinkCount: number) => ReactElement;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  startsWithNewTradeLink?: boolean;
}

export interface SharedCardLinkListProps {
  collectionGuid: string;
}

export interface SharedCardLinkRowProps {
  link: SharedCardLink;
  isRevoking: boolean;
  onCopy: (link: SharedCardLink) => void;
  onRevoke: (link: SharedCardLink) => void;
}

export type ShareLinkDialogTab = "links" | "cards";

export type SharedCardLinkState =
  | { status: "checking" }
  | { status: "invalid" }
  | { status: "failed" }
  | { status: "valid"; info: CardShareLinkInfo };

export type ShareLinkTriggerButtonProps = ComponentProps<typeof Button> & {
  label: string;
  activeLinkCount: number;
  showsTitle?: boolean;
};

export type SharedStorageLinkState =
  | { status: "checking" }
  | { status: "invalid" }
  | { status: "failed" }
  | { status: "valid"; info: StorageShareLinkInfo };

export type ShareLinkCheckStatus = "checking" | "invalid" | "failed";

export interface ShareLinkStatusScreenProps {
  status: ShareLinkCheckStatus;
  invalidTitle: string;
  invalidDescription: string;
  onRetry: () => void;
}



export interface ShareLinkQrProps {
  url: string;
  expiresAt: string;
}

export interface ShareLinkRowProps {
  link: OrgShareLink;
  isRevoking: boolean;
  onShowQr: (link: OrgShareLink) => void;
  onRevoke: (link: OrgShareLink) => void;
}

export interface ShareLinkDetailsData {
  guid: string;
  url: string;
  expiresAt: string;
  purpose: ShareLinkPurpose;
  showsPrices: boolean;
}

export interface ShareLinkDetailsProps {
  details: ShareLinkDetailsData;
}

export interface ShareLinkFormProps {
  formId: string;
  form: UseFormReturn<MonitorLinkFormValues>;
  onSubmit: (values: MonitorLinkFormValues) => Promise<void>;
}

export type ShareLinkDialogView = "links" | "new" | "link";

export interface ShareLinkListProps {
  subjectGuid: string;
  onShowQr: (link: OrgShareLink) => void;
  emptyAction?: ReactNode;
}
