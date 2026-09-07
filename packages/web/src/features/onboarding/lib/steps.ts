import type { Step } from "react-joyride";

export type TourPage = "scanner" | "collections" | "bins";

export interface TourStepConfig {
  id: string;
  page: TourPage;
  target: string;
  placement?: Step["placement"];
  titleKey: string;
  contentKey: string;
}

export const TOUR_STEP_CONFIGS: TourStepConfig[] = [
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
    target: '[data-tour="scanner-menu"]',
    placement: "auto",
    titleKey: "steps.connectCamera.title",
    contentKey: "steps.connectCamera.content",
  },
  {
    id: "connect-device",
    page: "scanner",
    target: '[data-tour="scanner-menu"]',
    placement: "auto",
    titleKey: "steps.connectDevice.title",
    contentKey: "steps.connectDevice.content",
  },
  {
    id: "filter-stats",
    page: "scanner",
    target: '[data-tour="scan-stats"]',
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
    id: "manage-collections",
    page: "scanner",
    target: '[data-tour="collection-switcher"]',
    placement: "auto",
    titleKey: "steps.manageCollections.title",
    contentKey: "steps.manageCollections.content",
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
    id: "create-sorting-rules",
    page: "bins",
    target: '[data-tour="create-sorting-rule"]',
    placement: "auto",
    titleKey: "steps.createSortingRules.title",
    contentKey: "steps.createSortingRules.content",
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
      return collectionGuid ? `/app/collections/${collectionGuid}/bins` : null;
    default:
      return null;
  }
}
