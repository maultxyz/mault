export type BulkImportStatus =
	| "idle"
	| "downloading"
	| "processing"
	| "completed"
	| "failed"
	| "cancelled";
