import {
  BUSINESS_BUYS_TOUR_COMPLETED_KEY,
  BUSINESS_LABELS_TOUR_COMPLETED_KEY,
  BUSINESS_OVERVIEW_TOUR_COMPLETED_KEY,
  BUSINESS_PICKS_TOUR_COMPLETED_KEY,
  BUSINESS_RESERVATIONS_TOUR_COMPLETED_KEY,
  BUSINESS_SALES_TOUR_COMPLETED_KEY,
  SCANNER_BUY_TOUR_COMPLETED_KEY,
} from "@/lib/constants/storage-keys";
import type {
  BusinessTourDefinition,
  TourStepConfig,
} from "@/lib/interfaces/tours";

function businessTourStep(
  tourKey: string,
  id: string,
  target: string,
  placement: TourStepConfig["placement"] = "auto",
): TourStepConfig {
  return {
    id,
    target,
    placement,
    titleKey: `businessTours.${tourKey}.${id}.title`,
    contentKey: `businessTours.${tourKey}.${id}.content`,
  };
}

function businessTourWelcomeStep(tourKey: string): TourStepConfig {
  return businessTourStep(tourKey, "welcome", "body", "center");
}

export const BUSINESS_OVERVIEW_TOUR: BusinessTourDefinition = {
  completedKey: BUSINESS_OVERVIEW_TOUR_COMPLETED_KEY,
  triggerTooltipKey: "businessTours.overview.triggerTooltip",
  steps: [
    businessTourWelcomeStep("overview"),
    businessTourStep("overview", "now", '[data-tour="business-now"]'),
    businessTourStep("overview", "attention", '[data-tour="business-attention"]'),
    businessTourStep("overview", "charts", '[data-tour="business-charts"]'),
    businessTourStep("overview", "sections", '[data-tour="business-sections"]'),
    businessTourStep("overview", "views", '[data-tour="business-overview-views"]'),
    businessTourStep("overview", "nav", '[data-tour="business-nav"]', "right"),
  ],
};

export const BUSINESS_BUYS_TOUR: BusinessTourDefinition = {
  completedKey: BUSINESS_BUYS_TOUR_COMPLETED_KEY,
  triggerTooltipKey: "businessTours.buys.triggerTooltip",
  steps: [
    businessTourStep("buys", "newBuy", '[data-tour="intake-new"]'),
    businessTourStep("buys", "list", '[data-tour="intake-list"]'),
    businessTourStep("buys", "unmoved", '[data-tour="intake-unmoved"]'),
    businessTourStep("buys", "stats", '[data-tour="intake-stats"]'),
    businessTourStep("buys", "cards", '[data-tour="intake-cards"]'),
    businessTourStep("buys", "finish", '[data-tour="intake-finish"]'),
    businessTourStep("buys", "performance", '[data-tour="intake-performance"]'),
  ],
};

export const BUSINESS_PICKS_TOUR: BusinessTourDefinition = {
  completedKey: BUSINESS_PICKS_TOUR_COMPLETED_KEY,
  triggerTooltipKey: "businessTours.picks.triggerTooltip",
  steps: [
    businessTourWelcomeStep("picks"),
    businessTourStep("picks", "import", '[data-tour="picks-import"]'),
    businessTourStep("picks", "list", '[data-tour="picks-list"]'),
    businessTourStep("picks", "views", '[data-tour="pick-views"]'),
    businessTourStep("picks", "phone", '[data-tour="pick-phone"]'),
    businessTourStep("picks", "complete", '[data-tour="pick-complete"]'),
  ],
};

export const BUSINESS_RESERVATIONS_TOUR: BusinessTourDefinition = {
  completedKey: BUSINESS_RESERVATIONS_TOUR_COMPLETED_KEY,
  triggerTooltipKey: "businessTours.reservations.triggerTooltip",
  steps: [
    businessTourWelcomeStep("reservations"),
    businessTourStep("reservations", "lists", '[data-tour="reservations-lists"]'),
    businessTourStep("reservations", "stages", '[data-tour="reservations-requests"]'),
    businessTourStep("reservations", "createPick", '[data-tour="reservations-create-pick"]'),
    businessTourStep("reservations", "actions", '[data-tour="reservations-actions"]'),
  ],
};

export const BUSINESS_LABELS_TOUR: BusinessTourDefinition = {
  completedKey: BUSINESS_LABELS_TOUR_COMPLETED_KEY,
  triggerTooltipKey: "businessTours.labels.triggerTooltip",
  steps: [
    businessTourStep("labels", "source", '[data-tour="labels-source"]'),
    businessTourStep("labels", "prices", '[data-tour="labels-prices"]'),
    businessTourStep("labels", "sheet", '[data-tour="labels-sheet"]'),
    businessTourStep("labels", "cards", '[data-tour="labels-cards"]'),
    businessTourStep("labels", "print", '[data-tour="labels-print"]'),
  ],
};

export const BUSINESS_SALES_TOUR: BusinessTourDefinition = {
  completedKey: BUSINESS_SALES_TOUR_COMPLETED_KEY,
  triggerTooltipKey: "businessTours.sales.triggerTooltip",
  steps: [
    businessTourWelcomeStep("sales"),
    businessTourStep("sales", "filters", '[data-tour="sales-filters"]'),
    businessTourStep("sales", "totals", '[data-tour="sales-totals"]'),
    businessTourStep("sales", "table", '[data-tour="sales-table"]'),
    businessTourStep("sales", "export", '[data-tour="sales-export"]'),
  ],
};

export const SCANNER_BUY_TOUR: BusinessTourDefinition = {
  completedKey: SCANNER_BUY_TOUR_COMPLETED_KEY,
  triggerTooltipKey: "businessTours.scannerBuy.triggerTooltip",
  steps: [
    businessTourStep("scannerBuy", "start", '[data-tour="scanner-buy-start"]'),
    businessTourStep("scannerBuy", "menu", '[data-tour="collection-switcher"]'),
    businessTourStep("scannerBuy", "scan", '[data-tour="scanner-buy-panel"]'),
    businessTourStep("scannerBuy", "totals", '[data-tour="scanner-buy-totals"]'),
    businessTourStep("scannerBuy", "recent", '[data-tour="scanner-buy-recent"]'),
    businessTourStep("scannerBuy", "filter", '[data-tour="card-view-options"]'),
    businessTourStep("scannerBuy", "finish", '[data-tour="scanner-buy-finish"]'),
  ],
};
