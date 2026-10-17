export type BulkImportStatus =
	| "idle"
	| "downloading"
	| "processing"
	| "completed"
	| "failed"
	| "cancelled";

export interface BulkImportProgress {
	status: BulkImportStatus;
	totalCards: number;
	skippedExisting: number;
	skippedNoImage: number;
	processed: number;
	failed: number;
	remaining: number;
	currentCard: string | null;
	error: string | null;
	startedAt: string | null;
	endedAt: string | null;
	cardsPerMinute: number;
}
