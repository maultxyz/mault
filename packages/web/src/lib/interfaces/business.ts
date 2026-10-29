import type { BUSINESS_VIEWS } from "@/lib/constants/business";
import type { ClientPagination } from "@/lib/interfaces/pagination";
import type { BusinessSettingsDraftValues } from "@/schemas/business.schema";
import type {
  AccuracyCheckStatus,
  DeviceHealth,
  FulfilmentOrder,
  FulfilmentOrderDetail,
  FulfilmentOrderStatus,
  IntakeLot,
  IntakeLotCard,
  IntakeLotStatus,
  StatsRange,
} from "@magic-vault/shared";
import type { ComponentProps, ReactNode } from "react";
import type { Control } from "react-hook-form";

export type BusinessStatus =
  | IntakeLotStatus
  | FulfilmentOrderStatus
  | AccuracyCheckStatus;

export type BusinessBadgeVariant =
  | "success"
  | "secondary"
  | "outline"
  | "destructive";

export interface NumberInputProps extends Omit<
  ComponentProps<"input">,
  "value" | "onChange" | "type"
> {
  value: number | null | undefined;
  onChange: (value: number) => void;
}

export interface BuylistSettingsProps {
  control: Control<BusinessSettingsDraftValues>;
  disabled: boolean;
}

export interface BusinessPermissionsSettingsProps {
  control: Control<BusinessSettingsDraftValues>;
  disabled: boolean;
}

export interface StatusBadgeProps {
  status: BusinessStatus;
}

export interface IntakeLotListProps {
  lots: IntakeLot[];
  pagination: ClientPagination<IntakeLot>;
  selectedGuid: string | undefined;
  isLoading: boolean;
  onSelect: (guid: string) => void;
}

export interface IntakeLotDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (guid: string) => void;
}

export interface IntakeLotDetailProps {
  guid: string;
  onDeleted: () => void;
  onOpenCard: (scanId: string, review: boolean) => void;
  onOpenReviewGrid: () => void;
}

export interface IntakeOfferEditorProps {
  card: IntakeLotCard;
}

export interface IntakeAcceptDialogProps {
  lot: IntakeLot;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAccepted: () => void;
}

export interface IntakeTransferDialogProps {
  lot: IntakeLot;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export interface IntakeCancelDialogProps {
  lot: IntakeLot;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  isPending?: boolean;
  destructive?: boolean;
  onConfirm: () => void;
}

export interface OrderListProps {
  orders: FulfilmentOrder[];
  pagination: ClientPagination<FulfilmentOrder>;
  selectedGuid: string | undefined;
  isLoading: boolean;
  onSelect: (guid: string) => void;
}

export interface OrderImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (guid: string) => void;
}

export interface OrderEditDialogProps {
  order: FulfilmentOrderDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export interface OrderDetailProps {
  guid: string;
  onDeleted: () => void;
}

export interface CollectionCostDialogProps {
  collection: CollectionCostTarget | null;
  onOpenChange: (open: boolean) => void;
}

export interface StaffReportViewProps {
  range: StatsRange;
  onRangeChange: (range: StatsRange) => void;
}

export interface AccuracyReportViewProps {
  collectionGuid: string | null;
  checkGuid: string | null;
  onCollectionChange: (guid: string) => void;
  onCheckChange: (guid: string | null) => void;
}

export interface StartCheckDialogProps {
  collectionGuid: string;
  collectionName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStarted: (guid: string) => void;
}

export interface SpotCheckRunnerProps {
  guid: string;
  onClose: () => void;
}

export interface ServiceIntervalDialogProps {
  device: DeviceHealth | null;
  onOpenChange: (open: boolean) => void;
}

export type BusinessView = (typeof BUSINESS_VIEWS)[number];

export interface BusinessViewSwitchProps {
  value: BusinessView;
}

export interface OrdersWorkspaceProps {
  switcher: ReactNode;
}

export interface IntakeCardDetailProps {
  lot: IntakeLot;
  scanId: string;
  reviewMode: boolean;
  onNavigate: (scanId: string) => void;
  onShowReviewGrid: () => void;
  onClose: () => void;
}

export interface CollectionCostTarget {
  guid: string;
  name: string;
}
