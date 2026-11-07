import type { HotkeyId } from "@/lib/interfaces/hotkeys";
import type { Icon } from "@tabler/icons-react";
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
}

export interface ValidateMatchesButtonProps {
  iconOnly?: boolean;
}

export interface MatchValidationScanTileProps {
  scan: MatchValidationScan;
}

export interface MatchValidationGuideItem {
  key: "correct" | "incorrect" | "badScan" | "skip";
  icon: Icon;
  hotkey: HotkeyId;
}

export interface MatchValidationGameFilterProps {
  gameKey: string | null;
}

export interface MatchValidationGameSelectProps {
  gameKey: string | null;
  onGameKeyChange: (gameKey: string | null) => void;
  className?: string;
}

export interface ReviewCountBarProps {
  label: string;
  reviewCount: number;
  scanCount: number;
  isTotal?: boolean;
}

export interface ScanThumbnailProps {
  scanId: string;
  alt: string;
}
