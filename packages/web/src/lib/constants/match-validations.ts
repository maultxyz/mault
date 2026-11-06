import type { MatchValidationView } from "@/lib/interfaces/match-validations";
import type { MatchValidationStatus } from "@magic-vault/shared";

export const MATCH_VALIDATIONS_PATH = "/app/validate-matches";

export const MATCH_VALIDATION_VIEW_PARAM = "view";
export const MATCH_VALIDATION_REVIEW_VIEW: MatchValidationView = "review";
export const MATCH_VALIDATION_VIEWS: MatchValidationView[] = ["review", "scans"];

export const MATCH_VALIDATION_SCANS_PAGE_SIZE = 24;

export const MATCH_VALIDATION_STATUS_BADGE_VARIANTS: Record<
  MatchValidationStatus,
  "outline" | "success" | "destructive" | "warning" | "info"
> = {
  inProgress: "outline",
  correct: "success",
  incorrect: "destructive",
  badScan: "warning",
  disputed: "info",
};
