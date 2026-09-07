import type { Step } from "react-joyride";

export interface SortingRulesTourStepConfig {
  id: string;
  target: string;
  placement?: Step["placement"];
  titleKey: string;
  contentKey: string;
}

export const SORTING_RULES_TOUR_STEPS: SortingRulesTourStepConfig[] = [
  {
    id: "welcome",
    target: "body",
    placement: "center",
    titleKey: "sortingRulesTour.welcome.title",
    contentKey: "sortingRulesTour.welcome.content",
  },
  {
    id: "sets",
    target: '[data-tour="create-sorting-rule"]',
    placement: "auto",
    titleKey: "sortingRulesTour.sets.title",
    contentKey: "sortingRulesTour.sets.content",
  },
  {
    id: "select-bin",
    target: '[data-tour="bin-list"]',
    placement: "auto",
    titleKey: "sortingRulesTour.selectBin.title",
    contentKey: "sortingRulesTour.selectBin.content",
  },
  {
    id: "catch-all",
    target: '[data-tour="catch-all-toggle"]',
    placement: "auto",
    titleKey: "sortingRulesTour.catchAll.title",
    contentKey: "sortingRulesTour.catchAll.content",
  },
  {
    id: "auto-assign",
    target: '[data-tour="auto-assign-panel"]',
    placement: "auto",
    titleKey: "sortingRulesTour.autoAssign.title",
    contentKey: "sortingRulesTour.autoAssign.content",
  },
  {
    id: "combinator",
    target: '[data-tour="rule-combinator"]',
    placement: "auto",
    titleKey: "sortingRulesTour.combinator.title",
    contentKey: "sortingRulesTour.combinator.content",
  },
  {
    id: "add-condition",
    target: '[data-tour="edit-sorting-rule"]',
    placement: "auto",
    titleKey: "sortingRulesTour.addCondition.title",
    contentKey: "sortingRulesTour.addCondition.content",
  },
  {
    id: "condition-row",
    target: '[data-tour="condition-row"]',
    placement: "auto",
    titleKey: "sortingRulesTour.conditionRow.title",
    contentKey: "sortingRulesTour.conditionRow.content",
  },
  {
    id: "add-group",
    target: '[data-tour="add-rule-group"]',
    placement: "auto",
    titleKey: "sortingRulesTour.addGroup.title",
    contentKey: "sortingRulesTour.addGroup.content",
  },
  {
    id: "save",
    target: '[data-tour="save-bin-config"]',
    placement: "auto",
    titleKey: "sortingRulesTour.save.title",
    contentKey: "sortingRulesTour.save.content",
  },
  {
    id: "done",
    target: "body",
    placement: "center",
    titleKey: "sortingRulesTour.done.title",
    contentKey: "sortingRulesTour.done.content",
  },
];

export const MANUAL_RULES_TOUR_STEP_IDS = new Set([
  "combinator",
  "add-condition",
  "condition-row",
  "add-group",
]);

const COMPLETED_KEY = "magic-vault:sorting-rules-tour-completed";

export function isSortingRulesTourCompleted(): boolean {
  try {
    return localStorage.getItem(COMPLETED_KEY) === "true";
  } catch {
    return true;
  }
}

export function markSortingRulesTourCompleted(): void {
  try {
    localStorage.setItem(COMPLETED_KEY, "true");
  } catch {
    // Storage unavailable (private browsing, disabled cookies) - skip persisting.
  }
}
