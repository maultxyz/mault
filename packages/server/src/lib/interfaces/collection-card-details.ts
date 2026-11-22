export interface CardScanOriginRow {
  userId: string | null;
  scannedAt: Date;
  deviceGuid: string | null;
  deviceName: string | null;
  deviceIsDeleted: boolean | null;
}
