import type { SelectToggleOptions } from "@/lib/interfaces/cards";
import type {
  BUSINESS_VIEWS,
  ORDER_DETAIL_VIEWS,
  PICK_IMPORT_CREATE_MODES,
  PICK_IMPORT_STEPS,
} from "@/lib/constants/business";
import type { CardListFile } from "@/lib/interfaces/card-list-import";
import type { UseCsvImportResult } from "@/lib/interfaces/csv-import";
import type { ClientPagination } from "@/lib/interfaces/pagination";
import type {
  BusinessSettingsDraftValues,
  PickImportFormValues,
} from "@/schemas/business.schema";
import type {
  AccuracyCheckStatus,
  DeviceHealth,
  FulfilmentOrder,
  FulfilmentOrderDetail,
  FulfilmentOrderStatus,
  IntakeLot,
  IntakeLotCard,
  IntakeLotStatus,
  ComposedCsvOrder,
  CsvOrderImportResult,
  CsvImportComposition,
  CardCondition,
  OrderLineInput,
  OrderSource,
  PlayingCardImage,
  PullSheetEntry,
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
  | "info"
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

export interface OrderListProps {
  orders: FulfilmentOrder[];
  pagination: ClientPagination<FulfilmentOrder>;
  selectedGuid: string | undefined;
  isLoading: boolean;
  onSelect: (guid: string) => void;
  checkedOrderGuids?: ReadonlySet<string>;
  onToggleOrderChecked?: (guid: string, options: SelectToggleOptions) => void;
}

export interface OrderSelectionBarProps {
  checkedOrders: FulfilmentOrder[];
  onClear: () => void;
  onOrdersDeleted: (orderGuids: string[]) => void;
  className?: string;
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

export type OrderDetailView = (typeof ORDER_DETAIL_VIEWS)[number];

export interface OrderBinsDialogProps {
  order: FulfilmentOrderDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export interface OrderPickByLocationProps {
  entries: PullSheetEntry[];
  orderBinOf: (entry: PullSheetEntry) => number | null;
  pickNameOf?: (entry: PullSheetEntry) => string;
  pickedScanIds: ReadonlySet<string>;
  canPick: boolean;
  onPickedChange: (scanIds: string[], isPicked: boolean) => void;
}

export interface OrderSubstituteDialogProps {
  order: FulfilmentOrderDetail;
  lineIndex: number | null;
  onOpenChange: (open: boolean) => void;
}

export interface OrderPickProgress {
  pickedScanIds: ReadonlySet<string>;
  changePicked: (scanIds: string[], isPicked: boolean) => void;
}

export interface OrderPhonePickDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderGuids: string[];
}

export interface OrderBatchPickProps {
  orderGuids: string[];
}

export interface PackingSlipRow {
  key: string;
  image: PlayingCardImage | null;
  name: string;
  setCode: string | null;
  collectorNumber: string | null;
  condition: CardCondition | null;
  isFoil: boolean;
  quantity: number;
  unitPrice: number | null;
}

export interface PackingSlipUnavailableLine {
  name: string;
  quantity: number;
}

export interface PackingSlipData {
  key: string;
  orderGuid: string;
  pickName: string;
  orderRef: string | null;
  date: string;
  rows: PackingSlipRow[];
  unavailable: PackingSlipUnavailableLine[];
}

export interface PackingSlipProps {
  slip: PackingSlipData;
  shopName: string;
  showsPrices: boolean;
}

export interface OrderRefLabelProps {
  orderRef: string | null;
  binNumber: number | null;
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

export type PickImportStep = (typeof PICK_IMPORT_STEPS)[number];
export type PickImportCreateMode = (typeof PICK_IMPORT_CREATE_MODES)[number];

export interface PickImportRequestOptions {
  orders: ComposedCsvOrder[];
  composition: CsvImportComposition;
  createMode: PickImportCreateMode;
  pickName: string;
  source: OrderSource;
  fallbackName: (index: number) => string;
  batchName: (count: number) => string;
}

export interface PickImportStepsProps {
  steps: PickImportStep[];
  current: PickImportStep;
}

export interface PickImportSourceProps {
  control: Control<PickImportFormValues>;
  onFileRead: (file: CardListFile) => void;
  summary: ReactNode;
}

export interface PickImportColumnsProps {
  csvImport: UseCsvImportResult;
}

export interface PickImportReviewProps {
  control: Control<PickImportFormValues>;
  csvImport: UseCsvImportResult;
  composed: CsvOrderImportResult | null;
  orders: ComposedCsvOrder[];
  plainListLines: OrderLineInput[];
}

export interface PickImportOrderRowProps {
  control: Control<PickImportFormValues>;
  order: ComposedCsvOrder;
  index: number;
  isNameEditable: boolean;
}

export interface PickImportChoiceOption<T extends string> {
  value: T;
  label: string;
  description: string;
  disabled?: boolean;
}

export interface PickImportChoiceProps<T extends string> {
  legend: string;
  value: T;
  onChange: (value: T) => void;
  options: PickImportChoiceOption<T>[];
}
