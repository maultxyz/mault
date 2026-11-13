import type { MatchValidationStatus } from "@magic-vault/shared";
import type { MatchValidationGuideItem, MatchValidationView } from "@/lib/interfaces/match-validations";
import type { PillProps } from "@/lib/interfaces/ui";

export const MATCH_VALIDATION_VIEWS: readonly MatchValidationView[] = ["review", "scans"];
export const MATCH_VALIDATION_ALL_GAMES = "";
export const MATCH_VALIDATION_SCANS_PAGE_SIZE = 24;
export const MATCH_VALIDATION_THUMBNAIL_WIDTH = 56;
export const TOP_BAR_PROGRESS_WIDTH = 20;
export const LABEL_QUEUE_REFILL_THRESHOLD = 10;
export const LABEL_QUEUE_PREFETCH_COUNT = 3;

export const MATCH_VALIDATION_STATUS_TONES: Record<MatchValidationStatus, NonNullable<PillProps["tone"]>> = {
  inProgress: "neutral",
  correct: "success",
  incorrect: "destructive",
  badScan: "warning",
  disputed: "info",
};

export const MATCH_VALIDATION_GUIDE_ITEMS: readonly MatchValidationGuideItem[] = [
  { key: "correct", icon: "check" },
  { key: "incorrect", icon: "close" },
  { key: "badScan", icon: "trash" },
  { key: "skip", icon: "arrowRight" },
];
