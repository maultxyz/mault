import type { ReactNode } from "react";
import type { Control } from "react-hook-form";
import type {
  BuyPerformance,
  BuySourceType,
  BusinessSettingsDraftValues,
  CardPricing,
  CardReservationRequestGroup,
  FulfilmentOrder,
  FulfilmentOrderDetail,
  IntakeLot,
  IntakeLotCard,
  OrderLine,
  PickWalkEntry,
  PickWalkStop,
  SaleRow,
  UnmovedBuy,
} from "@magic-vault/shared";
import type { BUSINESS_TIPS_TOPICS, BUSINESS_VIEWS, SALES_RANGES } from "@/lib/constants/business";
import type { IconName } from "@/lib/interfaces/ui";

export type BusinessView = (typeof BUSINESS_VIEWS)[number];

export type SalesRange = (typeof SALES_RANGES)[number];

export interface SalesReportFilter {
  fromDay: string | null;
  buyGuid: string | null;
}

export interface SalesViewProps {
  buyGuid: string | null;
}

export interface SaleRowItemProps {
  sale: SaleRow;
  showProfit: boolean;
}

export interface BuyStartDefaults {
  sourceType: BuySourceType;
  collectionGuid: string;
  storageLocationGuid: string;
}

export interface BuyPerformanceSectionProps {
  buyGuid: string;
  performance: BuyPerformance;
}

export interface UnmovedBuysCalloutProps {
  buys: UnmovedBuy[];
}

export interface BusinessHubProps {
  onBack?: () => void;
}

export interface PickWalk {
  openOrders: FulfilmentOrderDetail[];
  closedOrderCount: number;
  entries: PickWalkEntry[];
  stops: PickWalkStop[];
  pickedScanIds: ReadonlySet<string>;
  pickedCount: number;
  nextEntry: PickWalkEntry | null;
  completedOrders: FulfilmentOrderDetail[];
  shortOrders: FulfilmentOrderDetail[];
  isLoading: boolean;
  isError: boolean;
  refetch: () => Promise<unknown>;
  setPicked: (scanIds: string[], isPicked: boolean) => void;
}

export interface BusinessOverviewViewProps {
  onOpenView: (view: BusinessView) => void;
}

export interface BusinessListViewProps {
  canAct: boolean;
}

export interface BusinessStatusFilterProps<T extends string> {
  statuses: readonly T[];
  value: T | null;
  onChange: (value: T | null) => void;
  labelOf: (status: T) => string;
}

export interface BusinessListSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}

export interface CardReservationGroupProps {
  group: CardReservationRequestGroup;
  onPress?: () => void;
}

export interface CardReservationRequestSectionProps {
  title: string;
  groups: CardReservationRequestGroup[];
  onPressGroup?: (group: CardReservationRequestGroup) => void;
}

export type MobileCardReservationTarget =
  | { kind: "request"; requestGuid: string }
  | { kind: "reservation"; reservationGuid: string };

export interface IntakeLotRowProps {
  lot: IntakeLot;
  onPress: () => void;
  onPressIn: () => void;
}

export interface IntakeLotCardRowProps {
  card: IntakeLotCard;
  onPress: () => void;
}

export interface OrderRowProps {
  order: FulfilmentOrder;
  onPress: () => void;
  onPressIn: () => void;
}

export interface OrderLineRowProps {
  line: OrderLine;
  pickedCount: number;
  isOpen: boolean;
  canAct: boolean;
  onFindSubstitute: () => void;
}

export interface PickWalkEntryRowProps {
  entry: PickWalkEntry;
  isPicked: boolean;
  showOrderName: boolean;
  canPick: boolean;
  onToggle: () => void;
  onMissing: () => void;
}

export interface PickWalkNextCardProps {
  entry: PickWalkEntry;
  showOrderName: boolean;
  canPick: boolean;
  onPicked: () => void;
  onMissing: () => void;
}

export interface BusinessSettingsDraft {
  control: Control<BusinessSettingsDraftValues>;
  canManage: boolean;
  hasBusinessTools: boolean;
  isLoading: boolean;
  isLoadError: boolean;
  isRetryingLoad: boolean;
  retryLoad: () => void;
  isDirty: boolean;
  isSaving: boolean;
  saveError: boolean;
  save: () => void;
  discard: () => void;
}

export interface BusinessSettingsFormProps {
  control: Control<BusinessSettingsDraftValues>;
  disabled: boolean;
}

export interface CardPricingSectionProps {
  pricing: CardPricing | undefined;
  isLoading: boolean;
  isLoadError: boolean;
  onRetryLoad: () => void;
  costField: ReactNode;
  canEditSellRule: boolean;
  onEditSellRule: () => void;
}

export interface CardSellPriceSheetProps {
  visible: boolean;
  pricing: CardPricing;
  onClose: () => void;
}

export interface ScanBuySheetProps {
  visible: boolean;
  buy: IntakeLot | null;
  onClose: () => void;
  onShowTips: () => void;
}

export type BusinessTipsTopic = (typeof BUSINESS_TIPS_TOPICS)[number];

export interface BusinessTip {
  key: string;
  icon: IconName;
}

export interface BusinessTipsSheetProps {
  topic: BusinessTipsTopic;
  visible: boolean;
  onClose: () => void;
}

export interface BusinessTipsButtonProps {
  onPress: () => void;
}

export interface BusinessTipsState {
  isOpen: boolean;
  open: () => void;
  close: () => void;
}

export interface ReservationRequestsAlertsProps {
  groups: CardReservationRequestGroup[];
  onOpenReservations: () => void;
}
