import { SORTING_RULES_PATH } from "@/lib/constants/bins";
import { ACTIVE_STATION_SCOPE } from "@/lib/constants/tours";
import type {
  OnboardingTourStepConfig,
  TourPage,
} from "@/lib/interfaces/tours";

export const ONBOARDING_TOUR_STEPS: OnboardingTourStepConfig[] = [
  {
    id: "welcome",
    page: "scanner",
    target: "body",
    placement: "center",
    titleKey: "steps.welcome.title",
    contentKey: "steps.welcome.content",
  },
  {
    id: "connect-camera",
    page: "scanner",
    target: `${ACTIVE_STATION_SCOPE} [data-tour="camera-status"]`,
    placement: "auto",
    titleKey: "steps.connectCamera.title",
    contentKey: "steps.connectCamera.content",
  },
  {
    id: "connect-device",
    page: "scanner",
    target: `${ACTIVE_STATION_SCOPE} [data-tour="sorter-status"]`,
    placement: "auto",
    titleKey: "connectYourSorterTitle",
    contentKey: "steps.connectDevice.content",
  },
  {
    id: "switch-sorters",
    page: "scanner",
    target: '[data-tour="station-menu"]',
    placement: "bottom-start",
    titleKey: "steps.switchSorters.title",
    contentKey: "steps.switchSorters.content",
  },
  {
    id: "manage-collections",
    page: "scanner",
    target: '[data-tour="collection-switcher"]',
    placement: "bottom-start",
    titleKey: "steps.manageCollections.title",
    contentKey: "steps.manageCollections.content",
  },
  {
    id: "pick-rule-preset",
    page: "scanner",
    target: '[data-tour="create-sorting-rule"]',
    placement: "bottom-start",
    titleKey: "steps.pickRulePreset.title",
    contentKey: "steps.pickRulePreset.content",
  },
  {
    id: "filter-stats",
    page: "scanner",
    target: `${ACTIVE_STATION_SCOPE} [data-tour="scan-stats"]`,
    placement: "auto",
    titleKey: "steps.filterStats.title",
    contentKey: "steps.filterStats.content",
  },
  {
    id: "export-collection",
    page: "scanner",
    target: '[data-tour="export-collection"]',
    placement: "auto",
    titleKey: "steps.exportCollection.title",
    contentKey: "steps.exportCollection.content",
  },
  {
    id: "create-collection",
    page: "collections",
    target: '[data-tour="create-collection"]',
    placement: "auto",
    titleKey: "steps.createCollection.title",
    contentKey: "steps.createCollection.content",
  },
  {
    id: "edit-collection",
    page: "collections",
    target: '[data-tour="edit-collection"]',
    placement: "auto",
    titleKey: "steps.editCollection.title",
    contentKey: "steps.editCollection.content",
  },
  {
    id: "edit-sorting-rules",
    page: "bins",
    target: '[data-tour="edit-sorting-rule"]',
    placement: "auto",
    titleKey: "steps.editSortingRules.title",
    contentKey: "steps.editSortingRules.content",
  },
  {
    id: "done",
    page: "bins",
    target: "body",
    placement: "center",
    titleKey: "steps.done.title",
    contentKey: "steps.done.content",
  },
];

export function resolvePagePath(
  page: TourPage,
  collectionGuid: string | null,
): string | null {
  switch (page) {
    case "scanner":
      return "/app";
    case "collections":
      return "/app/collections";
    case "bins":
      return collectionGuid ? SORTING_RULES_PATH : null;
    default:
      return null;
  }
}
