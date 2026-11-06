import type { MatchValidationScan } from "@magic-vault/shared";

export type MatchValidationView = "review" | "scans";

export interface ReviewProgressProps {
  reviewCount: number;
}

export interface MatchValidationProgressProps {
  className?: string;
}

export interface ValidateMatchesButtonProps {
  iconOnly?: boolean;
}

export interface MatchValidationScanTileProps {
  scan: MatchValidationScan;
}
