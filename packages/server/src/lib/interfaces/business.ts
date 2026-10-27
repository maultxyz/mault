import type {
  AccuracySampleResult,
  ActivityAction,
  DeviceAlertType,
} from "@magic-vault/shared";

export interface ActivityLogInput {
  orgId: string;
  userId: string | null;
  action: ActivityAction;
  summary?: string | null;
  details?: Record<string, unknown> | null;
}

export interface DeviceAlertInput {
  orgId: string;
  deviceGuid: string | null;
  type: DeviceAlertType;
  title: string;
  description: string;
  collectionGuid?: string;
}

export interface IntakeLotRow {
  id: number;
  guid: string | null;
  collectionId: number;
  ownsCollection: boolean;
  customerName: string;
  customerContact: string | null;
  notes: string | null;
  status: string;
  payoutMethod: string | null;
  marketTotal: number | null;
  cashOffer: number | null;
  creditOffer: number | null;
  paidTotal: number | null;
  cardCount: number | null;
  createdByUserId: string | null;
  closedByUserId: string | null;
  acceptedAt: Date | null;
  closedAt: Date | null;
  createdAt: Date;
  collectionGuid: string | null;
  collectionName: string;
  collectionDeleted: boolean;
  collectionGameGuid: string | null;
}

export interface PullSheetRow {
  scan_id: string;
  card: unknown;
  is_foil: boolean;
  condition: string;
  bin_number: number | null;
  location_position: number | null;
  collection_guid: string;
  collection_name: string;
  location_name: string | null;
}

export interface SoldCardRow {
  scan_id: string;
  card_id: string;
  name: string;
  set_code: string | null;
  collector_number: string | null;
  is_foil: boolean;
  condition: string;
  acquisition_cost: number | null;
  acquisition_currency: string | null;
  image_key: string | null;
  collection_guid: string;
  collection_name: string;
}

export interface InventoryRow {
  guid: string;
  name: string;
  card_count: number;
  market_value: number;
  cost_basis: number;
  costed_cards: number;
  costed_market_value: number;
}

export interface AcquisitionCostUpdate {
  orgId: string;
  currency: string;
  acquiredAt: Date;
  rows: { scanId: string; cost: number | null }[];
}

export type BusinessResult =
  | { success: true; data: unknown; message?: string }
  | { success: false; message: string; upgradeRequired?: boolean };

export interface StoredAccuracySample {
  scanId: string;
  result: AccuracySampleResult | null;
}
