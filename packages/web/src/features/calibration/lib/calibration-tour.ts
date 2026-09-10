import type { CalibrationSection } from "@/features/calibration/types";
import { CALIBRATION_TOUR_COMPLETED_KEY } from "@/lib/constants/storage-keys";
import type { Step } from "react-joyride";

export interface CalibrationTourStepConfig {
  id: string;
  section: CalibrationSection;
  target: string;
  placement?: Step["placement"];
  titleKey: string;
  contentKey: string;
}

export const CALIBRATION_TOUR_STEPS: CalibrationTourStepConfig[] = [
  {
    id: "welcome",
    section: "modules",
    target: "body",
    placement: "center",
    titleKey: "calibrationTour.welcome.title",
    contentKey: "calibrationTour.welcome.content",
  },
  {
    id: "sections",
    section: "modules",
    target: '[data-tour="calibration-sections"]',
    placement: "auto",
    titleKey: "calibrationTour.sections.title",
    contentKey: "calibrationTour.sections.content",
  },
  {
    id: "connect",
    section: "modules",
    target: '[data-tour="calibration-connect"]',
    placement: "auto",
    titleKey: "calibrationTour.connect.title",
    contentKey: "calibrationTour.connect.content",
  },
  {
    id: "channel-layout",
    section: "modules",
    target: '[data-tour="channel-layout"]',
    placement: "auto",
    titleKey: "calibrationTour.channelLayout.title",
    contentKey: "calibrationTour.channelLayout.content",
  },
  {
    id: "module-count",
    section: "modules",
    target: '[data-tour="module-count"]',
    placement: "auto",
    titleKey: "calibrationTour.moduleCount.title",
    contentKey: "calibrationTour.moduleCount.content",
  },
  {
    id: "bin-routing",
    section: "modules",
    target: '[data-tour="bin-routing-assignment"]',
    placement: "auto",
    titleKey: "calibrationTour.binRouting.title",
    contentKey: "calibrationTour.binRouting.content",
  },
  {
    id: "ir-sensor",
    section: "modules",
    target: '[data-tour="ir-sensor-panel"]',
    placement: "auto",
    titleKey: "calibrationTour.irSensor.title",
    contentKey: "calibrationTour.irSensor.content",
  },
  {
    id: "bin-routing-controls",
    section: "modules",
    target: '[data-tour="bin-routing-controls"]',
    placement: "auto",
    titleKey: "calibrationTour.binRoutingControls.title",
    contentKey: "calibrationTour.binRoutingControls.content",
  },
  {
    id: "scan-region",
    section: "scanRegion",
    target: '[data-tour="scan-region-panel"]',
    placement: "auto",
    titleKey: "calibrationTour.scanRegion.title",
    contentKey: "calibrationTour.scanRegion.content",
  },
  {
    id: "feeder",
    section: "calibration",
    target: '[data-tour="feeder-calibration-panel"]',
    placement: "auto",
    titleKey: "calibrationTour.feeder.title",
    contentKey: "calibrationTour.feeder.content",
  },
  {
    id: "module-calibration",
    section: "calibration",
    target: '[data-tour="module-calibration-grid"]',
    placement: "auto",
    titleKey: "calibrationTour.moduleCalibration.title",
    contentKey: "calibrationTour.moduleCalibration.content",
  },
  {
    id: "done",
    section: "calibration",
    target: "body",
    placement: "center",
    titleKey: "calibrationTour.done.title",
    contentKey: "calibrationTour.done.content",
  },
];

export function isCalibrationTourCompleted(): boolean {
  try {
    return localStorage.getItem(CALIBRATION_TOUR_COMPLETED_KEY) === "true";
  } catch {
    return true;
  }
}

export function markCalibrationTourCompleted(): void {
  try {
    localStorage.setItem(CALIBRATION_TOUR_COMPLETED_KEY, "true");
  } catch {
    // Storage unavailable (private browsing, disabled cookies) - skip persisting.
  }
}
