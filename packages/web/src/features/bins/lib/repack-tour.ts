import { REPACK_TOUR_COMPLETED_KEY } from "@/lib/constants/storage-keys";
import type { Step } from "react-joyride";

export interface RepackTourStepConfig {
  id: string;
  target: string;
  placement?: Step["placement"];
  titleKey: string;
  contentKey: string;
}

export const REPACK_TOUR_STEPS: RepackTourStepConfig[] = [
  {
    id: "welcome",
    target: "body",
    placement: "center",
    titleKey: "repackTour.welcome.title",
    contentKey: "repackTour.welcome.content",
  },
  {
    id: "toggle",
    target: '[data-tour="repack-toggle"]',
    placement: "auto",
    titleKey: "repackTour.toggle.title",
    contentKey: "repackTour.toggle.content",
  },
  {
    id: "duplicates",
    target: '[data-tour="repack-duplicates"]',
    placement: "auto",
    titleKey: "repackTour.duplicates.title",
    contentKey: "repackTour.duplicates.content",
  },
  {
    id: "slots",
    target: '[data-tour="repack-slots"]',
    placement: "auto",
    titleKey: "repackTour.slots.title",
    contentKey: "repackTour.slots.content",
  },
  {
    id: "add-slot",
    target: '[data-tour="repack-add-slot"]',
    placement: "auto",
    titleKey: "repackTour.addSlot.title",
    contentKey: "repackTour.addSlot.content",
  },
  {
    id: "save",
    target: '[data-tour="repack-save"]',
    placement: "auto",
    titleKey: "repackTour.save.title",
    contentKey: "repackTour.save.content",
  },
  {
    id: "done",
    target: "body",
    placement: "center",
    titleKey: "repackTour.done.title",
    contentKey: "repackTour.done.content",
  },
];

export function isRepackTourCompleted(): boolean {
  try {
    return localStorage.getItem(REPACK_TOUR_COMPLETED_KEY) === "true";
  } catch {
    return true;
  }
}

export function markRepackTourCompleted(): void {
  try {
    localStorage.setItem(REPACK_TOUR_COMPLETED_KEY, "true");
  } catch {
    // Storage unavailable (private browsing, disabled cookies) - skip persisting.
  }
}
