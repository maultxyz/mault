import type { MatchValidationScan } from "@magic-vault/shared";

export type MatchValidationView = "review" | "scans";

export interface ReviewProgressProps {
  reviewCount: number;
}

export interface MatchValidationSummaryProps {
  className?: string;
}

export interface MatchValidationProgressProps {
  className?: string;
  showsReviewCounts?: boolean;
}

export interface ValidateMatchesButtonProps {
  iconOnly?: boolean;
}

export interface MatchValidationScanTileProps {
  scan: MatchValidationScan;
}
