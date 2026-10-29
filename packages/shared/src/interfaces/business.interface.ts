import type {
  ACTIVITY_ACTIONS,
  BUSINESS_PERMISSION_KEYS,
  DEVICE_ALERT_TYPES,
} from "../constants/business.constant";
import type { PlayingCard, PlayingCardWithDistance } from "./card.interface";
import type { CardCondition } from "./card-condition.interface";
import type { PriceSource } from "./price-source.interface";
import type { StatsRange } from "./stats.interface";

export interface BuylistTier {
  minPrice: number;
  percent: number;
}

export interface BuylistConfig {
  minCardValue: number;
  tiers: BuylistTier[];
  bulkThreshold: number;
  bulkOffer: number;
  creditBonusPercent: number;
}

export type BusinessPermissionKey = (typeof BUSINESS_PERMISSION_KEYS)[number];

export type BusinessPermissions = Record<BusinessPermissionKey, boolean>;

export interface BusinessSettings {
  buylist: BuylistConfig;
  permissions: BusinessPermissions;
}

export interface BusinessAccess {
  isLocked: boolean;
  canManageSettings: boolean;
  canViewCosts: boolean;
  canAcceptIntake: boolean;
  canFulfilOrders: boolean;
  canViewActivity: boolean;
  priceSource: PriceSource;
}

export interface BusinessSettingsResponse {
  settings: BusinessSettings;
  access: BusinessAccess;
}

export type IntakeLotStatus = "open" | "accepted" | "cancelled";

export type IntakePayoutMethod = "cash" | "credit";

export interface IntakeLot {
  guid: string;
  customerName: string;
  customerContact: string | null;
  notes: string | null;
  status: IntakeLotStatus;
  payoutMethod: IntakePayoutMethod | null;
  collectionGuid: string;
  collectionName: string;
  collectionGameGuid: string | null;
  collectionDeleted: boolean;
  ownsCollection: boolean;
  cardCount: number;
  marketTotal: number | null;
  cashOffer: number | null;
  creditOffer: number | null;
  paidTotal: number | null;
  createdAt: string;
  acceptedAt: string | null;
  closedAt: string | null;
  createdByName: string | null;
  closedByName: string | null;
}

export interface IntakeLotCard {
  scanId: string;
  card: PlayingCardWithDistance;
  isFoil: boolean;
  foilType: string | null;
  condition: CardCondition;
  scannedAt: string;
  marketPrice: number | null;
  offer: number | null;
  acquisitionCost: number | null;
  belowMinimum: boolean;
}

export interface IntakeLotDetail extends IntakeLot {
  cardsInSource: number;
  belowMinimumScanIds: string[];
}

export interface IntakeLotReceipt extends IntakeLotDetail {
  cards: IntakeLotCard[];
}

export type IntakeCollectionMode = "new" | "existing";

export interface IntakeNewCollectionInput {
  gameGuid: string;
  lang: string;
}

export interface IntakeReviewCard {
  scanId: string;
  collectionGuid: string;
  collectionName: string;
  card: PlayingCardWithDistance;
  isFoil: boolean;
  foilType: string | null;
  condition: CardCondition;
  language: string | null;
  lowConfidenceMatch: boolean;
  hasAlternatives: boolean;
  corrected: boolean;
  reviewed: boolean;
}

export interface IntakeReviewCardPage {
  cards: IntakeReviewCard[];
  total: number;
}

export interface IntakeCardNeighbor {
  scanId: string;
  collectionGuid: string;
}

export interface IntakeCardContext {
  card: IntakeReviewCard;
  index: number;
  total: number;
  previous: IntakeCardNeighbor | null;
  next: IntakeCardNeighbor | null;
}

export interface IntakeLotInput {
  collectionGuid?: string | null;
  newCollection?: IntakeNewCollectionInput | null;
  customerName: string;
  customerContact?: string | null;
  notes?: string | null;
}

export interface IntakeAcceptInput {
  payoutMethod: IntakePayoutMethod;
  totalOverride?: number | null;
}

export interface IntakeTransferInput {
  targetCollectionGuid?: string | null;
  newCollectionName?: string | null;
  deleteSource: boolean;
}

export interface IntakeTransferResult {
  moved: number;
  collectionGuid: string;
  sourceDeleted: boolean;
}

export interface IntakeCancelInput {
  removeCards: boolean;
}

export type OrderSource = "tcgplayer" | "shopify" | "generic";

export type FulfilmentOrderStatus = "open" | "fulfilled" | "cancelled";

export interface OrderLineInput {
  name: string;
  setCode?: string | null;
  setName?: string | null;
  collectorNumber?: string | null;
  condition?: CardCondition | null;
  isFoil?: boolean | null;
  quantity: number;
  unitPrice?: number | null;
  orderRef?: string | null;
}

export interface OrderImport {
  source: OrderSource;
  lines: OrderLineInput[];
  skipped: number;
}

export interface OrderLine extends OrderLineInput {
  allocations: string[];
  picked: string[];
}

export interface FulfilmentOrderInput {
  name: string;
  source: OrderSource;
  lines: OrderLineInput[];
}

export interface FulfilmentOrderUpdateInput {
  name: string;
  lines: OrderLineInput[];
  releasedScanIds?: string[];
}

export interface FulfilmentOrder {
  guid: string;
  name: string;
  source: OrderSource;
  status: FulfilmentOrderStatus;
  lineCount: number;
  quantity: number;
  allocated: number;
  picked: number;
  revenue: number | null;
  createdAt: string;
  closedAt: string | null;
  createdByName: string | null;
}

export interface PullSheetEntry {
  scanId: string;
  lineIndex: number;
  card: PlayingCard;
  isFoil: boolean;
  condition: CardCondition;
  collectionGuid: string;
  collectionName: string;
  binNumber: number | null;
  locationName: string | null;
  locationPosition: number | null;
  picked: boolean;
}

export interface FulfilmentOrderDetail extends FulfilmentOrder {
  lines: OrderLine[];
  pullSheet: PullSheetEntry[];
}

export interface OrderFulfilInput {
  scanIds: string[];
}

export type ActivityAction = (typeof ACTIVITY_ACTIONS)[number];

export interface ActivityEntry {
  guid: string;
  action: ActivityAction;
  userId: string | null;
  userName: string | null;
  summary: string | null;
  details: Record<string, unknown> | null;
  createdAt: string;
}

export interface ActivityPage {
  entries: ActivityEntry[];
  total: number;
  page: number;
  pageSize: number;
}

export interface StaffThroughputRow {
  userId: string;
  userName: string;
  scans: number;
  matched: number;
  unmatched: number;
  corrected: number;
  actions: number;
  lastScanAt: string | null;
}

export interface StaffReport {
  range: StatsRange;
  rows: StaffThroughputRow[];
}

export interface InventoryTotals {
  cardCount: number;
  marketValue: number;
  costBasis: number;
  costedCards: number;
  costedMarketValue: number;
}

export interface InventoryCollectionRow extends InventoryTotals {
  guid: string;
  name: string;
}

export interface InventorySnapshotPoint {
  day: string;
  cardCount: number;
  marketValue: number;
  costBasis: number;
}

export interface CollectionCostInput {
  total: number;
  mode: "spread" | "each";
  overwrite: boolean;
}

export interface CollectionCostResult {
  updated: number;
  skipped: number;
}

export interface CardAcquisitionCost {
  cost: number | null;
  currency: string;
}

export interface CardAcquisitionCostInput {
  cost: number | null;
}

export type DeviceAlertType = (typeof DEVICE_ALERT_TYPES)[number];

export interface DeviceAlert {
  guid: string;
  type: DeviceAlertType;
  title: string;
  description: string;
  deviceGuid: string | null;
  deviceName: string | null;
  createdAt: string;
}

export interface DeviceHealth {
  guid: string;
  name: string;
  isConnected: boolean;
  lastSeenAt: string | null;
  cardsSorted: number;
  cardsSinceService: number;
  maintenanceIntervalCards: number | null;
  lastServicedAt: string | null;
  serviceDue: boolean;
  recentAlerts: DeviceAlert[];
}

export interface FleetHealth {
  devices: DeviceHealth[];
  alerts: DeviceAlert[];
}

export interface DeviceMaintenanceInput {
  maintenanceIntervalCards: number | null;
}

export interface SorterAlertWebhookData {
  object: "sorter_alert";
  type: DeviceAlertType;
  title: string;
  description: string;
  sorter: { object: "sorter"; id: string; name: string } | null;
}

export type AccuracyCheckStatus = "open" | "completed";

export type AccuracySampleResult = "correct" | "incorrect";

export interface AccuracyEstimate {
  accuracy: number;
  low: number;
  high: number;
}

export interface AccuracyBatchStats {
  cardCount: number;
  corrected: number;
  lowConfidence: number;
  withAlternatives: number;
  reviewed: number;
  unmatched: number;
}

export interface AccuracyCheck {
  guid: string;
  collectionGuid: string;
  collectionName: string;
  intakeLotGuid: string | null;
  sampleSize: number;
  checked: number;
  incorrect: number;
  status: AccuracyCheckStatus;
  createdAt: string;
  completedAt: string | null;
  createdByName: string | null;
  estimate: AccuracyEstimate | null;
}

export interface AccuracyCheckSample {
  scanId: string;
  result: AccuracySampleResult | null;
  card: PlayingCardWithDistance | null;
  isFoil: boolean;
  condition: CardCondition;
  capturedImageUrl: string | null;
}

export interface AccuracyCheckDetail extends AccuracyCheck {
  samples: AccuracyCheckSample[];
}

export interface AccuracyReport {
  stats: AccuracyBatchStats;
  checks: AccuracyCheck[];
}

export interface AccuracyCheckInput {
  collectionGuid: string;
  intakeLotGuid?: string | null;
  sampleSize: number;
  unreviewedOnly: boolean;
}

export interface AccuracySampleInput {
  scanId: string;
  result: AccuracySampleResult | null;
}
