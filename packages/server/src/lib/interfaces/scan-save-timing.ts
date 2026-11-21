export type ScanSaveKind = "card" | "unmatched";

export type ScanSaveOutcome = "saved" | "rejected" | "failed";

export type ScanSaveStage =
  | "requestBodyRead"
  | "retryCheckDone"
  | "imagesStored"
  | "databaseConnectionAcquired"
  | "transactionCommitted";
