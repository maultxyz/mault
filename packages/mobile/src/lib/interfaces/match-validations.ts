import type { MatchValidationQueueItem, MatchValidationScan, Result } from "@magic-vault/shared";
import type { IconName } from "@/lib/interfaces/ui";

export type MatchValidationView = "review" | "scans";

export type LabelQueueSkipped = "skipped";

export interface LabelQueueHistoryEntry<Decision extends string> {
  item: MatchValidationQueueItem;
  decision: Decision | LabelQueueSkipped;
}

export interface LabelQueueOptions<Decision extends string> {
  items: MatchValidationQueueItem[] | undefined;
  isFetchingQueue: boolean;
  queueFetchedAt: number;
  refetchQueue: () => unknown;
  saveLabel: (item: MatchValidationQueueItem, decision: Decision) => Promise<Result<null>>;
  saveErrorMessage: string;
}

export interface MatchValidationGuideItem {
  key: "correct" | "incorrect" | "badScan" | "skip";
  icon: IconName;
}

export interface MatchValidationGameFilterProps {
  gameKey: string | null;
}

export interface MatchValidationGuideSheetProps {
  visible: boolean;
  onClose: () => void;
}

export interface MatchValidationScanRowProps {
  scan: MatchValidationScan;
  authHeaders: Record<string, string> | undefined;
}

export interface ReviewProgressProps {
  reviewCount: number;
}
