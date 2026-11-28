import type { SelectToggleOptions } from "@/lib/interfaces/cards";
import type {
  BUSINESS_INVENTORY_COLUMNS,
  BUSINESS_OVERVIEW_VIEWS,
  BUSINESS_PAGE_VIEWS,
  BUSINESS_SALES_METRICS,
  BUSINESS_SECTION_VIEWS,
  PICK_IMPORT_CREATE_MODES,
  PICK_IMPORT_STEPS,
  SET_PRICES_TABS,
} from "@/lib/constants/business";
import type { CardListFile } from "@/lib/interfaces/card-list-import";
import type { UseCsvImportResult } from "@/lib/interfaces/csv-import";
import type { ClientPagination } from "@/lib/interfaces/pagination";
import type { PickImportFormValues } from "@/schemas/business.schema";
import type {
  BusinessOverview,
  BusinessSettingsDraftValues,
  AccuracyCheckStatus,
  DeviceHealth,
  FulfilmentOrder,
  FulfilmentOrderDetail,
  FulfilmentOrderStatus,
  IntakeLot,
  IntakeLotCard,
  IntakeLotStatus,
  InventoryMargin,
  SaleRow,
  SalesReport,
  ComposedCsvOrder,
  CsvOrderImportResult,
  CsvImportComposition,
  CardCondition,
  CardPricing,
  CardSellRule,
  OrderLineInput,
  OrderSource,
  PlayingCardImage,
  PickWalkEntry,
  PickWalkStop,
  PullSheetEntry,
  StatsRange,
  StatsReport,
} from "@magic-vault/shared";
import type { ComponentProps, ComponentType, ReactNode } from "react";
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

export interface SellPriceSettingsProps {
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
  search?: string;
  isFiltered?: boolean;
}

export interface BuyStartDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultCollectionGuid?: string;
  opensScannerAfterStart?: boolean;
}

export interface OpenBuyState {
  openBuy: IntakeLot | null;
  hasLoaded: boolean;
  canStartBuy: boolean;
}

export type ScannerBuyDialog =
  | { kind: "finish"; lot: IntakeLot }
  | { kind: "cancel"; lot: IntakeLot }
  | { kind: "remove"; lot: IntakeLot; scanIds: string[] }
  | { kind: "transfer"; lot: IntakeLot }
  | { kind: "start" };

export interface ScannerBuyStartBarProps {
  onStart: () => void;
}

export interface ScannerBuyFinished {
  guid: string;
  collectionGuid: string | undefined;
}

export interface ScannerBuyState extends OpenBuyState {
  collectionGuid: string | undefined;
  lot: IntakeLot | null;
  belowMinimumScanIds: string[];
  finishedBuyGuid: string | null;
  markFinished: (guid: string) => void;
  dismissFinished: () => void;
  dialog: ScannerBuyDialog | null;
  setDialog: (dialog: ScannerBuyDialog | null) => void;
}

export interface ScannerBuyOverviewProps {
  state: ScannerBuyState;
  editsOffers: boolean;
  onOpenDialog: (dialog: ScannerBuyDialog) => void;
  headingLevel?: "h2" | "h3";
  headerAction?: ReactNode;
}

export interface ScannerBuyRecentCardsProps {
  lot: IntakeLot;
  editsOffers: boolean;
}

export interface ScannerBuyFinishedSummaryProps {
  guid: string;
  onOpenDialog: (dialog: ScannerBuyDialog) => void;
  onDismiss: () => void;
}

export interface ScannerBuyDialogsProps {
  state: ScannerBuyState;
  onFinished?: () => void;
}

export interface MobileScannerBuyTriggerContext {
  openBuy: IntakeLot | null;
  canStartBuy: boolean;
  canFinish: boolean;
  openSheet: () => void;
  requestFinish: () => void;
  requestStart: () => void;
}

export interface MobileScanBuyRowProps {
  collectionGuid: string;
  isRunning: boolean;
  isRemoveModeActive: boolean;
}

export interface MobileScannerBuyProps {
  collectionGuid: string | undefined;
  renderTrigger: (context: MobileScannerBuyTriggerContext) => ReactNode;
}

export interface BuyStartMemory {
  collectionGuid: string;
  storageLocationGuid: string;
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

export interface BuyFinishDialogProps {
  lot: IntakeLot;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFinished: () => void;
}

export interface BuyPerformanceSectionProps {
  lot: IntakeLot;
}

export interface SalesReportFilters {
  from: string;
  to: string;
  buyGuid: string | null;
}

export interface SalesReportListProps {
  report: SalesReport;
  showsCosts: boolean;
}

export interface SalesReportBodyProps {
  filters: SalesReportFilters;
}

export interface SaleMoneyProps {
  value: number | null;
  currency: string;
}

export interface SaleRowProps {
  sale: SaleRow;
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
  search?: string;
  isFiltered?: boolean;
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

export interface OrderBinsDialogProps {
  order: FulfilmentOrderDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export interface PickWalkNextUpProps {
  entry: PickWalkEntry;
  showOrderName: boolean;
  canPick: boolean;
  isReleasing?: boolean;
  onPicked: () => void;
  onMissing: () => void;
}

export interface PickWalkStopListProps {
  entries: PickWalkEntry[];
  pickedScanIds: ReadonlySet<string>;
  canPick: boolean;
  showOrderName: boolean;
  headingLevel?: "h2" | "h3";
  onToggle: (scanId: string, isPicked: boolean) => void;
  onMissing?: (scanId: string) => void;
  onSorterPick?: (stop: PickWalkStop) => void;
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

export interface PickReservationPromptProps {
  requestGuids: string[];
  onClose: () => void;
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

export type BatchPickView = "list" | "pick" | "focus" | "box" | "sort";

export type PickWalkWorkspaceView = BatchPickView | "lines";

export interface PickWalkWorkspaceLinesView {
  label: string;
  content: ReactNode;
}

export interface PickWalkWorkspaceProps {
  orders: FulfilmentOrderDetail[];
  pickedScanIds: ReadonlySet<string>;
  onPickedChange: (scanIds: string[], isPicked: boolean) => void;
  canPick: boolean;
  completedCount: number;
  completeLabel?: string;
  isCompleting: boolean;
  onComplete: () => void;
  headingLevel?: "h2" | "h3";
  isProgressSticky?: boolean;
  linesView?: PickWalkWorkspaceLinesView;
  showsCompleteBelowCards?: boolean;
}

export interface PickFocusViewProps {
  entries: PickWalkEntry[];
  pickedScanIds: ReadonlySet<string>;
  complete: boolean;
  showOrderName: boolean;
  canPick: boolean;
  isReleasing: boolean;
  onPick: (scanId: string) => void;
  onUnpick: (scanId: string) => void;
  onMissing: (entry: PickWalkEntry) => void;
  onComplete: () => void;
  completedCount: number;
  completeLabel?: string;
}

export interface PickContainerViewProps {
  stops: PickWalkStop[];
  pickedScanIds: ReadonlySet<string>;
  canPick: boolean;
  onToggle: (scanId: string, isPicked: boolean) => void;
  onSorterPick?: (stop: PickWalkStop) => void;
}

export interface PickSorterPickDialogProps {
  stop: PickWalkStop | null;
  orders: FulfilmentOrderDetail[];
  onOpenChange: (open: boolean) => void;
}

export interface PickSortGroup {
  key: string;
  orderGuid: string;
  orderName: string;
  orderRef: string | null;
  binNumber: number | null;
  picked: PickWalkEntry[];
  total: number;
}

export interface PickSortViewProps {
  groups: PickSortGroup[];
  canPick: boolean;
  onUnpick: (scanId: string) => void;
}

export interface PackingSlipProps {
  slip: PackingSlipData;
  shopName: string;
  showsPrices: boolean;
  showsImages: boolean;
  logoUrl: string | null;
}

export interface OrderRefLabelProps {
  orderRef: string | null;
  binNumber: number | null;
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

export type BusinessView = (typeof BUSINESS_SECTION_VIEWS)[number];

export type BusinessOverviewView = (typeof BUSINESS_OVERVIEW_VIEWS)[number];

export type BusinessPageView = (typeof BUSINESS_PAGE_VIEWS)[number];

export interface BusinessPageHeaderProps {
  view: BusinessPageView;
  description: string;
  actions?: ReactNode;
  children?: ReactNode;
}
export type BusinessSalesMetric = (typeof BUSINESS_SALES_METRICS)[number];
export type BusinessInventoryColumn = (typeof BUSINESS_INVENTORY_COLUMNS)[number];

export interface SetPricesActionProps {
  scanIds: string[];
  buttonClassName?: string;
}

export interface SetPricesDialogProps {
  scanIds: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tabs: readonly SetPricesTab[];
  initialTab?: SetPricesTab;
  sellRule?: CardSellRule;
}

export interface SetPricesFormsProps {
  scanIds: string[];
  tabs: readonly SetPricesTab[];
  initialTab?: SetPricesTab;
  sellRule?: CardSellRule;
  onDone: () => void;
}

export type SetPricesTab = (typeof SET_PRICES_TABS)[number];

export interface SetPricesTabFormProps {
  scanIds: string[];
  sellRule?: CardSellRule;
  onDone: () => void;
}

export interface CardPricingPanelProps {
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  title: string;
  children: ReactNode;
}

export interface CardPricingBlockProps {
  pricing: CardPricing;
  cost: number | null;
  costError?: string;
  onCostChange: (cost: number) => void;
}

export interface BusinessStatusFilterProps<T extends string> {
  statuses: readonly T[];
  value: T | null;
  onChange: (value: T | null) => void;
  labelOf: (status: T) => string;
}

export interface BusinessListFiltersProps {
  search: ReactNode;
  filter: ReactNode;
}

export interface BusinessOverviewBodyProps {
  overview: BusinessOverview;
}

export interface BusinessSalesChartProps {
  sales: BusinessOverview["sales"];
}

export interface BusinessInventoryValueChartProps {
  report: StatsReport;
}

export interface BusinessInventoryCostsProps {
  report: StatsReport;
  margin: InventoryMargin | null;
}

export interface BusinessOverviewListPanelProps {
  heading: string;
  description: string;
  to: string;
  linkLabel: string;
  emptyText: string;
  children?: ReactNode;
}

export interface BusinessOverviewRowProps {
  to: string;
  title: string;
  detail?: string;
  description?: string;
  icon?: ComponentType<{ className?: string }>;
}

export interface OrdersWorkspaceProps {
  mobileBackToOverview: ReactNode;
}

export interface IntakeCardDetailProps {
  lot: IntakeLot;
  scanId: string;
  reviewMode: boolean;
  onNavigate: (scanId: string) => void;
  onShowReviewGrid: () => void;
  onClose: () => void;
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
