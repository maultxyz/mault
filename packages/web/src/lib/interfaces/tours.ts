import type { CalibrationSection } from "@/lib/interfaces/calibration";
import type { Step } from "react-joyride";

export type TourPage = "scanner" | "collections" | "bins";

export interface TourStepConfig {
  id: string;
  target: string;
  placement?: Step["placement"];
  titleKey: string;
  contentKey: string;
}

export interface OnboardingTourStepConfig extends TourStepConfig {
  page: TourPage;
}

export interface CalibrationTourStepConfig extends TourStepConfig {
  section: CalibrationSection;
}

export interface UseTourOptions {
  steps: Step[];
  completedKey: string;
  autoStart?: boolean;
  targetWaitTimeout?: number;
}

export interface TourHelpButtonProps {
  steps: Step[];
  completedKey: string;
  tooltip: string;
  className?: string;
}

export interface OnboardingContextValue {
  startTour: () => void;
}
