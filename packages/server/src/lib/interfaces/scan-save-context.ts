import type { BinFill } from "./collections";

export interface ScanSaveContextInput {
  orgId: string;
  collectionGuid: string;
  scanId: string;
  deviceGuid: string | undefined;
  binNumberToCheck: number | null;
}

export interface ScanSaveContextRow {
  collection_id: number;
  game_id: number | null;
  collection_name: string;
  collection_lang: string;
  game_key: string | null;
  game_name: string | null;
  scans_today: number;
  is_already_saved: boolean;
  scanned_by_device_id: number | null;
  open_intake_lot_id: number | null;
  bin_fill: BinFill | null;
  resorts_matching_cards: boolean | null;
}

export interface ScanSaveContext {
  collection: {
    id: number;
    gameId: number | null;
    name: string;
    lang: string;
    gameKey: string | null;
    gameName: string | null;
  };
  scansToday: number;
  isAlreadySaved: boolean;
  scannedByDeviceId: number | null;
  openIntakeLotId: number | null;
  binFill: BinFill | null;
  resortsMatchingCards: boolean;
}
